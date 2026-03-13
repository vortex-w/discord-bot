const { permission } = require("node:process");
const { getGuildRoles, setRolePermission } = require("../../database/guildRoles");
const {
    createQuizGame,
    createQuizAnswer,
    updateQuizMessageId,
    deleteAllQuizGames,
    getLastQuizGame,
    deleteQuizGameById
} = require("../../game/quiz_game");
const { logError, logInfo } = require("../../database/logger");
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');

module.exports = [
    {
        name: 'modping',
        description: 'Mod ping teszt',
        permissionLevel: 'mod',

        async prefix(message, args) {
            await message.channel.send('mod pong');
        },

        async slash(interaction) {
            await interaction.reply('mod pong');
        }
    },
    {
        name: 'quiz-game',
        description: 'Létrehoz egy szavazást, nyeremény játék formában.',
        permissionLevel: 'mod',

        async prefix(message, args) {
            
            function formatDateTime(date) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const hours = String(date.getHours()).padStart(2, "0");
                const minutes = String(date.getMinutes()).padStart(2, "0");
                const seconds = String(date.getSeconds()).padStart(2, "0");

                return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            }
            function buildAnswerButtons(quizId, answers) {
                const row = new ActionRowBuilder();

                for (let i = 0; i < answers.length; i++) {
                    row.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`quiz_${quizId}_answer_${i}`)
                            .setLabel(answers[i].text)
                            .setStyle(ButtonStyle.Primary)
                    );
                }

                return [row];
            }
            const raw = args.join(" ");

            if (!raw) {
                return message.channel.send("Hiba: nem adtál meg adatokat.");
            }

            let parts = raw.split(";").map(p => p.trim()).filter(p => p.length > 0);

            if (parts.length < 4) {
                return message.channel.send("Hiba: legalább kérdés + 3 válasz kell.");
            }

            const question = parts[0];
            let timePart = parts[1];
            let answerStartIndex = 1;
            let endTime = null;

            const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
            const dateTimeRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]) ([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;

            if (timeRegex.test(timePart) || dateTimeRegex.test(timePart)) {
                answerStartIndex = 2;
            }

            if (answerStartIndex === 2) {

                if (timeRegex.test(timePart)) {
                    const now = new Date();

                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, "0");
                    const day = String(now.getDate()).padStart(2, "0");

                    endTime = new Date(`${year}-${month}-${day}T${timePart}`);

                    if (endTime < now) {
                        endTime.setDate(endTime.getDate() + 1);
                    }

                } else {
                    endTime = new Date(timePart.replace(" ", "T"));
                }

            } else {
                const now = new Date();
                endTime = new Date(now.getTime() + 60 * 60 * 1000);
            }

            if (isNaN(endTime.getTime())) {
                return message.channel.send("Hiba: az idő formátuma hibás.");
            }

            let answers = [];
            let correctCount = 0;

            for (let i = answerStartIndex; i < parts.length; i++) {
                let text = parts[i];
                let isCorrect = false;

                if (text.toLowerCase().endsWith("[true]")) {
                    isCorrect = true;
                    text = text.slice(0, -6).trim();
                    correctCount++;
                }

                answers.push({
                    text: text,
                    isCorrect: isCorrect
                });
            }

            if (answers.length < 3) {
                return message.channel.send("Legalább 3 válasz szükséges.");
            }

            if (correctCount === 0) {
                return message.channel.send("Legalább 1 helyes válasz kell. Használd a [true] jelölést.");
            }

            if (message.attachments.size === 0) {
                return message.channel.send("Csatolj egy képet a quizhez.");
            }

            const attachment = message.attachments.first();

            if (!attachment.contentType || !attachment.contentType.startsWith("image")) {
                return message.channel.send("A csatolmány nem kép.");
            }  
        
            //const imageUrl = attachment.url;

            // SQLite-kompatibilis formátum
            const endTimeSql = formatDateTime(endTime);
            const createdAtSql = formatDateTime(new Date());
                try{
                    const quizId = await createQuizGame({
                        guildId : message.guild.id,
                        channelId: message.channel.id,
                        creatorId: message.author.id,
                        question: question,
                        createdAt: createdAtSql,
                        endsAt: endTimeSql
                    });
                    for (let i = 0; i < answers.length; i++){
                        await createQuizAnswer({
                            quizId: quizId, 
                            answerText: answers[i].text,
                            isCorrect: answers[i].isCorrect,
                            answerIndex: i
                        });
                    }
                    
                    //await message.reply(`Quiz mentve. ID: ${quizId}\nLejárat: ${endTimeSql}`);
                    const embed = new EmbedBuilder()
                            .setTitle('quiz Játék')
                            .setDescription(`**Kérdés:**${question}`)
                            .addFields(
                                {name : 'Lejárat', value: endTimeSql, inline: false},
                                {name : 'indította', value : message.author.username, inline : false}
                            )
                            .setImage(`attachment://${attachment.name}`)
                            .setFooter({text: `quiz ID: ${quizId}`});
                    const components = buildAnswerButtons(quizId,answers);
                    const botQuizMessage = await message.channel.send({
                        embeds: [embed],
                        components: components,
                        files:[
                            {
                                attachment: attachment.url,
                                name : attachment.name
                            }
                        ]
                    });

                    await updateQuizMessageId(quizId, botQuizMessage.id);
                        logInfo(`Bot létre hozta a kvíz játékot id:${quizId}: ${message.author.username}`, 'info');
                        
                }catch(error){
                    logError(error,'Hiba a játék létre hozása közben');
                }

        }
    },
    {
        name : 'quiz-delete',
        description: 'Quiz törlése teszteléshez.',
        permissionLevel : 'mod',
        async prefix(message,args){
            const mode = args[0];
            try{
                if(!mode){
                    return message.channel.send("Használat: !quiz-delete [id|last|all]");
                }
                if(mode === 'all'){
                    await deleteAllQuizGames();
                    logInfo(`A bot törölte az összes kvíz játék elemet. Törlő: ${message.author.username}`,'info');
                    return message.channel.send("Az összes quiz törölve lett.");
                }
                if(mode === 'last'){
                    const lastQuiz = await getLastQuizGame();

                    if(!lastQuiz){
                        return message.channel.send("Nincs törölhető quiz");
                    }
                    await deleteQuizGameById(lastQuiz.id);
                    logInfo(`Bot törölte a legutóbbi kvíz játékot id:${lastQuiz.id} törlő: ${message.author.username}`,'info');
                    return message.channel.send(`A legutóbbi quiz törölve lett . ID: ${lastQuiz.id}`);
                    
                }
                const quizId = parseInt(mode,10);
                if(isNaN(quizId)){
                    return message.channel.send("Hibás quiz Id.");
                }
                await deleteQuizGameById(quizId);
                logInfo(`A bot törölte a ${quizId} elemű kvíz játékot. Törlő: ${message.author.username}`,'info');
                return message.channel.send(`Quiz törölve. ID: ${quizId}`);
               
            }catch(error){
                logError(error,'Hiba a quiz törlése közben.');
            }
        }
    }
];
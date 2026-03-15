const { permission } = require("node:process");
const { getGuildRoles, setRolePermission } = require("../../database/guildRoles");

const {
    createQuizGame,
    createQuizAnswer,
    updateQuizMessageId,
    deleteAllQuizGames,
    getLastQuizGame,
    deleteQuizGameById,
    getAllUserPoints,
    getUserPoints,
    removeQuizPoint
} = require("../../game/quiz_game");
const { logError, logInfo } = require("../../database/logger");
const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');
const { getCommandChannels } = require("../../database/queries/commandChannels");
const { createReward, deleteReward, getRewardById } = require("../../database/queries/rewardsjs");
const { isAdmin } = require("../../utilis/permissions");

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
                return message.channel.send("Csatolj egy képet a kvízhez.");
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
                    const commandChannels = await getCommandChannels(message.guild.id, 'quiz-game');
                    let targetChannel = message.channel;
                    if(commandChannels && commandChannels.length >0){
                        const savedChannelId = commandChannels[0].channel_id;
                        const foundChannel = await message.guild.channels.fetch(savedChannelId).catch(() =>null);

                        if(foundChannel){
                            targetChannel = foundChannel;
                        }
                    }
                    const quizId = await createQuizGame({
                        guildId : message.guild.id,
                        channelId: targetChannel.id,
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
                            .setDescription(`**Kérdés:**\n**${question}**`)
                            .addFields(
                                {name : 'Lejárat', value: endTimeSql.slice(0, 16), inline: false},
                                {name : 'indította', value : message.author.username, inline : false}
                            )
                            .setImage(`attachment://${attachment.name}`)
                            .setFooter({text: `quiz ID: ${quizId}`});
                    const components = buildAnswerButtons(quizId,answers);
                    const botQuizMessage = await targetChannel.send({
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
    },
    {
        name : 'listpoint',
        description: 'ki listázza a játékosok pontjait, vagy egy adott játékosét. Használata: !listpoint [all, @user]',
        permissionLevel: 'mod',

        async prefix(message,args){
            if(!args[0]){
                return message.channel.send("Használat: !listpoint [all | @user]");
            }
            if(args[0] === "all"){
                const rows = await getAllUserPoints(message.guild.id);
                if(!rows || rows.length === 0){
                    return message.channel.send("Használat: !listpoint [all | @user]");
                }
                const text = rows
                    .map((row, index) => `${index+1}.${row.user_name} --> ${row.total} pont`)
                    .join("\n");
                     return message.channel.send(`🏆 Pontlista:\n${text}`);
            }
            const user = message.mentions.users.first();
            if(!user){
                  return message.channel.send("Adj meg egy felhasználót: !listpoint @user");
            }
            const rows = await getUserPoints(user.id);

                if(!rows || rows.length === 0){
                    return message.channel.send(`${user.username}-nek még nincs pontja.`);
                }

                let totalPoints = 0;
                let details = "";

                for(const row of rows){
                    totalPoints += row.total;
                    details += `${row.created_by} → ${row.total} pont\n`;
                }

                return message.channel.send(
                    `${user.username}-nek összesen **${totalPoints}** pontja van.\n\n${details}`
                );
        }
    },
    {
        name : 'removepoint',
        description : 'Visszavon adott pontot adott embertől. Használat: !removepoint; @user; @creator; [mennyiség]',
        permissionLevel : 'mod',

        async prefix(message, args){
            const raw = args.join(" ").trim();

            if(!raw){
                return message.channel.send(
                    'Használat:\n!removepoint; @user; @creator; [mennyiség]'
                );
            }

            const parts = raw.split(";").map(p => p.trim()).filter(p => p.length > 0);

            if(parts.length < 3){
                return message.channel.send(
                    'Használat:\n!removepoint; @user; @creator; [mennyiség]'
                );
            }

            const targetRaw = parts[0];
            const creatorRaw = parts[1];
            const amountRaw = parts[2];

            const mentionToId = (text) => {
                const match = text.match(/^<@!?(\d+)>$/);
                return match ? match[1] : null;
            };

            const targetUserId = mentionToId(targetRaw);
            const creatorUserId = mentionToId(creatorRaw);

            if(!targetUserId || !creatorUserId){
                return message.channel.send(
                    'Hiba: a user és a creator megadása mention formában történjen.\n' +
                    'Példa: !removepoint; @user; @creator; 1'
                );
            }

            let amount = 1;
            if(amountRaw !== undefined){
                amount = parseInt(amountRaw, 10);
            }

            if(isNaN(amount) || amount <= 0){
                return message.channel.send('A mennyiség legalább 1 legyen.');
            }

            const targetUser =
                await message.client.users.fetch(targetUserId).catch(() => null);

            const creatorUser =
                await message.client.users.fetch(creatorUserId).catch(() => null);

            if(!targetUser){
                return message.channel.send('A cél felhasználó nem található.');
            }

            if(!creatorUser){
                return message.channel.send('A creator felhasználó nem található.');
            }

            try{
                await removeQuizPoint(
                    message.guild.id,
                    targetUser.id,
                    creatorUser.id,
                    amount
                );

                await message.channel.send(
                    `**${targetUser.username}** felhasználótól levonva **${amount} pont**, ettől: **${creatorUser.username}**`
                );

                await logInfo(
                    `Pont levonás | cél:${targetUser.username} (${targetUser.id}) | creator:${creatorUser.username} (${creatorUser.id}) | amount:${amount} | mod:${message.author.username}`,
                    "info"
                );
            }catch(error){
                console.error("Hiba a removepoint parancsnál:", error);
                await logError(error, "Hiba a removepoint parancsnál");
                return message.channel.send("Hiba történt a pont levonása közben.");
            }
        }
    },
    {
        name : 'addjutalom',
        description : 'Új jutalom létrehozása. Használat: !addjutalom; jutalom neve; leírás; pont; @creator',
        permissionLevel : 'mod',

        async prefix(message, args){
            const raw = args.join(" ").trim();

            if(!raw){
                return message.channel.send(
                    'Használat:\n!addjutalom; jutalom neve; leírás; pont; @creator'
                );
            }

            const parts = raw.split(";").map(p => p.trim()).filter(p => p.length > 0);

            if(parts.length < 4){
                return message.channel.send(
                    'Használat:\n!addjutalom; jutalom neve; leírás; pont; @creator'
                );
            }

            const rewardName = parts[0];
            const rewardDescription = parts[1];
            const pointCostRaw = parts[2];
            const creatorRaw = parts[3];

            const pointCost = parseInt(pointCostRaw, 10);

            if(!rewardName){
                return message.channel.send("A jutalom neve nem lehet üres.");
            }

            if(isNaN(pointCost) || pointCost < 1){
                return message.channel.send("A pont érték legalább 1 legyen.");
            }

            const mentionToId = (text) => {
                const match = text.match(/^<@!?(\d+)>$/);
                return match ? match[1] : null;
            };

            const creatorId = mentionToId(creatorRaw);

            if(!creatorId){
                return message.channel.send(
                    'A creator megadása mention formában történjen.\n' +
                    'Példa: !addjutalom; VIP rang; 7 napos VIP; 25; @user'
                );
            }

            const creatorUser = await message.client.users.fetch(creatorId).catch(() => null);

            if(!creatorUser){
                return message.channel.send("A megadott creator nem található.");
            }

            try{
                const rewardId = await createReward({
                    guildId: message.guild.id,
                    creatorId: creatorUser.id,
                    rewardName: rewardName,
                    rewardDescription: rewardDescription,
                    pointCost: pointCost
                });

                await message.channel.send(
                    `Új jutalom létrehozva.\n` +
                    `ID: **${rewardId}**\n` +
                    `Név: **${rewardName}**\n` +
                    `Leírás: **${rewardDescription}**\n` +
                    `Pont: **${pointCost}**\n` +
                    `Tulajdonos: **${creatorUser.username}**`
                );

                await logInfo(
                    `Új jutalom létrehozva | id:${rewardId} | név:${rewardName} | pont:${pointCost} | creator:${creatorUser.username} (${creatorUser.id}) | létrehozó:${message.author.username}`,
                    "info"
                );

            }catch(error){
                console.error("Hiba az addjutalom parancsnál:", error);
                await logError(error, "Hiba az addjutalom parancsnál");
                return message.channel.send("Hiba történt a jutalom létrehozása közben.");
            }
        }
    },
    {
        name : 'removejutalom',
        description : 'Jutalom törlése. Használat: !removejutalom; jutalom_id',
        permissionLevel : 'mod',

        async prefix(message, args){
            const raw = args.join(" ").trim();

            if(!raw){
                return message.channel.send(
                    'Használat:\n!removejutalom; jutalom_id'
                );
            }

            const parts = raw.split(";").map(p => p.trim()).filter(p => p.length > 0);

            if(parts.length < 1){
                return message.channel.send(
                    'Használat:\n!removejutalom; jutalom_id'
                );
            }

            const rewardId = parseInt(parts[0], 10);

            if(isNaN(rewardId) || rewardId < 1){
                return message.channel.send("Hibás jutalom ID.");
            }

            try{
                const reward = await getRewardById(message.guild.id, rewardId);

                if(!reward){
                    return message.channel.send(`Nem található jutalom ezzel az ID-val: **${rewardId}**`);
                }

                const admin = await isAdmin(message.member);
                const isRewardOwner = reward.creator_id === message.author.id;

                if(!admin && !isRewardOwner){
                    return message.channel.send(
                        "Ehhez nincs jogosultságod. Más jutalmát csak admin törölheti."
                    );
                }

                const result = await deleteReward(message.guild.id, rewardId);

                if(!result || result.changes === 0){
                    return message.channel.send(`A jutalom törlése nem sikerült. ID: **${rewardId}**`);
                }

                await message.channel.send(
                    `Jutalom törölve.\n` +
                    `ID: **${rewardId}**\n` +
                    `Név: **${reward.reward_name}**\n` +
                    `Pont: **${reward.point_cost}**`
                );

                await logInfo(
                    `Jutalom törölve | rewardId:${rewardId} | rewardName:${reward.reward_name} | creatorId:${reward.creator_id} | törlő:${message.author.username} (${message.author.id}) | admin:${admin ? 'igen' : 'nem'}`,
                    "info"
                );

            }catch(error){
                console.error("Hiba a removejutalom parancsnál:", error);
                await logError(error, "Hiba a removejutalom parancsnál");
                return message.channel.send("Hiba történt a jutalom törlése közben.");
            }
        }
    }
];
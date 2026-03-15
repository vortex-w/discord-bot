const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const { logError, logInfo } = require("../database/logger");
const { getExpiredActiveQuizzes, closeQuizById, getQuizAnswers, getQuizVoteCounts, getCorrectVoters, addQuizPoint } = require("../game/quiz_game");

function buildDisabledButtons(quizId,answers){
    const row = new ActionRowBuilder();

    for (let i = 0; i < answers.length; i++){
        row.addComponents(

            new ButtonBuilder()
            .setCustomId(`quiz_${quizId}_answer_${i}`)
            .setLabel(answers[i].answer_text)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );
    }
    return [row];
}

async function closeExperiedQuizzes(client){
    try{
        /*
            await addQuizPoint(
                    quiz.guild_id,
                    interaction.user.id,
                    userName,
                    quiz.creator_id
                );
        */
        const expiredQuizzes = await getExpiredActiveQuizzes();

        if(!expiredQuizzes || expiredQuizzes.length === 0){
            return;
        }
        for(const quiz of expiredQuizzes){
            //console.log("LEJÁRÓ QUIZ:", quiz);
            try{
                const channel = await client.channels.fetch(quiz.channel_id).catch(()=> null);
                if(!channel){
                    
                    await closeQuizById(quiz.id);
                    continue;
                }
                 const message = await channel.messages.fetch(quiz.message_id).catch(() => null);
                 const answers = await getQuizAnswers(quiz.id);
                 const voteCounts = await getQuizVoteCounts(quiz.id);
                 const correctVoters = await getCorrectVoters(quiz.id);
                    for(const voter of correctVoters){
                        await addQuizPoint(
                            quiz.guild_id,
                            voter.user_id,
                            voter.user_name,
                            quiz.creator_id
                        );
                    }
                 const correctAnswers = voteCounts.filter(a => a.is_correct === 1);
                 const totalVotes = voteCounts.reduce((sum, a) => sum + Number(a.vote_count || 0), 0);

                 const resultsText = voteCounts.length >0
                    ? voteCounts
                        .map(a => `• ${a.answer_text}: ${a.vote_count} szavazat`)
                        .join("\n")
                    : "Nem érkezett szavazat.";
                 
                 
                    const correctAnswersText = correctAnswers.length > 0
                    ? correctAnswers.map(a => `• ${a.answer_text}`).join("\n")
                    : "Nincs megadva helyes válasz.";  
                   
                   
                    const correctVotersText = correctVoters.length > 0
                    ? correctVoters.map(v => `• ${v.user_name}`).join("\n")
                    : "Senki sem szavazott helyesen.";
                 const resultEmbed = new EmbedBuilder()
                    .setTitle("🏁 Kvíz lezárva")
                    .setDescription(`**Kérdés:** ${quiz.question}`)
                    .addFields(
                        { name: "✅ Helyes válasz(ok)", value: correctAnswersText, inline: false },
                        { name: "📊 Eredmények", value: resultsText, inline: false },
                        { name: "👑 Helyesen szavaztak", value: correctVotersText, inline: false },
                        { name: "🧮 Összes szavazat", value: String(totalVotes), inline: false }
                    )
                    .setFooter({ text: `quiz ID: ${quiz.id}` });

                    if (message) {
                        const disabledComponents = buildDisabledButtons(quiz.id, answers);

                        await message.edit({
                            components: disabledComponents
                        });
                    }
                    await channel.send({
                        embeds: [resultEmbed]
                    });
                    await closeQuizById(quiz.id);
                    await logInfo(`Kvíz lezárva | quizId: ${quiz.id}`, 'info');
                }catch(quizError){
                    console.error(`Hiba a(z) ${quiz.id} quiz lezárásánál:`, quizError);
                    await logError(quizError, `Hiba a(z) ${quiz.id} quiz lezárásánál`);
                }
        }
    }catch(error){
        console.error("Hiba a lejárt kvízek ellenőrzésekor:", error);
        await logError(error, "Hiba a lejárt kvízek ellenőrzésekor");
    }
}
module.exports = {
    closeExperiedQuizzes
}
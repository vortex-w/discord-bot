const { logInfo, logError } = require("../database/logger");
const { getQuizById, hasUserVoted, getQuizAnswerByIndex, createQuizVote, addQuizPoint } = require("../game/quiz_game");
function formatDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function handleQuizButton(interaction) {
    try {
        if (!interaction.isButton()) return false;
        if (!interaction.customId.startsWith("quiz_")) return false;

        const parts = interaction.customId.split("_");
        const quizId = parts[1];
        const answerIndex = parts[3];

        await logInfo(
            `User:${interaction.user.username} (${interaction.user.id}) quiz:${quizId} válasz:${answerIndex}`,
            "info"
        );
        const quiz = await getQuizById(quizId);
        if(!quiz){
            await interaction.reply({
                content: "Ez a kvíz nem található.",
                ephemeral: true
            });
            logError('Hiba a kvíz felismerése közben. events/quizButtonhandler','error');
            return true;
        }
        if(quiz.status !== "active"){
            await interaction.reply({
                content : "ez a kvíz már le let zárva.",
                ephemeral : true
            });
            return true;
        }
        const now = new Date();
        const endTime = new Date(quiz.ends_at.replace(" ", "T"));
        //console.log(endTime);
        if(isNaN(endTime.getTime())){
            await interaction.reply({
                content : "A kvíz lejárati ideje hibás.",
                ephemeral: true
            });
            return true;
        }
        if(now > endTime){
            await interaction.reply({
                content : "Ez a kvíz már lejárt.",
                ephemeral: true
            });
            return true;
        }

        const votedAlready = await hasUserVoted(quizId,interaction.user.id);
        if(votedAlready){
            await interaction.reply({
                content: "Te már szavaztál erre a játékra!",
                ephemeral: true
            });
            return true;
        }
        const answer = await getQuizAnswerByIndex(quizId, answerIndex);
        if(!answer){
            await interaction.reply({
                content: "A kiválasztott válasz nem található.",
                ephemeral: true
            });
            return true;
        }

        const userName = 
            interaction.member?.displayName ||
            interaction.user?.globalName ||
            interaction.user?.username ||
            "Ismeretlen";

            await createQuizVote({
                quizId: quizId,
                userId: interaction.user.id,
                userName : userName,
                answerId: answer.id,
                isCorrect: answer.is_correct === 1,
                votedAt: formatDateTime(new Date())
            });

            if(answer.is_correct === 1){
                
                /*await createQuizVote({
                    quizId: quizId,
                    userId: interaction.user.id,
                    userName : userName,
                    answerId: answer.id,
                    isCorrect: answer.is_correct === 1,
                    votedAt: formatDateTime(new Date())
                });

                /*await addQuizPoint(
                    quiz.guild_id,
                    interaction.user.id,
                    userName,
                    quiz.creator_id
                );*/
                await interaction.reply({
                    content: "szavazat rögzítve.",
                    ephemeral: true
                });

                await logInfo(
                    `Helyes szavazat | User:${userName} (${interaction.user.id}) | quiz:${quizId} | answer:${answerIndex}`,
                "info"
                );
                return true;
            }

            await interaction.reply({
                content : "szavazat rögzítve!",
                ephemeral: true
            });
            await logInfo(`Szavazat | User:${userName} (${interaction.user.id}) | quiz:${quizId} | answer:${answerIndex}`,
                "info");


        return true;
    } catch (error) {
        console.error("Hiba a quiz gombkezelőben:", error);
        await logError(error, "Hiba a quiz gombkezelőben");

        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: "Hiba történt a gomb feldolgozása közben.",
                ephemeral: true
            });
        }

        return true;
    }
}

module.exports = {
    handleQuizButton
};
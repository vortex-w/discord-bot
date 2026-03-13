const { logInfo, logError } = require("../database/logger");

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

        await interaction.reply({
            content: `A gomb működik: ${interaction.customId}`,
            ephemeral: true
        });

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
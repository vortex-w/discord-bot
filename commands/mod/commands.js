module.exports = [
    {
        name: 'modping',
        description: 'Mod ping teszt',
        permissionLevel: 'mod',

        async prefix(message, args) {
            await message.reply('mod pong');
        },

        async slash(interaction) {
            await interaction.reply('mod pong');
        }
    }
];
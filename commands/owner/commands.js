
module.exports = [
    {
        name: 'ownerping',
        description: 'Owner ping teszt',
        permissionLevel: 'owner',

        async prefix(message, args) {
            await message.reply('owner pong');
        },

        async slash(interaction) {
            await interaction.reply('owner pong');
        }
    }
];
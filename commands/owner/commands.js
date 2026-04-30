const { getCommandTargetChannel } = require('../../utilis/commandTargetChannel');

module.exports = [
    {
        name: 'ownerping',
        description: 'Owner ping teszt',
        permissionLevel: 'owner',

        async prefix(message, args) {
            const targetChannel = await getCommandTargetChannel(message, 'ownerping');
            await targetChannel.send('owner pong');
        },

        async slash(interaction) {
            await interaction.reply('owner pong');
        }
    }
];
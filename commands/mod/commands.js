const { permission } = require("node:process");

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
    },
    {
        name : 'quiz-game',
        description: 'Létrehoz egy szavazást, nyeremény játék formában.',
        permissionLevel: 'mod',

        async prefix(message,args){
            
            await message.reply('Ezt írtad:'+ args[0]);
        }
    }
];
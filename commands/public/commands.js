
const {isOwner, isAdmin, isMod} = require('../../utilis/permissions');


function getUserLevel(member) {
    if (isOwner(member.guild, member.id)) return 'OWNER';
    if (isAdmin(member)) return 'ADMIN';
    if (isMod(member)) return 'MOD';
    return 'PUBLIC';
}

module.exports = [
    {
        name : 'ping',
        description: 'Ping teszt',
        permissionLevel: 'public',

        async prefix(message, args){
            await message.reply('pong');
        },
        async slash(interaction){
            await interaction.reply('pong');
        }
    },
    {
        name: 'whoami',
        description: 'Megmondja milyen jogosultságod van',
        permissionLevel: 'public',

        async prefix(message, args) {
            const level = getUserLevel(message.member);
            await message.reply(`A jogosultsági szinted: **${level}**`);
        },

        async slash(interaction) {
            const level = getUserLevel(interaction.member);
            await interaction.reply(`A jogosultsági szinted: **${level}**`);
        }
    }
];
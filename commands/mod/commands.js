const { permission } = require("node:process");
const { getGuildRoles } = require("../../database/guildRoles");

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
    },
    {
        name : 'ranglekerdezes',
        description: 'Lekérdezi a szerveren lévő rangokat',
        permissionLevel: 'mod',

        async prefix(message,args){
            if(args[0] && args[0]==="help"){
                message.reply(this.description);
            }else{
                const roles = await getGuildRoles(message.guild.id);
                if(!roles.length){
                    return message.reply("Nincs adat az adatbázisban.");
                }
                let text = "Szerver rangok az adatbázisból:\n\n";
                for(const role of roles){
                    text += `${role.role_name} | ${role.role_id} | pos:${role.role_position}\n`;
                }
                message.reply("```"+text+"```");
            }
        }
    }
];
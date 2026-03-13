
const { group } = require('node:console');
const {isOwner, isAdmin, isMod, canUseLevel} = require('../../utilis/permissions');
const { describe } = require('node:test');
const { getUserById} = require('../../database/queries/users');
const { getGuildById} = require('../../database/queries/guilds');


function getUserLevel(member) {
    if(!member || !member.guild) return 'PUBLIC';
    if (isOwner(member.guild, member.id)) return 'OWNER';
    if (isAdmin(member)) return 'ADMIN';
    if (isMod(member)) return 'MOD';
    return 'PUBLIC';
}

function buildCommandsMessage(member, allCommands){
    const level = getUserLevel(member);
    const groupedCommands = {
        public: [],
        mod: [],
        admin: [],
        owner: []
    };
    for (const command of allCommands.values()){
        if(!canUseLevel(member, command.permissionLevel)) continue;
        const category = (command.permissionLevel || 'public').toLowerCase();
        if(!groupedCommands[category]){
            groupedCommands[category] = [];
        }
        groupedCommands[category].push(`!${command.name} - ${command.description}`);
    }
    let text = `A jogosultsági szinted: *${level}** \n\n`;
    text += `Használható parancsok:\n`;
    
     if (groupedCommands.public.length) {
        text += `\n**PUBLIC**\n${groupedCommands.public.join('\n')}\n`;
    }

    if (groupedCommands.mod.length) {
        text += `\n**MOD**\n${groupedCommands.mod.join('\n')}\n`;
    }

    if (groupedCommands.admin.length) {
        text += `\n**ADMIN**\n${groupedCommands.admin.join('\n')}\n`;
    }

    if (groupedCommands.owner.length) {
        text += `\n**OWNER**\n${groupedCommands.owner.join('\n')}\n`;
    }
    return text.trim();
}

module.exports = [
    {
        name : 'ping',
        description: 'Ping teszt',
        permissionLevel: 'public',

        async prefix(message, args){
            await message.channel.send('pong');
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
            await message.channel.send(`A jogosultsági szinted: **${level}**`);
        },

        async slash(interaction) {
            const level = getUserLevel(interaction.member);
            await interaction.reply(`A jogosultsági szinted: **${level}**`);
        }
    },
    {
        name:'parancsok',
        description: 'Ki listázza a használható parancsokat',
        permissionLevel : 'public',

        async prefix(message,args,client){
            const text = buildCommandsMessage(message.member, client.commands);
            await message.channel.send(text);
        },
        async slash(interaction, client){
            const text = buildCommandsMessage(interaction.member, client.commands);
            await interaction.reply(text);
        }
    },
    {
        name :'mydb',
        description: 'megmutatja az adatbázisban tárolt adataidat',
        permissionLevel: 'public',

        async prefix(message,args){
            try{
                const user = await getUserById(message.author.id);
                const guild = await getGuildById(message.guild.id);

                if(!user){
                    await message.channel.send(`Nem találtam a user adatait az adatbázisban.${user}`);
                    return;
                }

                await message.channel.send(
                    `Felhasználó:\n`+
                    `ID: ${user.user_id}\n`+
                    `Név: ${user.username}\n` + 
                    `Globális név: ${user.global_name || 'nincs'} \n\n`+
                    `Szerver: \n` +
                    `ID: ${guild?.guild_id || 'nincs'} \n`+
                    `Név: ${guild?.guild_name || 'nincs'}\n`+
                    `Tulaj ID: ${guild?.owner_id || 'nincs'}\n`
                );
            }catch (error){
                console.error('mydb hiba:', error);
                await message.reply('Hiba Történt az adatbázis lekérdezéáse közben!');
            }
        },
        async slash(interaction) {
                                try {
                                    const user = await getUserById(interaction.user.id);
                                    const guild = await getGuildById(interaction.guild.id);

                                    let text = '';

                                    if (!user) {
                                        text = 'Nincs meg a user';
                                    } else {
                                        text =
                                            `Felhasználó:\n` +
                                            `ID: ${user.user_id}\n` +
                                            `Név: ${user.username}\n` +
                                            `Globális név: ${user.global_name || 'nincs'}\n\n` +
                                            `Szerver:\n` +
                                            `ID: ${guild?.guild_id || 'nincs'}\n` +
                                            `Név: ${guild?.guild_name || 'nincs'}\n` +
                                            `Tulaj ID: ${guild?.owner_id || 'nincs'}\n`;
                                    }

                                    await interaction.reply({
                                        content: text,
                                        ephemeral: true
                                    });
                                } catch (error) {
                                    console.error('mydb slash hiba:', error);

                                    await interaction.reply({
                                        content: 'Hiba történt az adatbázis lekérdezése közben.',
                                        ephemeral: true
                                    });
                                }
                            }
    }
];
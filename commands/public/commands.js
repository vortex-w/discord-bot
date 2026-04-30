const { isOwner, isAdmin, isMod, canUseLevel } = require('../../utilis/permissions');
const { getUserById } = require('../../database/queries/users');
const { getGuildById } = require('../../database/queries/guilds');
const { getUserPoints } = require('../../game/quiz_game');
const { getCommandTargetChannel } = require('../../utilis/commandTargetChannel');
const { getActiveRewards } = require('../../database/queries/rewardsjs');
const { getCreatorRewards } = require('../../database/queries/rewardsjs');
const { getOrCreateBotVersion } = require('../../database/queries/botVersion');
const { getGithubVersion } = require('../../utilis/versionchecker');
const { compareVersions } = require('../../utilis/versionCompare');
const verzioCooldown = new Map();

async function getUserLevel(member) {
    if (!member || !member.guild) return 'PUBLIC';
    if (isOwner(member.guild, member.user.id)) return 'OWNER';
    if (await isAdmin(member)) return 'ADMIN';
    if (await isMod(member)) return 'MOD';
    return 'PUBLIC';
}

async function buildCommandsMessage(member, allCommands) {
    const level = await getUserLevel(member);

    const groupedCommands = {
        public: [],
        mod: [],
        admin: [],
        owner: []
    };

    for (const command of allCommands.values()) {
        if (!(await canUseLevel(member, command.permissionLevel))) continue;

        const category = (command.permissionLevel || 'public').toLowerCase();

        if (!groupedCommands[category]) {
            groupedCommands[category] = [];
        }

        groupedCommands[category].push(`!${command.name} - ${command.description}`);
    }

    let text = `A jogosultsági szinted: **${level}**\n\n`;
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
        name: 'ping',
        description: 'Ping teszt',
        permissionLevel: 'public',

        async prefix(message, args) {
            const targetChannel = await getCommandTargetChannel(message, 'ping');
            await targetChannel.send('pong');
        },

        async slash(interaction) {
            await interaction.reply('pong');
        }
    },
    {
        name: 'whoami',
        description: 'Megmondja milyen jogosultságod van',
        permissionLevel: 'public',

        async prefix(message, args) {
            const targetChannel = await getCommandTargetChannel(message, 'whoami');
            const level = await getUserLevel(message.member);
            await targetChannel.send(`A jogosultsági szinted: **${level}**`);
        },

        async slash(interaction) {
            const level = await getUserLevel(interaction.member);
            await interaction.reply(`A jogosultsági szinted: **${level}**`);
        }
    },
    {
        name: 'parancsok',
        description: 'Ki listázza a használható parancsokat',
        permissionLevel: 'public',

        async prefix(message, args, client) {
            const targetChannel = await getCommandTargetChannel(message, 'parancsok');
            const text = await buildCommandsMessage(message.member, client.commands);
            await targetChannel.send(text);
        },

        async slash(interaction, client) {
            const text = await buildCommandsMessage(interaction.member, client.commands);
            await interaction.reply(text);
        }
    },
    {
        name: 'mydb',
        description: 'Megmutatja az adatbázisban tárolt adataidat',
        permissionLevel: 'public',

        async prefix(message, args) {
            const targetChannel = await getCommandTargetChannel(message, 'mydb');

            try {
                const user = await getUserById(message.author.id);
                const guild = await getGuildById(message.guild.id);

                if (!user) {
                    await targetChannel.send(`Nem találtam a user adatait az adatbázisban.`);
                    return;
                }

                await targetChannel.send(
                    `Felhasználó:\n` +
                    `ID: ${user.user_id}\n` +
                    `Név: ${user.username}\n` +
                    `Globális név: ${user.global_name || 'nincs'}\n\n` +
                    `Szerver:\n` +
                    `ID: ${guild?.guild_id || 'nincs'}\n` +
                    `Név: ${guild?.guild_name || 'nincs'}\n` +
                    `Tulaj ID: ${guild?.owner_id || 'nincs'}\n`
                );
            } catch (error) {
                console.error('mydb hiba:', error);
                await targetChannel.send('Hiba történt az adatbázis lekérdezése közben.');
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
    },
    {
        name: 'mypoints',
        description: 'Megmutatja hány pontod van.',
        permissionLevel: 'public',

        async prefix(message) {
            const targetChannel = await getCommandTargetChannel(message, 'mypoints');
            const userId = message.author.id;

            const rows = await getUserPoints(userId);

            if (!rows || rows.length === 0) {
                return targetChannel.send(`${message.author.username}-nek még nincs pontja.`);
            }

            let totalPoints = 0;
            let details = "";

            for (const row of rows) {
                totalPoints += row.total;
                details += `${row.created_by} → ${row.total} pont\n`;
            }

            await targetChannel.send(
                `${message.author.username}-nek összesen **${totalPoints}** pontja van.\n\n${details}`
            );
        }
    },
    {
        name: 'jutalmak',
        description: 'Kilistázza milyen elérhető jutalmak vannak. Használat: !jutalmak vagy !jutalmak @creator',
        permissionLevel : 'public',

        async prefix(message, args){
            const targetChannel = await getCommandTargetChannel(message, 'jutalmak');

            let creatorId = null;

            if(message.mentions.users.size > 0){
                creatorId = message.mentions.users.first().id;
            }

            const rewards = creatorId
                ? await getCreatorRewards(message.guild.id, creatorId)
                : await getActiveRewards(message.guild.id);

            if(!rewards || rewards.length === 0){
                return targetChannel.send("Nincsenek elérhető jutalmak.");
            }

            const lines = rewards.map(r => {
                const creatorName = r.global_name || r.username || r.creator_id;
                const desc = r.reward_description ? ` | ${r.reward_description}` : "";

                return `#${r.id} | ${r.reward_name} | ${r.point_cost} pont | létrehozó: ${creatorName}${desc}`;
            });

            let text = "Elérhető jutalmak:\n";

            for(const line of lines){
                if((text + line + "\n").length > 1900){
                    await targetChannel.send(text);
                    text = "";
                }

                text += line + "\n";
            }

            if(text.length > 0){
                await targetChannel.send(text);
            }
        }
    },
    {
        name: 'verzio',
        description: 'Kiírja a bot jelenlegi és GitHubon elérhető verzióját.',
        permissionLevel: 'public',

        async prefix(message){
            const userId = message.author.id;

            // ⏱ cooldown ellenőrzés
            if(verzioCooldown.has(userId)){
                const last = verzioCooldown.get(userId);
                const now = Date.now();

                if(now - last < 5000){
                    return message.reply("⏳ Várj egy kicsit mielőtt újra használod ezt a parancsot.");
                }
            }

            // idő frissítés
            verzioCooldown.set(userId, Date.now());

            const dbVersion = await getOrCreateBotVersion(message.guild.id);
            const github = await getGithubVersion();

            const result = compareVersions(
                dbVersion.current_version,
                github.version
            );

            let statusText = "";

            if(result.type === 'same'){
                statusText = "✅ A bot naprakész.";
            }else if(result.type === 'patch'){
                statusText = "ℹ️ Kisebb javítás elérhető, de nem szükséges frissíteni.";
            }else if(result.type === 'minor'){
                statusText = "ℹ️ Nagyobb hibajavítás elérhető, de még nem kötelező frissíteni.";
            }else if(result.type === 'recommended'){
                statusText = "⚠️ Ajánlott frissítés elérhető.";
            }else if(result.type === 'major'){
                statusText = "🚨 Nagy frissítés elérhető.";
            }else{
                statusText = "❓ Ismeretlen verzióállapot.";
            }

            await message.reply(
                `📦 Bot verzió állapot\n\n` +
                `Saját verzió: ${dbVersion.current_version}\n` +
                `GitHub verzió: ${github.version}\n` +
                `Állapot: ${statusText}\n\n` +
                `GitHub üzenet: ${github.message || "Nincs megadva."}`
            );
        }
    }
];
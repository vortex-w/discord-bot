const {
    isOwner,
    isAdmin,
    isMod,
    canUseLevel
} = require('../../utilis/permissions');

const {
    PermissionFlagsBits
} = require('discord.js');

const {
    getUserById
} = require('../../database/queries/users');

const {
    getGuildById
} = require('../../database/queries/guilds');

const {
    getUserPoints
} = require('../../game/quiz_game');

const {
    getCommandTargetChannel
} = require('../../utilis/commandTargetChannel');

const {
    getActiveRewards,
    getCreatorRewards
} = require('../../database/queries/rewardsjs');

const {
    getOrCreateBotVersion
} = require('../../database/queries/botVersion');

const {
    getGithubVersion
} = require('../../utilis/versionchecker');

const {
    compareVersions
} = require('../../utilis/versionCompare');

const {
    getFaqSettings,
    searchFaqEntries
} = require('../../database/queries/faq');

const verzioCooldown = new Map();

async function sendLongMessage(channel, text) {
    const maxLength = 1900;

    if (!text || text.length === 0) {
        return;
    }

    const lines = text.split('\n');
    let chunk = '';

    for (const line of lines) {
        if (
            (chunk + line + '\n').length >
            maxLength
        ) {
            if (chunk.length > 0) {
                await channel.send(chunk);
                chunk = '';
            }

            if (line.length > maxLength) {
                for (
                    let index = 0;
                    index < line.length;
                    index += maxLength
                ) {
                    await channel.send(
                        line.slice(
                            index,
                            index + maxLength
                        )
                    );
                }
            } else {
                chunk = line + '\n';
            }
        } else {
            chunk += line + '\n';
        }
    }

    if (chunk.length > 0) {
        await channel.send(chunk);
    }
}

async function replyLongInteraction(
    interaction,
    text
) {
    const maxLength = 1900;

    if (text.length <= maxLength) {
        return interaction.reply({
            content: text,
            ephemeral: true
        });
    }

    await interaction.reply({
        content:
            'A válasz túl hosszú, több részletben küldöm.',
        ephemeral: true
    });

    const lines = text.split('\n');
    let chunk = '';

    for (const line of lines) {
        if (
            (chunk + line + '\n').length >
            maxLength
        ) {
            if (chunk.length > 0) {
                await interaction.followUp({
                    content: chunk,
                    ephemeral: true
                });

                chunk = '';
            }

            if (line.length > maxLength) {
                for (
                    let index = 0;
                    index < line.length;
                    index += maxLength
                ) {
                    await interaction.followUp({
                        content: line.slice(
                            index,
                            index + maxLength
                        ),
                        ephemeral: true
                    });
                }
            } else {
                chunk = line + '\n';
            }
        } else {
            chunk += line + '\n';
        }
    }

    if (chunk.length > 0) {
        await interaction.followUp({
            content: chunk,
            ephemeral: true
        });
    }
}

async function getUserLevel(member) {
    if (!member || !member.guild) {
        return 'PUBLIC';
    }

    if (
        isOwner(
            member.guild,
            member.user.id
        )
    ) {
        return 'OWNER';
    }

    if (await isAdmin(member)) {
        return 'ADMIN';
    }

    if (await isMod(member)) {
        return 'MOD';
    }

    return 'PUBLIC';
}

async function buildCommandsMessage(
    member,
    allCommands
) {
    const level = await getUserLevel(member);

    const groupedCommands = {
        public: [],
        mod: [],
        admin: [],
        owner: []
    };

    for (
        const command of allCommands.values()
    ) {
        const permissionLevel =
            command.permissionLevel ||
            'public';

        if (
            !(await canUseLevel(
                member,
                permissionLevel
            ))
        ) {
            continue;
        }

        const category =
            permissionLevel.toLowerCase();

        if (!groupedCommands[category]) {
            groupedCommands[category] = [];
        }

        groupedCommands[category].push(
            `!${command.name} - ` +
            `${command.description || 'Nincs leírás'}`
        );
    }

    let text =
        `A jogosultsági szinted: ` +
        `**${level}**\n\n`;

    text += 'Használható parancsok:\n';

    if (groupedCommands.public.length) {
        text +=
            '\n**PUBLIC**\n' +
            groupedCommands.public.join('\n') +
            '\n';
    }

    if (groupedCommands.mod.length) {
        text +=
            '\n**MOD**\n' +
            groupedCommands.mod.join('\n') +
            '\n';
    }

    if (groupedCommands.admin.length) {
        text +=
            '\n**ADMIN**\n' +
            groupedCommands.admin.join('\n') +
            '\n';
    }

    if (groupedCommands.owner.length) {
        text +=
            '\n**OWNER**\n' +
            groupedCommands.owner.join('\n') +
            '\n';
    }

    return text.trim();
}

async function runFaqSearch(
    guild,
    member,
    searchText
) {
    const query =
        String(searchText || '').trim();

    if (!query) {
        return {
            error:
                'Adj meg egy keresett szót vagy ' +
                'kifejezést.\n' +
                'Példa: `!gyik teleltetés`'
        };
    }

    const settings =
        await getFaqSettings(guild.id);

    if (!settings) {
        return {
            error:
                'Ezen a szerveren még nincs ' +
                'beállítva GYIK-csatorna.'
        };
    }

    const faqChannel =
        guild.channels.cache.get(
            settings.channel_id
        ) ||
        await guild.channels
            .fetch(settings.channel_id)
            .catch(() => null);

    if (!faqChannel) {
        return {
            error:
                'A beállított GYIK-csatorna ' +
                'nem található.'
        };
    }

    const permissions =
        faqChannel.permissionsFor(member);

    if (
        !permissions ||
        !permissions.has(
            PermissionFlagsBits.ViewChannel
        )
    ) {
        return {
            error:
                'Nincs jogosultságod a ' +
                'GYIK-csatorna megtekintéséhez.'
        };
    }

    const results =
        await searchFaqEntries(
            guild.id,
            query,
            10
        );

    if (
        !results ||
        results.length === 0
    ) {
        return {
            error:
                `Nem találtam eredményt erre: ` +
                `**${query}**`
        };
    }

    let text =
        `Találatok erre: **${query}**\n\n`;

    for (
        let index = 0;
        index < results.length;
        index++
    ) {
        const entry = results[index];

        const title =
            entry.title ||
            'Cím nélküli bejegyzés';

        const normalizedContent =
            String(entry.content || '')
                .replace(/\s+/g, ' ')
                .trim();

        const snippet =
            normalizedContent.length > 180
                ? normalizedContent.slice(
                    0,
                    177
                ) + '...'
                : normalizedContent;

        text +=
            `**${index + 1}. ${title}**\n`;

        if (snippet) {
            text += `${snippet}\n`;
        }

        text +=
            `[Eredeti üzenet megnyitása]` +
            `(${entry.message_url})\n\n`;
    }

    return {
        text: text.trim()
    };
}

module.exports = [
    {
        name: 'ping',
        description: 'Ping teszt',
        permissionLevel: 'public',

        async prefix(message) {
            const targetChannel =
                await getCommandTargetChannel(
                    message,
                    'ping'
                );

            await targetChannel.send('pong');
        },

        async slash(interaction) {
            await interaction.reply('pong');
        }
    },

    {
        name: 'whoami',
        description:
            'Megmondja milyen jogosultságod van',
        permissionLevel: 'public',

        async prefix(message) {
            const targetChannel =
                await getCommandTargetChannel(
                    message,
                    'whoami'
                );

            const level =
                await getUserLevel(
                    message.member
                );

            await targetChannel.send(
                `A jogosultsági szinted: ` +
                `**${level}**`
            );
        },

        async slash(interaction) {
            const level =
                await getUserLevel(
                    interaction.member
                );

            await interaction.reply({
                content:
                    `A jogosultsági szinted: ` +
                    `**${level}**`,
                ephemeral: true
            });
        }
    },

    {
        name: 'parancsok',
        description:
            'Kilistázza a használható parancsokat',
        permissionLevel: 'public',

        async prefix(
            message,
            args,
            client
        ) {
            const targetChannel =
                await getCommandTargetChannel(
                    message,
                    'parancsok'
                );

            const text =
                await buildCommandsMessage(
                    message.member,
                    client.commands
                );

            await sendLongMessage(
                targetChannel,
                text
            );
        },

        async slash(
            interaction,
            client
        ) {
            const text =
                await buildCommandsMessage(
                    interaction.member,
                    client.commands
                );

            await replyLongInteraction(
                interaction,
                text
            );
        }
    },

    {
        name: 'mydb',
        description:
            'Megmutatja az adatbázisban tárolt adataidat',
        permissionLevel: 'public',

        async prefix(message) {
            const targetChannel =
                await getCommandTargetChannel(
                    message,
                    'mydb'
                );

            try {
                const user =
                    await getUserById(
                        message.author.id
                    );

                const guild =
                    await getGuildById(
                        message.guild.id
                    );

                if (!user) {
                    await targetChannel.send(
                        'Nem találtam a user adatait ' +
                        'az adatbázisban.'
                    );

                    return;
                }

                const text =
                    'Felhasználó:\n' +
                    `ID: ${user.user_id}\n` +
                    `Név: ${user.username}\n` +
                    `Globális név: ` +
                    `${user.global_name || 'nincs'}\n\n` +
                    'Szerver:\n' +
                    `ID: ${guild?.guild_id || 'nincs'}\n` +
                    `Név: ${guild?.guild_name || 'nincs'}\n` +
                    `Tulaj ID: ` +
                    `${guild?.owner_id || 'nincs'}\n`;

                await sendLongMessage(
                    targetChannel,
                    text
                );

            } catch (error) {
                console.error(
                    'mydb hiba:',
                    error
                );

                await targetChannel.send(
                    'Hiba történt az adatbázis ' +
                    'lekérdezése közben.'
                );
            }
        },

        async slash(interaction) {
            try {
                const user =
                    await getUserById(
                        interaction.user.id
                    );

                const guild =
                    await getGuildById(
                        interaction.guild.id
                    );

                let text = '';

                if (!user) {
                    text = 'Nincs meg a user.';
                } else {
                    text =
                        'Felhasználó:\n' +
                        `ID: ${user.user_id}\n` +
                        `Név: ${user.username}\n` +
                        `Globális név: ` +
                        `${user.global_name || 'nincs'}\n\n` +
                        'Szerver:\n' +
                        `ID: ` +
                        `${guild?.guild_id || 'nincs'}\n` +
                        `Név: ` +
                        `${guild?.guild_name || 'nincs'}\n` +
                        `Tulaj ID: ` +
                        `${guild?.owner_id || 'nincs'}\n`;
                }

                await replyLongInteraction(
                    interaction,
                    text
                );

            } catch (error) {
                console.error(
                    'mydb slash hiba:',
                    error
                );

                await interaction.reply({
                    content:
                        'Hiba történt az adatbázis ' +
                        'lekérdezése közben.',
                    ephemeral: true
                });
            }
        }
    },

    {
        name: 'mypoints',
        description:
            'Megmutatja hány pontod van.',
        permissionLevel: 'public',

        async prefix(message) {
            const targetChannel =
                await getCommandTargetChannel(
                    message,
                    'mypoints'
                );

            const userId =
                message.author.id;

            const rows =
                await getUserPoints(
                    message.guild.id,
                    userId
                );

            if (
                !rows ||
                rows.length === 0
            ) {
                return targetChannel.send(
                    `${message.author.username}-nek ` +
                    'még nincs pontja.'
                );
            }

            let totalPoints = 0;
            let details = '';

            for (const row of rows) {
                totalPoints += row.total;

                details +=
                    `${row.created_by} → ` +
                    `${row.total} pont\n`;
            }

            const text =
                `${message.author.username}-nek ` +
                `összesen **${totalPoints}** ` +
                'pontja van.\n\n' +
                details;

            await sendLongMessage(
                targetChannel,
                text
            );
        }
    },

    {
        name: 'gyik',
        description:
            'Keresés a szerver beállított GYIK-csatornájában.',
        permissionLevel: 'public',

        slashOptions: [
            {
                name: 'kereses',
                description:
                    'A keresett szó vagy kifejezés',
                required: true,
                type: 'string'
            }
        ],

        async prefix(message, args) {
            const targetChannel =
                await getCommandTargetChannel(
                    message,
                    'gyik'
                );

            try {
                const result =
                    await runFaqSearch(
                        message.guild,
                        message.member,
                        args.join(' ')
                    );

                if (result.error) {
                    return targetChannel.send(
                        result.error
                    );
                }

                await sendLongMessage(
                    targetChannel,
                    result.text
                );

            } catch (error) {
                console.error(
                    'Hiba a gyik keresésnél:',
                    error
                );

                await targetChannel.send(
                    'Hiba történt a GYIK ' +
                    'keresése közben.'
                );
            }
        },

        async slash(interaction) {
            try {
                const searchText =
                    interaction.options.getString(
                        'kereses'
                    );

                const result =
                    await runFaqSearch(
                        interaction.guild,
                        interaction.member,
                        searchText
                    );

                if (result.error) {
                    return interaction.reply({
                        content: result.error,
                        ephemeral: true
                    });
                }

                await replyLongInteraction(
                    interaction,
                    result.text
                );

            } catch (error) {
                console.error(
                    'Hiba a gyik slash keresésnél:',
                    error
                );

                if (
                    !interaction.replied &&
                    !interaction.deferred
                ) {
                    await interaction.reply({
                        content:
                            'Hiba történt a GYIK ' +
                            'keresése közben.',
                        ephemeral: true
                    });
                }
            }
        }
    },

    {
        name: 'jutalmak',
        description:
            'Kilistázza milyen elérhető jutalmak vannak. ' +
            'Használat: !jutalmak vagy !jutalmak @creator',
        permissionLevel: 'public',

        async prefix(message) {
            const targetChannel =
                await getCommandTargetChannel(
                    message,
                    'jutalmak'
                );

            let creatorId = null;

            if (
                message.mentions.users.size > 0
            ) {
                creatorId =
                    message.mentions.users
                        .first()
                        .id;
            }

            const rewards = creatorId
                ? await getCreatorRewards(
                    message.guild.id,
                    creatorId
                )
                : await getActiveRewards(
                    message.guild.id
                );

            if (
                !rewards ||
                rewards.length === 0
            ) {
                return targetChannel.send(
                    'Nincsenek elérhető jutalmak.'
                );
            }

            const lines =
                rewards.map(reward => {
                    const creatorName =
                        reward.global_name ||
                        reward.username ||
                        reward.creator_id;

                    const description =
                        reward.reward_description
                            ? ` | ${reward.reward_description}`
                            : '';

                    return (
                        `#${reward.id} | ` +
                        `${reward.reward_name} | ` +
                        `${reward.point_cost} pont | ` +
                        `létrehozó: ${creatorName}` +
                        description
                    );
                });

            const text =
                'Elérhető jutalmak:\n' +
                lines.join('\n');

            await sendLongMessage(
                targetChannel,
                text
            );
        }
    },

    {
        name: 'verzio',
        description:
            'Kiírja a bot jelenlegi és GitHubon elérhető verzióját.',
        permissionLevel: 'public',

        async prefix(message) {
            const userId =
                message.author.id;

            if (
                verzioCooldown.has(userId)
            ) {
                const last =
                    verzioCooldown.get(userId);

                const now = Date.now();

                if (now - last < 5000) {
                    return message.reply(
                        '⏳ Várj egy kicsit mielőtt ' +
                        'újra használod ezt a parancsot.'
                    );
                }
            }

            verzioCooldown.set(
                userId,
                Date.now()
            );

            const dbVersion =
                await getOrCreateBotVersion(
                    message.guild.id
                );

            const github =
                await getGithubVersion();

            const result =
                compareVersions(
                    dbVersion.current_version,
                    github.version
                );

            let statusText = '';

            if (result.type === 'same') {
                statusText =
                    '✅ A bot naprakész.';

            } else if (
                result.type === 'patch'
            ) {
                statusText =
                    'ℹ️ Kisebb javítás elérhető, ' +
                    'de nem szükséges frissíteni.';

            } else if (
                result.type === 'minor'
            ) {
                statusText =
                    'ℹ️ Nagyobb hibajavítás elérhető, ' +
                    'de még nem kötelező frissíteni.';

            } else if (
                result.type === 'recommended'
            ) {
                statusText =
                    '⚠️ Ajánlott frissítés elérhető.';

            } else if (
                result.type === 'major'
            ) {
                statusText =
                    '🚨 Nagy frissítés elérhető.';

            } else {
                statusText =
                    '❓ Ismeretlen verzióállapot.';
            }

            const text =
                '📦 Bot verzió állapot\n\n' +
                `Saját verzió: ` +
                `${dbVersion.current_version}\n` +
                `GitHub verzió: ` +
                `${github.version}\n` +
                `Állapot: ${statusText}\n\n` +
                `GitHub üzenet: ` +
                `${github.message || 'Nincs megadva.'}`;

            await message.reply(text);
        }
    }
];
const {
    getFaqSettings,
    setFaqChannel,
    setFaqTitleFormat,
    deleteFaqEntriesByChannel
} = require('../../database/queries/faq');

const {
    validateTitleFormat
} = require('../../utilis/faqParser');

const {
    syncFaqChannel
} = require('../../utilis/faqSync');

const {
    logError
} = require('../../database/logger');

/*
 * Egységes metaadat a hibanaplózáshoz.
 */
function getMessageMeta(message) {
    return {
        user_id: message.author.id,
        user_name: message.author.username,
        guild_id: message.guild.id,
        guild_name: message.guild.name
    };
}

function getInteractionMeta(interaction) {
    return {
        user_id: interaction.user.id,
        user_name: interaction.user.username,
        guild_id: interaction.guild.id,
        guild_name: interaction.guild.name
    };
}

/*
 * Prefix parancsnál megkeresi a megjelölt
 * vagy azonosítóval megadott csatornát.
 */
async function resolveMessageChannel(
    message,
    channelText
) {
    const mentionedChannel =
        message.mentions.channels.first();

    if (mentionedChannel) {
        return mentionedChannel;
    }

    if (!channelText) {
        return null;
    }

    const channelId = channelText.replace(
        /[<#>]/g,
        ''
    );

    if (!channelId) {
        return null;
    }

    return (
        message.guild.channels.cache.get(channelId) ||
        await message.guild.channels
            .fetch(channelId)
            .catch(() => null)
    );
}

/*
 * Ellenőrzi, hogy a csatorna alkalmas-e
 * üzenetek tárolására és lekérésére.
 */
function isUsableFaqChannel(channel) {
    return Boolean(
        channel &&
        channel.isTextBased() &&
        channel.messages
    );
}

/*
 * Elindítja az adott szerver beállított
 * GYIK-csatornájának szinkronizálását.
 */
async function runGuildFaqSync(guild) {
    const settings =
        await getFaqSettings(guild.id);

    if (!settings) {
        return {
            error:
                'Nincs beállítva GYIK-csatorna.'
        };
    }

    const channel =
        guild.channels.cache.get(
            settings.channel_id
        ) ||
        await guild.channels
            .fetch(settings.channel_id)
            .catch(() => null);

    if (!isUsableFaqChannel(channel)) {
        return {
            error:
                'A beállított GYIK-csatorna nem található, ' +
                'vagy nem olvasható szöveges csatorna.'
        };
    }

    const result = await syncFaqChannel(
        channel,
        settings
    );

    return {
        channel,
        result
    };
}

module.exports = [
    /*
     * GYIK-csatorna beállítása.
     */
    {
        name: 'gyikcsatorna',
        description:
            'Beállítja a szerver GYIK-csatornáját.',
        permissionLevel: 'admin',

        slashOptions: [
            {
                name: 'channel',
                description:
                    'A GYIK-ként használt szöveges csatorna',
                required: true,
                type: 'channel'
            }
        ],

        async prefix(message, args) {
            try {
                const channel =
                    await resolveMessageChannel(
                        message,
                        args[0]
                    );

                if (!isUsableFaqChannel(channel)) {
                    return message.reply(
                        'Jelölj meg egy olvasható ' +
                        'szöveges csatornát.\n' +
                        'Példa: ' +
                        '!gyikcsatorna #felhomalyosito-szoba'
                    );
                }

                const previousSettings =
                    await getFaqSettings(
                        message.guild.id
                    );

                /*
                 * Ha másik csatornára váltunk,
                 * a régi csatorna keresési gyorsítótárát
                 * eltávolítjuk.
                 */
                if (
                    previousSettings &&
                    previousSettings.channel_id !==
                        channel.id
                ) {
                    await deleteFaqEntriesByChannel(
                        message.guild.id,
                        previousSettings.channel_id
                    );
                }

                await setFaqChannel(
                    message.guild.id,
                    channel.id,
                    message.author.id
                );

                await message.reply(
                    `A GYIK-csatorna beállítva: ${channel}\n` +
                    'Most futtasd: `!gyikszinkron`'
                );

            } catch (error) {
                console.error(
                    'Hiba a gyikcsatorna parancsnál:',
                    error
                );

                await logError(
                    error,
                    'Hiba a gyikcsatorna parancsnál',
                    getMessageMeta(message)
                );

                await message.reply(
                    'Hiba történt a GYIK-csatorna ' +
                    'beállítása közben.'
                );
            }
        },

        async slash(interaction) {
            try {
                const channel =
                    interaction.options.getChannel(
                        'channel'
                    );

                if (!isUsableFaqChannel(channel)) {
                    return interaction.reply({
                        content:
                            'A kiválasztott csatorna nem ' +
                            'olvasható szöveges csatorna.',
                        ephemeral: true
                    });
                }

                const previousSettings =
                    await getFaqSettings(
                        interaction.guild.id
                    );

                if (
                    previousSettings &&
                    previousSettings.channel_id !==
                        channel.id
                ) {
                    await deleteFaqEntriesByChannel(
                        interaction.guild.id,
                        previousSettings.channel_id
                    );
                }

                await setFaqChannel(
                    interaction.guild.id,
                    channel.id,
                    interaction.user.id
                );

                await interaction.reply({
                    content:
                        `A GYIK-csatorna beállítva: ${channel}\n` +
                        'Most futtasd a `/gyikszinkron` parancsot.',
                    ephemeral: true
                });

            } catch (error) {
                console.error(
                    'Hiba a gyikcsatorna slash parancsnál:',
                    error
                );

                await logError(
                    error,
                    'Hiba a gyikcsatorna slash parancsnál',
                    getInteractionMeta(interaction)
                );

                if (
                    !interaction.replied &&
                    !interaction.deferred
                ) {
                    await interaction.reply({
                        content:
                            'Hiba történt a GYIK-csatorna ' +
                            'beállítása közben.',
                        ephemeral: true
                    });
                }
            }
        }
    },

    /*
     * Szerverenkénti címformátum beállítása.
     */
    {
        name: 'gyikcimformatum',
        description:
            'Beállítja a GYIK-bejegyzések címformátumát.',
        permissionLevel: 'admin',

        slashOptions: [
            {
                name: 'formatum',
                description:
                    'Például: **__{CÍM}__**',
                required: true,
                type: 'string'
            }
        ],

        async prefix(message, args) {
            try {
                const settings =
                    await getFaqSettings(
                        message.guild.id
                    );

                if (!settings) {
                    return message.reply(
                        'Először állítsd be a GYIK-csatornát:\n' +
                        '`!gyikcsatorna #csatorna`'
                    );
                }

                const titleFormat =
                    args.join(' ').trim();

                const validation =
                    validateTitleFormat(
                        titleFormat
                    );

                if (!validation.valid) {
                    return message.reply(
                        validation.error
                    );
                }

                await setFaqTitleFormat(
                    message.guild.id,
                    titleFormat,
                    message.author.id
                );

                await message.reply(
                    `A címformátum beállítva:\n` +
                    `\`${titleFormat}\`\n\n` +
                    'A meglévő üzenetek feldolgozásához ' +
                    'futtasd: `!gyikszinkron`'
                );

            } catch (error) {
                console.error(
                    'Hiba a gyikcimformatum parancsnál:',
                    error
                );

                await logError(
                    error,
                    'Hiba a gyikcimformatum parancsnál',
                    getMessageMeta(message)
                );

                await message.reply(
                    'Hiba történt a címformátum ' +
                    'beállítása közben.'
                );
            }
        },

        async slash(interaction) {
            try {
                const settings =
                    await getFaqSettings(
                        interaction.guild.id
                    );

                if (!settings) {
                    return interaction.reply({
                        content:
                            'Először állítsd be a ' +
                            'GYIK-csatornát.',
                        ephemeral: true
                    });
                }

                const titleFormat =
                    interaction.options.getString(
                        'formatum'
                    );

                const validation =
                    validateTitleFormat(
                        titleFormat
                    );

                if (!validation.valid) {
                    return interaction.reply({
                        content: validation.error,
                        ephemeral: true
                    });
                }

                await setFaqTitleFormat(
                    interaction.guild.id,
                    titleFormat,
                    interaction.user.id
                );

                await interaction.reply({
                    content:
                        `A címformátum beállítva:\n` +
                        `\`${titleFormat}\`\n\n` +
                        'A meglévő üzenetek feldolgozásához ' +
                        'futtasd a `/gyikszinkron` parancsot.',
                    ephemeral: true
                });

            } catch (error) {
                console.error(
                    'Hiba a gyikcimformatum slash parancsnál:',
                    error
                );

                await logError(
                    error,
                    'Hiba a gyikcimformatum slash parancsnál',
                    getInteractionMeta(interaction)
                );

                if (
                    !interaction.replied &&
                    !interaction.deferred
                ) {
                    await interaction.reply({
                        content:
                            'Hiba történt a címformátum ' +
                            'beállítása közben.',
                        ephemeral: true
                    });
                }
            }
        }
    },

    /*
     * A teljes csatorna kézi újraszinkronizálása.
     */
    {
        name: 'gyikszinkron',
        description:
            'Újraszinkronizálja a beállított GYIK-csatornát.',
        permissionLevel: 'admin',

        async prefix(message) {
            try {
                const waitingMessage =
                    await message.reply(
                        'A GYIK-csatorna szinkronizálása folyamatban...'
                    );

                const sync =
                    await runGuildFaqSync(
                        message.guild
                    );

                if (sync.error) {
                    return waitingMessage.edit(
                        sync.error
                    );
                }

                await waitingMessage.edit(
                    'A GYIK-szinkronizálás elkészült.\n' +
                    `Csatorna: ${sync.channel}\n` +
                    `Lekért üzenetek: ${sync.result.fetchedCount}\n` +
                    `Elmentett bejegyzések: ${sync.result.savedCount}\n` +
                    `Kihagyott üzenetek: ${sync.result.skippedCount}`
                );

            } catch (error) {
                console.error(
                    'Hiba a gyikszinkron parancsnál:',
                    error
                );

                await logError(
                    error,
                    'Hiba a gyikszinkron parancsnál',
                    getMessageMeta(message)
                );

                await message.reply(
                    'Hiba történt a GYIK-csatorna ' +
                    'szinkronizálása közben.'
                );
            }
        },

        async slash(interaction) {
            try {
                await interaction.deferReply({
                    ephemeral: true
                });

                const sync =
                    await runGuildFaqSync(
                        interaction.guild
                    );

                if (sync.error) {
                    return interaction.editReply(
                        sync.error
                    );
                }

                await interaction.editReply(
                    'A GYIK-szinkronizálás elkészült.\n' +
                    `Csatorna: ${sync.channel}\n` +
                    `Lekért üzenetek: ${sync.result.fetchedCount}\n` +
                    `Elmentett bejegyzések: ${sync.result.savedCount}\n` +
                    `Kihagyott üzenetek: ${sync.result.skippedCount}`
                );

            } catch (error) {
                console.error(
                    'Hiba a gyikszinkron slash parancsnál:',
                    error
                );

                await logError(
                    error,
                    'Hiba a gyikszinkron slash parancsnál',
                    getInteractionMeta(interaction)
                );

                if (
                    interaction.deferred ||
                    interaction.replied
                ) {
                    await interaction.editReply(
                        'Hiba történt a GYIK-csatorna ' +
                        'szinkronizálása közben.'
                    );
                } else {
                    await interaction.reply({
                        content:
                            'Hiba történt a GYIK-csatorna ' +
                            'szinkronizálása közben.',
                        ephemeral: true
                    });
                }
            }
        }
    }
];
const {
    getFaqSettings,
    upsertFaqEntry,
    deleteFaqEntry,
    deleteFaqEntriesByChannel
} = require('../database/queries/faq');

const {
    messageToFaqData
} = require('./faqParser');

/*
 * Eldönti, hogy egy feldolgozott üzenetben
 * van-e egyáltalán eltárolható tartalom.
 */
function hasFaqContent(data) {
    return Boolean(
        data.title ||
        data.content ||
        data.attachmentUrls.length > 0
    );
}

/*
 * Egyetlen Discord-üzenetet ment vagy frissít
 * a GYIK-adatbázisban.
 */
async function saveFaqMessage(
    message,
    settings = null
) {
    if (!message.guild) {
        return {
            saved: false,
            reason: 'Nincs Discord-szerver.'
        };
    }

    /*
     * Részleges üzenet esetén megpróbáljuk
     * lekérni a teljes üzenetet.
     */
    if (message.partial) {
        try {
            message = await message.fetch();
        } catch (error) {
            return {
                saved: false,
                reason:
                    'A teljes üzenetet nem sikerült lekérni.',
                error
            };
        }
    }

    const faqSettings =
        settings ||
        await getFaqSettings(message.guild.id);

    if (!faqSettings) {
        return {
            saved: false,
            reason:
                'Nincs beállítva GYIK-csatorna.'
        };
    }

    /*
     * Csak a beállított GYIK-csatorna
     * üzeneteit kezeljük.
     */
    if (
        message.channel.id !==
        faqSettings.channel_id
    ) {
        return {
            saved: false,
            reason:
                'Ez nem a beállított GYIK-csatorna.'
        };
    }

    const data = messageToFaqData(
        message,
        faqSettings.title_format
    );

    /*
     * Ha az üzenetből minden kereshető
     * tartalmat eltávolítottak, töröljük
     * a keresőből.
     */
    if (!hasFaqContent(data)) {
        await deleteFaqEntry(
            message.guild.id,
            message.id
        );

        return {
            saved: false,
            deleted: true,
            reason:
                'Az üzenetnek nincs kereshető tartalma.'
        };
    }

    await upsertFaqEntry(data);

    return {
        saved: true,
        data
    };
}

/*
 * Egy törölt Discord-üzenetet eltávolít
 * a GYIK-adatbázisból.
 */
async function removeFaqMessage(message) {
    if (!message.guild) {
        return {
            deleted: false
        };
    }

    const settings =
        await getFaqSettings(message.guild.id);

    if (!settings) {
        return {
            deleted: false
        };
    }

    if (
        message.channel.id !==
        settings.channel_id
    ) {
        return {
            deleted: false
        };
    }

    const result = await deleteFaqEntry(
        message.guild.id,
        message.id
    );

    return {
        deleted:
            Boolean(result && result.changes > 0)
    };
}

/*
 * Lekéri egy Discord-csatorna teljes
 * üzenettörténetét.
 *
 * A Discord egyszerre legfeljebb 100
 * üzenetet ad vissza, ezért lapozunk.
 */
async function fetchAllChannelMessages(channel) {
    const messages = [];

    let before = null;

    while (true) {
        const options = {
            limit: 100
        };

        if (before) {
            options.before = before;
        }

        const batch =
            await channel.messages.fetch(options);

        if (batch.size === 0) {
            break;
        }

        messages.push(...batch.values());

        before = batch.last().id;

        if (batch.size < 100) {
            break;
        }
    }

    return messages;
}

/*
 * Egy teljes GYIK-csatornát újraszinkronizál.
 *
 * Fontos:
 * először letölti az összes Discord-üzenetet,
 * és csak sikeres letöltés után törli a régi
 * keresési adatokat.
 */
async function syncFaqChannel(
    channel,
    settings
) {
    if (!channel.guild) {
        throw new Error(
            'A megadott csatorna nem tartozik szerverhez.'
        );
    }

    if (
        channel.id !== settings.channel_id
    ) {
        throw new Error(
            'Nem ez a szerver beállított GYIK-csatornája.'
        );
    }

    if (
        !channel.isTextBased() ||
        !channel.messages
    ) {
        throw new Error(
            'A beállított csatorna nem támogatja az üzenetek lekérését.'
        );
    }

    /*
     * Előbb mindent letöltünk.
     * Ha ez hibát dob, az adatbázishoz
     * még nem nyúltunk hozzá.
     */
    const messages =
        await fetchAllChannelMessages(channel);

    /*
     * Csak sikeres letöltés után töröljük
     * a csatorna régi keresési adatait.
     */
    await deleteFaqEntriesByChannel(
        channel.guild.id,
        channel.id
    );

    let savedCount = 0;
    let skippedCount = 0;

    /*
     * Régebbitől az újabb felé dolgozzuk fel.
     */
    const orderedMessages =
        messages.reverse();

    for (const message of orderedMessages) {
        const data = messageToFaqData(
            message,
            settings.title_format
        );

        if (!hasFaqContent(data)) {
            skippedCount++;
            continue;
        }

        await upsertFaqEntry(data);
        savedCount++;
    }

    return {
        fetchedCount: messages.length,
        savedCount,
        skippedCount
    };
}

module.exports = {
    hasFaqContent,
    saveFaqMessage,
    removeFaqMessage,
    fetchAllChannelMessages,
    syncFaqChannel
};
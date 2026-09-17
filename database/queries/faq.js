const {
    run,
    get,
    all
} = require('../db');

/*
 * Lekéri az adott Discord-szerver
 * GYIK-beállításait.
 */
async function getFaqSettings(guildId) {
    return await get(`
        SELECT *
        FROM faq_settings
        WHERE guild_id = ?
    `, [
        guildId
    ]);
}

/*
 * Beállítja vagy lecseréli az adott szerver
 * GYIK-csatornáját.
 *
 * Ha már létezik beállítás, a címformátumot
 * változatlanul hagyja.
 */
async function setFaqChannel(
    guildId,
    channelId,
    updatedBy
) {
    return await run(`
        INSERT INTO faq_settings (
            guild_id,
            channel_id,
            updated_by
        )
        VALUES (?, ?, ?)

        ON CONFLICT(guild_id)
        DO UPDATE SET
            channel_id = excluded.channel_id,
            updated_by = excluded.updated_by,
            updated_at = datetime('now', 'localtime')
    `, [
        guildId,
        channelId,
        updatedBy
    ]);
}

/*
 * Beállítja a cím felismeréséhez használt formátumot.
 *
 * Például:
 * **__{CÍM}__**
 */
async function setFaqTitleFormat(
    guildId,
    titleFormat,
    updatedBy
) {
    return await run(`
        UPDATE faq_settings
        SET
            title_format = ?,
            updated_by = ?,
            updated_at = datetime('now', 'localtime')
        WHERE guild_id = ?
    `, [
        titleFormat,
        updatedBy,
        guildId
    ]);
}

/*
 * Létrehoz vagy frissít egy GYIK-bejegyzést.
 *
 * Ha ugyanaz az üzenet már szerepel az
 * adatbázisban, akkor frissíti.
 */
async function upsertFaqEntry(data) {
    return await run(`
        INSERT INTO faq_entries (
            guild_id,
            channel_id,
            message_id,
            title,
            content,
            message_url,
            author_id,
            author_name,
            attachment_urls,
            discord_created_at,
            discord_edited_at,
            synced_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))

        ON CONFLICT(guild_id, message_id)
        DO UPDATE SET
            channel_id = excluded.channel_id,
            title = excluded.title,
            content = excluded.content,
            message_url = excluded.message_url,
            author_id = excluded.author_id,
            author_name = excluded.author_name,
            attachment_urls = excluded.attachment_urls,
            discord_created_at = excluded.discord_created_at,
            discord_edited_at = excluded.discord_edited_at,
            synced_at = datetime('now', 'localtime')
    `, [
        data.guildId,
        data.channelId,
        data.messageId,
        data.title || null,
        data.content || '',
        data.messageUrl,
        data.authorId || null,
        data.authorName || null,
        JSON.stringify(data.attachmentUrls || []),
        data.discordCreatedAt || null,
        data.discordEditedAt || null
    ]);
}

/*
 * Töröl egyetlen bejegyzést a Discord-üzenet
 * azonosítója alapján.
 */
async function deleteFaqEntry(
    guildId,
    messageId
) {
    return await run(`
        DELETE FROM faq_entries
        WHERE guild_id = ?
        AND message_id = ?
    `, [
        guildId,
        messageId
    ]);
}

/*
 * Törli egy csatorna korábban szinkronizált
 * bejegyzéseit.
 *
 * A teljes újraszinkronizálás előtt használjuk.
 */
async function deleteFaqEntriesByChannel(
    guildId,
    channelId
) {
    return await run(`
        DELETE FROM faq_entries
        WHERE guild_id = ?
        AND channel_id = ?
    `, [
        guildId,
        channelId
    ]);
}

/*
 * Keresés a címben és a teljes tartalomban.
 *
 * Maximum 10 találatot ad vissza.
 */
async function searchFaqEntries(
    guildId,
    searchText,
    limit = 10
) {
    const searchPattern =
        `%${searchText.trim()}%`;

    return await all(`
        SELECT *
        FROM faq_entries
        WHERE guild_id = ?
        AND (
            title LIKE ? COLLATE NOCASE
            OR content LIKE ? COLLATE NOCASE
        )
        ORDER BY
            CASE
                WHEN title LIKE ? COLLATE NOCASE
                    THEN 0
                ELSE 1
            END,
            discord_created_at DESC,
            id DESC
        LIMIT ?
    `, [
        guildId,
        searchPattern,
        searchPattern,
        searchPattern,
        limit
    ]);
}

/*
 * Lekéri az adott szerver összes eltárolt
 * GYIK-bejegyzését.
 *
 * Ezt például a címformátum megváltoztatása
 * utáni újrafeldolgozásnál használhatjuk.
 */
async function getAllFaqEntries(guildId) {
    return await all(`
        SELECT *
        FROM faq_entries
        WHERE guild_id = ?
        ORDER BY discord_created_at ASC, id ASC
    `, [
        guildId
    ]);
}

/*
 * Lekéri egy konkrét Discord-üzenethez
 * tartozó GYIK-bejegyzést.
 */
async function getFaqEntryByMessageId(
    guildId,
    messageId
) {
    return await get(`
        SELECT *
        FROM faq_entries
        WHERE guild_id = ?
        AND message_id = ?
    `, [
        guildId,
        messageId
    ]);
}

module.exports = {
    getFaqSettings,
    setFaqChannel,
    setFaqTitleFormat,
    upsertFaqEntry,
    deleteFaqEntry,
    deleteFaqEntriesByChannel,
    searchFaqEntries,
    getAllFaqEntries,
    getFaqEntryByMessageId
};
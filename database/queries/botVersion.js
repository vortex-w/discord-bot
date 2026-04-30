const { run, get } = require("../db");

async function getBotVersion(guildId){
    return await get(`
        SELECT *
        FROM bot_versions
        WHERE guild_id = ?
        LIMIT 1
    `, [guildId]);
}

async function createBotVersion(guildId, version = 'V1.0.0'){
    return await run(`
        INSERT OR IGNORE INTO bot_versions(
            guild_id,
            current_version
        )
        VALUES(?, ?)
    `, [guildId, version]);
}

async function updateBotVersionCheck(guildId){
    return await run(`
        UPDATE bot_versions
        SET last_checked_at = datetime('now','localtime'),
            updated_at = datetime('now','localtime')
        WHERE guild_id = ?
    `, [guildId]);
}

async function updateBotVersionNotify(guildId){
    return await run(`
        UPDATE bot_versions
        SET last_notified_at = datetime('now','localtime'),
            updated_at = datetime('now','localtime')
        WHERE guild_id = ?
    `, [guildId]);
}

async function getOrCreateBotVersion(guildId){
    let version = await getBotVersion(guildId);

    if(!version){
        await createBotVersion(guildId);
        version = await getBotVersion(guildId);
    }

    return version;
}

async function updateCurrentBotVersion(guildId, version){
    return await run(`
        UPDATE bot_versions
        SET current_version = ?,
            last_checked_at = datetime('now','localtime'),
            last_notified_at = NULL,
            updated_at = datetime('now','localtime')
        WHERE guild_id = ?
    `, [version, guildId]);
}
module.exports = {
    updateCurrentBotVersion,
    getBotVersion,
    createBotVersion,
    updateBotVersionCheck,
    updateBotVersionNotify,
    getOrCreateBotVersion
};
const { run, get} = require('../db');

async function saveGuild(guild) {
    await run(`
        INSERT INTO guilds (guild_id, guild_name, owner_id, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(guild_id) DO UPDATE SET
            guild_name = excluded.guild_name,
            owner_id = excluded.owner_id,
            updated_at = CURRENT_TIMESTAMP
    `, [
        guild.id,
        guild.name,
        guild.ownerId
    ]);
}
async function getGuildById(guildId){
    return await get(`
            SELECT *
            FROM guilds
            WHERE guild_id = ?
        `,[guildId]);
}

async function saveGuildUser(guildId, userId){
    await run(`
            INSERT OR IGNORE INTO guild_users(guild_id,user_id)
            VALUES(?,?)
        `, [guildId, userId]);
}

module.exports = {
    saveGuild,
    getGuildById,
    saveGuildUser
}

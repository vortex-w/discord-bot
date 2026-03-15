const { run, all, get } = require("../db");

async function saveGuildChannel(channel){
    await run(`
            INSERT INTO guild_channels(
                guild_id,
                channel_id,
                channel_name,
                channel_type,
                parent_id,
                updated_at
            )
            VALUES(?,?,?,?,?, datetime('now','localTime'))
            ON CONFLICT(guild_id, channel_id)
            DO UPDATE SET
                channel_name = excluded.channel_name,
                channel_type = excluded.channel_type,
                parent_id = excluded.parent_id,
                updated_at = datetime('now','localtime')
        `,[
            channel.guildId,
            channel.channelId,
            channel.channelName,
            channel.channelType,
            channel.parentId || null
        ]);
}

async function getGuildChannels(guildId){
    return await all(`
            SELECT *
            FROM guild_channels
            WHERE guild_id = ?
            ORDER BY channel_name COLLATE NOCASE ASC
        `,[guildId]);
}

async function getGuildChannelByName(guildId,channelName){
    return await get(`
            SELECT * 
            FROM guild_channels
            WHERE guild_id = ? 
            AND channel_name = ?
            LIMIT 1
        `,[guildId, channelName]);
}

module.exports = {
    saveGuildChannel,
    getGuildChannels,
    getGuildChannelByName
}
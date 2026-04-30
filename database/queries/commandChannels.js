const { run, all } = require("../db");

async function addCommandChannel(guildId, commandName,channelId){
    await run(`
            INSERT OR IGNORE INTO command_channel_permissions(
                guild_id,
                command_name,
                channel_id
            )
                VALUES(?,?,?)
        `,[
            guildId,
            commandName,
            channelId
        ]);
}

async function removeCommandChannel(guildId, commandName,channelId){
    await run(`
            DELETE FROM command_channel_permissions
            WHERE guild_id = ?
            and command_name = ?
            and channel_id = ?
        `,[
            guildId,
            commandName,
            channelId
        ]);
}
async function getCommandChannels(guildId,commandName){
    return await all(`
            SELECT *
            FROM command_channel_permissions
            WHERE guild_id = ?
            and command_name = ?
            ORDER BY Channel_id ASC
        `,[
            guildId,
            commandName
        ]);
}

async function isCommandAllowedInChannel(guildId,commandName,channelId){
    const rows = await all(`
            SELECT channel_id
            FROM command_channel_permisions
            WHERE guild_id  = ?
            AND command_name = ?
        `,[
            guildId,
            commandName
        ]);
        if(!rows || rows.length === 0){
            return true;
        }

        return rows.some(row => row.channel_id === channelId);
}

async function getAllCommandChannelRules(guildId){
    return await all(`
            SELECT *
            FROM command_channel_permissions
            WHERE guild_id = ?
            ORDER BY command_name ASC, channel_id ASC
        `,[guildId]);
}

async function getAllRewards(guildId){
    return await all(`
        SELECT *
        FROM quiz_rewards
        WHERE guild_id = ?
        ORDER BY reward_points ASC
    `, [guildId]);
}

async function getRewardsByCreator(guildId, creatorId){
    return await all(`
        SELECT *
        FROM quiz_rewards
        WHERE guild_id = ?
        AND created_id = ?
        ORDER BY reward_points ASC
    `, [guildId, creatorId]);
}

module.exports = {
    getAllRewards,
    getRewardsByCreator,
    addCommandChannel,
    removeCommandChannel,
    getCommandChannels,
    isCommandAllowedInChannel,
    getAllCommandChannelRules
}
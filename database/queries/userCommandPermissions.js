const { get } = require("../db");

async function getUserCommandPermission(guildId,userId,commandName){
    return await get(`
            SELECT allowed
            FROM user_command_permissions
            WHERE guild_id = ? and user_id =? and command_name = ?
        `,[
            guildId,
            userId,
            commandName
        ]);
}
module.exports = {
    getUserCommandPermission
}
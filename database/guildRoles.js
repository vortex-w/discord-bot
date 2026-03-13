const {run, all, get} = require('./db');
const {logError, logInfo} = require('./logger');
const { getUserById } = require('./queries/users');
async function createGuildRolesTable(){
    try{
        await run(`
                CREATE TABLE IF NOT EXISTS guild_roles(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    role_id TEXT NOT NULL,
                    role_name TEXT NOT NULL,
                    role_position INTEGER NOT NULL DEFAULT 0,
                    UNIQUE(guild_id, role_id)
                )
            `);
    }catch(error){
            await logError(error,'hiba az adatbázis feltöltésekor');
    }
}

async function saveGuildRole(guildId, role){
    try{
        await run(`
                INSERT INTO guild_roles(guild_id, role_id,role_name,role_position)
                VALUES(?,?,?,?)
                ON CONFLICT(guild_id,role_id) DO UPDATE SET
                role_name = excluded.role_name,
                role_position = excluded.role_position
            `,[
                guildId,
                role.id,
                role.name,
                role.position
            ]);
    }catch(saveerror){
        await logError(saveerror,'hiba az adatbázisba történő adatmentéssel/role adatok');
    }
}
async function syncGuildRoles(guild){
    try{
        for(const role of guild.roles.cache.values()){
            await saveGuildRole(guild.id, role);
        }
    }catch(asyncError){
        await logError(asyncError,'hiba az adatbázis(guild_role) szinkronizálása közben');
    }
}
async function getGuildRoles(guildId){
    return await all(`
            SELECT * 
            FROM guild_roles
            WHERE guild_id = ?
            ORDER BY role_position DESC
        `,[
            guildId
        ]);
}

async function setRolePermission(guildId,roleId,level){
    await run(`
            INSERT INTO bot_role_permissions(guild_id,role_id,permission_level)
            VALUES(?,?,?)
            ON CONFLICT(guild_id,role_id) DO UPDATE SET
            permission_level = excluded.permission_level
        `,[
            guildId,
            roleId,
            level
        ])
}

async function getRolePermissions(guildId){
    return await all(`
            SELECT roleid,permission_level
            FROM bot_role_permissions
            WHERE guild_id = ?
        `,[
            guildId
        ])
}
async function setUserCommandPermission(guild,userId, commandName,allowed = 1){
    await run(`
            INSERT INTO user_command_permissions(guild_id, user_id, command_name, allowed)
            VALUES(?,?,?,?)
            ON CONFLICT(guild_id,user_id,command_name) DO UPDATE SET
                allowed = excluded.allowed
        `,[
            guild,
            userId,
            commandName,
            allowed
        ]);
}
async function getUserCommandPermission(guildId,userId){
    return await all(`
            SELECT *
            FROM user_command_permissions
            WHERE guild_id = ? and user_id = ? 
        `,[
            guildId,
            userId
            
        ]);
}
module.exports = {
    createGuildRolesTable,
    saveGuildRole,
    syncGuildRoles,
    getGuildRoles,
    setRolePermission,
    getRolePermissions,
    setUserCommandPermission,
    getUserCommandPermission
}
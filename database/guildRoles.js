const {run, all} = require('./db');
const {logError, logInfo} = require('./logger');
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
module.exports = {
    createGuildRolesTable,
    saveGuildRole,
    syncGuildRoles,
    getGuildRoles
}
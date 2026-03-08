const {run} = require('./db');
async function initDatabase(){
    await run(`
            CREATE TABLE IF NOT EXISTS users(
                user_id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                global_name TEXT,
                created_at TEXT DEFAULT (datetime('now', 'localtime')),
                updated_at TEXT DEFAULT (datetime('now', 'localtime'))
            )
        `);

        await run(`
                CREATE TABLE IF NOT EXISTS guilds(
                    guild_id TEXT PRIMARY KEY,
                    guild_name TEXT NOT NULL,
                    owner_id TEXT NOT NULL,
                    created_at TEXT DEFAULT (datetime('now', 'localtime')),
                    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
                )
            `);
        await run(`
                CREATE TABLE IF NOT EXISTS guild_users(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    joined_at TEXT DEFAULT (datetime('now', 'localtime')),
                    UNIQUE(guild_id, user_id)
                )
            `);
        await run(`
                CREATE TABLE IF NOT EXISTS logs(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL,
                message TEXT NOT NULL,
                stack TEXT,
                user_id ,
                user_name,
                guild_id ,
                guild_name,
                created_at TEXT DEFAULT (datetime('now', 'localtime'))
                )
            `);
            console.log('SQLite táblák létrehozva, vagy már léteznek');
}

module.exports = {
    initDatabase
}
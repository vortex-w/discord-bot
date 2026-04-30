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
                user_id TEXT,
                user_name TEXT,
                guild_id TEXT,
                guild_name TEXT,
                created_at TEXT DEFAULT (datetime('now', 'localtime'))
                )
            `);
        await run(`
                CREATE TABLE IF NOT EXISTS bot_role_permissions(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                role_id TEXT NOT NULL,
                permission_level TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                UNIQUE(guild_id, role_id)
                )
            `);
        await run(`
                CREATE TABLE IF NOT EXISTS user_command_permissions(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    command_name TEXT NOT NULL,
                    allowed INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                    UNIQUE(guild_id,user_id,command_name)
                )
            `);
        await run(`
                CREATE TABLE IF NOT EXISTS quiz_games(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    channel_id TEXT NOT NULL,
                    message_id TEXT,
                    creator_id TEXT NOT NULL,
                    question TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    ends_at TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'active'
                )
            `);
            await run(`
                    CREATE TABLE IF NOT EXISTS quiz_answers(
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        quiz_id INTEGER NOT NULL,
                        answer_text TEXT NOT NULL,
                        is_correct INTEGER NOT NULL DEFAULT 0,
                        answer_index INTEGER NOT NULL,
                        FOREIGN KEY(quiz_id) REFERENCES quiz_games(id) ON DELETE CASCADE
                    )
                `);
            await run(`
                    CREATE TABLE IF NOT EXISTS quiz_votes(
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        quiz_id INTEGER NOT NULL,
                        user_id TEXT NOT NULL,
                        user_name TEXT NOT NULL,
                        answer_id INTEGER NOT NULL,
                        is_correct INTEGER NOT NULL DEFAULT 0,
                        voted_at TEXT NOT NULL,
                        FOREIGN KEY(quiz_id) REFERENCES quiz_games(id) ON DELETE CASCADE,
                        FOREIGN KEY(answer_id) REFERENCES quiz_answers(id) ON DELETE CASCADE,
                        UNIQUE(quiz_id, user_id)
                    )
                `);
            await run(`
                    CREATE TABLE IF NOT EXISTS quiz_points(
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        guild_id TEXT NOT NULL,
                        user_id TEXT NOT NULL,
                        user_name TEXT NOT NULL,
                        created_id TEXT NOT NULL,
                        points INTEGER NOT NULL DEFAULT 0,
                        UNIQUE(guild_id,user_id,created_id)
                    )
                `);
            await run(`
                    CREATE TABLE IF NOT EXISTS guild_channels(
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        guild_id TEXT NOT NULL,
                        channel_id TEXT NOT NULL,
                        channel_name TEXT NOT NULL,
                        channel_type TEXT NOT NULL,
                        parent_id TEXT,
                        created_at TEXT DEFAULT (datetime('now', 'localtime')),
                        updated_at TEXT DEFAULT (datetime('now','localtime')),
                        UNIQUE(guild_id, channel_id)
                    )
                `);
            await run(`
                    CREATE TABLE IF NOT EXISTS command_channel_permissions(
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        guild_id TEXT NOT NULL,
                        command_name TEXT NOT NULL,
                        channel_id TEXT NOT NULL,
                        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                        UNIQUE(guild_id,command_name,channel_id)
                    )
                `);
            await run(`
                CREATE TABLE IF NOT EXISTS rewards(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    creator_id TEXT NOT NULL,
                    reward_name TEXT NOT NULL,
                    reward_description TEXT,
                    point_cost INTEGER NOT NULL DEFAULT 0,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
                )
            `);
            await run(`
                CREATE TABLE IF NOT EXISTS user_rank_points(
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    user_name TEXT NOT NULL,
                    total_points INTEGER NOT NULL DEFAULT 0,
                    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                    UNIQUE(guild_id, user_id)
                )
            `);
            await run(
                `
                CREATE TABLE IF NOT EXISTS bot_versions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                current_version TEXT NOT NULL DEFAULT 'V1.0.0',
                last_checked_at TEXT,
                last_notified_at TEXT,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                updated_at TEXT DEFAULT (datetime('now','localtime')),
                UNIQUE(guild_id)
            );
                `
            );
            console.log('SQLite táblák létrehozva, vagy már léteznek');
}

module.exports = {
    initDatabase
}
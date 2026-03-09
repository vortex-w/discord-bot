const { run, get} = require('../db');

async function saveUser(user){
    await run(`
            INSERT INTO users(user_id,username,global_name,updated_at)
            VALUES(?,?,?,datetime('now', 'localtime'))
            ON CONFLICT(user_id) DO UPDATE SET
                username = excluded.username,
                global_name = excluded.global_name,
                updated_at = datetime('now', 'localtime')
        `,[
            user.id,
            user.username,
            user.globalName || null
        ]);
}

async function getUserById(userId){
    return await get(`
            SELECT * 
            FROM users
            WHERE user_id = ?
        `, [userId]);
}

module.exports = {
    saveUser,
    getUserById
}
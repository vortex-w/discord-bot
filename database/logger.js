const { run } = require('./db');
const {all} = require('./db');

function normalizeLogMeta(meta = {}) {
    return {
        user_id: meta.user_id || null,
        user_name: meta.user_name || null,
        guild_id: meta.guild_id || null,
        guild_name: meta.guild_name || null
    };
}

async function logError(error, context = '', meta = {}) {
    try {
        const message = error?.message || String(error);
        const stack = error?.stack || null;

        const logMeta = normalizeLogMeta(meta);

        await run(`
            INSERT INTO logs (
                type,
                message,
                stack,
                user_id,
                user_name,
                guild_id,
                guild_name
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            'error',
            context ? `${context} | ${message}` : message,
            stack,
            logMeta.user_id,
            logMeta.user_name,
            logMeta.guild_id,
            logMeta.guild_name
        ]);
    } catch (logError) {
        console.error('Log mentési hiba:', logError);
    }
}

async function logInfo(message, meta = {}) {
    try {
        const logMeta = normalizeLogMeta(meta);

        await run(`
            INSERT INTO logs (
                type,
                message,
                user_id,
                user_name,
                guild_id,
                guild_name
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            'info',
            message,
            logMeta.user_id,
            logMeta.user_name,
            logMeta.guild_id,
            logMeta.guild_name
        ]);
    } catch (err) {
        console.error('Log mentési hiba:', err);
    }
}

async function logWarn(message, meta = {}) {
    try {
        const logMeta = normalizeLogMeta(meta);

        await run(`
            INSERT INTO logs (
                type,
                message,
                user_id,
                user_name,
                guild_id,
                guild_name
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            'warn',
            message,
            logMeta.user_id,
            logMeta.user_name,
            logMeta.guild_id,
            logMeta.guild_name
        ]);
    } catch (err) {
        console.error('Log mentési hiba:', err);
    }
}
async function getLogsBetween(start,end){
    return await all(`
            SELECT * 
            FROM logs
            WHERE created_at BETWEEN ? and ?
            ORDER BY created_at DESC
        `,[
            start,end
        ]);
}

async function deleteAllLogs(){
    return await run(`
        DELETE FROM logs
    `);
}

async function deleteLastLog(){
    return await run(`
        DELETE FROM logs
        WHERE id = (
            SELECT id
            FROM logs
            ORDER BY id DESC
            LIMIT 1
        )
    `);
}

async function deleteLogsByDate(date){
    return await run(`
        DELETE FROM logs
        WHERE date(created_at) = ?
    `, [date]);
}

async function getLastLog(){
    return await get(`
        SELECT *
        FROM logs
        ORDER BY id DESC
        LIMIT 1
    `);
}

async function getLogsByDate(date){
    return await all(`
        SELECT *
        FROM logs
        WHERE date(created_at) = ?
        ORDER BY id ASC
    `, [date]);
}
module.exports = {
    logError,
    logInfo,
    logWarn,
    getLogsBetween,
    deleteAllLogs,
    deleteLastLog,
    deleteLogsByDate,
    getLogsByDate,
    getLastLog
};
const { run, get, all } = require('./db');

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
            context
                ? `${context} | ${message}`
                : message,
            stack,
            logMeta.user_id,
            logMeta.user_name,
            logMeta.guild_id,
            logMeta.guild_name
        ]);

    } catch (logSaveError) {
        console.error(
            'Log mentési hiba:',
            logSaveError
        );
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

    } catch (error) {
        console.error(
            'Log mentési hiba:',
            error
        );
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

    } catch (error) {
        console.error(
            'Log mentési hiba:',
            error
        );
    }
}

/*
 * Logok lekérése az adott Discord-szerverhez.
 *
 * A guild_id IS NULL feltétel miatt azok az általános
 * rendszerlogok is megjelennek, amelyek nem tartoznak
 * egy konkrét Discord-szerverhez.
 */
async function getLogsBetween(
    guildId,
    start,
    end,
    type = null,
    limit = 10,
    offset = 0
) {
    const typeFilter = type
        ? 'AND type = ?'
        : '';

    const params = [
        guildId,
        start,
        end
    ];

    if (type) {
        params.push(type);
    }

    params.push(limit, offset);

    return await all(`
        SELECT *
        FROM logs
        WHERE guild_id = ?
        AND created_at BETWEEN ? AND ?
        ${typeFilter}
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?
    `, params);
}

/*
 * Megszámolja az összes találatot.
 *
 * Erre azért van szükség, hogy a loglist meg tudja
 * jeleníteni például azt, hogy 10/37 találat.
 */
async function countLogsBetween(
    guildId,
    start,
    end,
    type = null
) {
    const typeFilter = type
        ? 'AND type = ?'
        : '';

    const params = [
        guildId,
        start,
        end
    ];

    if (type) {
        params.push(type);
    }

    const row = await get(`
        SELECT COUNT(*) AS total
        FROM logs
        WHERE guild_id = ?
        AND created_at BETWEEN ? AND ?
        ${typeFilter}
    `, params);

    return row?.total || 0;
}

async function deleteAllLogs() {
    return await run(`
        DELETE FROM logs
    `);
}

async function deleteLastLog() {
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

async function deleteLogsByDate(date) {
    return await run(`
        DELETE FROM logs
        WHERE date(created_at) = ?
    `, [date]);
}

async function getLastLog() {
    return await get(`
        SELECT *
        FROM logs
        ORDER BY id DESC
        LIMIT 1
    `);
}

async function getLogsByDate(date) {
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
    countLogsBetween,
    deleteAllLogs,
    deleteLastLog,
    deleteLogsByDate,
    getLogsByDate,
    getLastLog
};
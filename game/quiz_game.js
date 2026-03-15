const { run, get, all } = require("../database/db");

async function createQuizGame(data){
    const result = await run(`
        INSERT INTO quiz_games(
            guild_id,
            channel_id,
            creator_id,
            question,
            created_at,
            ends_at,
            status
        )
        VALUES(?,?,?,?,?,?, 'active')
    `,[
        data.guildId,
        data.channelId,
        data.creatorId,
        data.question,
        data.createdAt,
        data.endsAt
    ]);

    return result.lastID;
}

async function createQuizAnswer(data){
    const result = await run(`
        INSERT INTO quiz_answers(
            quiz_id,
            answer_text,
            is_correct,
            answer_index
        )
        VALUES(?,?,?,?)
    `,[
        data.quizId,
        data.answerText,
        data.isCorrect ? 1 : 0,
        data.answerIndex
    ]);

    return result.lastID;
}

async function updateQuizMessageId(quizId, messageId){
    await run(`
        UPDATE quiz_games
        SET message_id = ?
        WHERE id = ?
    `, [messageId, quizId]);
}

async function getQuizById(quizId){
    return await get(`
        SELECT *
        FROM quiz_games
        WHERE id = ?
    `, [quizId]);
}

async function getQuizAnswerByIndex(quizId, answerIndex){
    return await get(`
        SELECT *
        FROM quiz_answers
        WHERE quiz_id = ?
        AND answer_index = ?
    `, [quizId, answerIndex]);
}

async function hasUserVoted(quizId, userId){
    return await get(`
        SELECT id
        FROM quiz_votes
        WHERE quiz_id = ?
        AND user_id = ?
    `, [quizId, userId]);
}

async function createQuizVote(data){
    const result = await run(`
        INSERT INTO quiz_votes(
            quiz_id,
            user_id,
            user_name,
            answer_id,
            is_correct,
            voted_at
        )
        VALUES(?,?,?,?,?,?)
    `, [
        data.quizId,
        data.userId,
        data.userName,
        data.answerId,
        data.isCorrect ? 1 : 0,
        data.votedAt
    ]);

    return result.lastID;
}

async function addQuizPoint(guildId, userId, userName, creatorId){
    await run(`
        INSERT INTO quiz_points(
            guild_id,
            user_id,
            user_name,
            created_id,
            points
        )
        VALUES(?,?,?,?,1)
        ON CONFLICT(guild_id, user_id, created_id)
        DO UPDATE SET
            points = points + 1,
            user_name = excluded.user_name
    `, [guildId, userId, userName, creatorId]);
}

async function deleteQuizGameById(quizId) {
    await run(`DELETE FROM quiz_answers WHERE quiz_id = ?`, [quizId]);
    await run(`DELETE FROM quiz_votes WHERE quiz_id = ?`, [quizId]);
    await run(`DELETE FROM quiz_games WHERE id = ?`, [quizId]);
}

async function deleteAllQuizGames() {
    await run(`DELETE FROM quiz_answers`);
    await run(`DELETE FROM quiz_votes`);
    await run(`DELETE FROM quiz_games`);
}

async function getLastQuizGame() {
    return await get(`
        SELECT *
        FROM quiz_games
        ORDER BY id DESC
        LIMIT 1
    `);
}

async function getExpiredActiveQuizzes(){
    return await all(`
            SELECT * 
            FROM quiz_games
            WHERE status = 'active'
            AND ends_at <= datetime('now', 'localtime')   
            ORDER BY ends_at ASC
        `);
}

async function closeQuizById(quizId){
    await run(`
            UPDATE quiz_games
            SET status = 'closed'
            WHERE id = ?

        `,[
            quizId
        ]);
}

async function getQuizAnswers(quizId){
    return await all(`
            SELECT *
            FROM quiz_answers
            WHERE quiz_id = ?
            ORDER BY answer_index ASC
        `,[quizId]);
}

async function getQuizVoteCounts(quizId){
    return await all(`
        SELECT 
            qa.id,
            qa.answer_text,
            qa.is_correct,
            qa.answer_index,
            COUNT(qv.id) as vote_count
        FROM quiz_answers qa
        LEFT JOIN quiz_votes qv ON qv.answer_id = qa.id
        WHERE qa.quiz_id = ?
        GROUP BY qa.id, qa.answer_text, qa.is_correct, qa.answer_index
        ORDER BY qa.answer_index ASC
    `,[quizId]);
}

/*async function getCorrectVoters(quizId){
    return await all(`
            SELECT user_name
            FROM quiz_votes
            WHERE quiz_id = ?
            AND is_correct = 1
            ORDER BY user_name COLLATE NOCASE ASC
        `,[quizId]);
}*/

async function getCorrectVoters(quizId){
    return await all(`
        SELECT user_id, user_name
        FROM quiz_votes
        WHERE quiz_id = ?
        AND is_correct = 1
        ORDER BY user_name COLLATE NOCASE ASC
    `,[quizId]);
}


async function getUserPoints(userId){
    const rows = await all(`
        SELECT 
            u.username as created_by,
            SUM(qp.points) as total
        FROM quiz_points qp
        LEFT JOIN users u
            ON qp.created_id = u.user_id
        WHERE qp.user_id = ?
        GROUP BY qp.created_id
    `,[userId]);

    return rows;
}

async function getAllUserPoints(guildId){
    return await all(`
            SELECT user_id,user_name, SUM(points) as total
            FROM quiz_points
            WHERE guild_id = ?
            GROUP BY user_id
            ORDER BY total DESC
        `,[guildId]);
}
async function removeQuizPoint(guildId, userId, creatorId, amount = 1){
    await run(`
        UPDATE quiz_points
        SET points = CASE 
            WHEN points - ? < 0 THEN 0
            ELSE points - ?
        END
        WHERE guild_id = ?
        AND user_id = ?
        AND created_id = ?
    `, [amount, amount, guildId, userId, creatorId]);
}

module.exports = {
    createQuizGame,
    createQuizAnswer,
    updateQuizMessageId,
    getQuizById,
    getQuizAnswerByIndex,
    hasUserVoted,
    createQuizVote,
    addQuizPoint,
    deleteQuizGameById,
    deleteAllQuizGames,
    getLastQuizGame,
    getExpiredActiveQuizzes,
    closeQuizById,
    getQuizAnswers,
    getQuizVoteCounts,
    getCorrectVoters,
    getUserPoints,
    getAllUserPoints,
    removeQuizPoint
};
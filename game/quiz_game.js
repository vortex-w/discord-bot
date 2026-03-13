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

async function addQuizPoint(guildId, userId, userName){
    await run(`
        INSERT INTO quiz_points(
            guild_id,
            user_id,
            user_name,
            points
        )
        VALUES(?,?,?,1)
        ON CONFLICT(guild_id, user_id)
        DO UPDATE SET
            points = points + 1,
            user_name = excluded.user_name
    `, [guildId, userId, userName]);
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
    getLastQuizGame
};
const sqlite = require('sqlite3').verbose();
const { resolve } = require('dns');
const path = require('path');

const dbPath = path.join(__dirname, 'bot.sqlite');

const db = new sqlite.Database(dbPath, (err) => {
    if(err){
        console.error('SQLite kapcsolódási hiba:', err.message);
    }else{
        console.log('SQLite adatbázis csatlakozva:',dbPath);
    }
});

function run(sql, params = []){
    return new Promise((resolve,reject) => {
        db.run(sql,params,function(err){
            if(err) return reject(err);
            resolve({
                lastID : this.lastID,
                changes: this.changes
            });
        });
    });
}

function get(sql,params = []) {
    return new Promise((resolve,reject) => {
        db.get(sql,params,(err,row)=>{
            if(err) return reject(err);
            resolve(row);
        });
    });
}

function all(sql,params = []){
    return new Promise((resolve,reject) =>{
        db.all(sql,params,(err,rows)=>{
            if(err) return reject(err);
            resolve(rows);
        });
    });
}

module.exports = {
    db,
    run,
    get,
    all
}
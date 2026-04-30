const https = require('https');

function fetchJson(url){
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';

            res.on('data', chunk => data += chunk);

            res.on('end', () => {
                //console.log("GitHub válasz státusz:", res.statusCode);
                //console.log("GitHub válasz eleje:", data.slice(0, 100));

                if(res.statusCode !== 200){
                    return reject(new Error(`GitHub lekérés hiba: ${res.statusCode} - ${data}`));
                }

                try{
                    resolve(JSON.parse(data));
                }catch(error){
                    reject(error);
                }
            });

        }).on('error', reject);
    });
}

async function getGithubVersion(){
    const url = 'https://raw.githubusercontent.com/vortex-w/discord-bot/refs/heads/main/version.json';
    return await fetchJson(url);
}

module.exports = {
    getGithubVersion
};
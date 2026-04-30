
 require('dotenv').config();
var teszt_mode = false;
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { canUseLevel, getNoPermissionMessage } = require('./utilis/permissions');
const { syncGuildChannels } = require('./utilis/syncGuildChannels');
const {initDatabase} = require('./database/init');
const {saveUser} = require('./database/queries/users');
const {saveGuild, saveGuildUser} = require('./database/queries/guilds');
const kopapirollo = require('./game/kopapirollo');
const {logError, logInfo, logWarn, getLogsBetween} = require('./database/logger');
const { createGuildRolesTable,syncGuildRoles }  = require('./database/guildRoles');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

const publicCommands = require('./commands/public/commands');
const modCommands = require('./commands/mod/commands');
const adminCommands = require('./commands/admin/commands');
const ownerCommands = require('./commands/owner/commands');
const { getUserCommandPermission } = require('./database/queries/userCommandPermissions');
const { handleQuizButton } = require('./events/quizButtonhandler');
const { closeExperiedQuizzes } = require('./events/quizCloser');
const { getCommandChannels } = require('./database/queries/commandChannels');
const { getOrCreateBotVersion, updateBotVersionCheck, updateBotVersionNotify } = require('./database/queries/botVersion');
const { compareVersions } = require('./utilis/versionCompare');
const { getGithubVersion } = require('./utilis/versionchecker');

const allCommands = [
    ...publicCommands,
    ...modCommands,
    ...adminCommands,
    ...ownerCommands
];

for (const command of allCommands) {
    if (!command.name) {
        console.log('Találtam egy hibás parancsot, nincs name mező.');
         logInfo('Parancs, aminek nincs neve!');
        continue;
    }

    client.commands.set(command.name, command);
    
}
function isOlderThanDays(dateText, days){
    if(!dateText) return true;

    const lastDate = new Date(dateText);
    const now = new Date();

    const diffMs = now - lastDate;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    return diffDays >= days;
}

function getVersionMessage(localVersion, githubVersion, resultType){
    if(resultType === 'recommended'){
        return `⚠️ Ajánlott bot frissítés elérhető!\n\nJelenlegi verzió: ${localVersion}\nElérhető verzió: ${githubVersion}\n\nEz már olyan szintű frissítés, amit érdemes letölteni GitHubról.`;
    }

    if(resultType === 'major'){
        return `🚨 Nagy bot frissítés elérhető!\n\nJelenlegi verzió: ${localVersion}\nElérhető verzió: ${githubVersion}\n\nEz főverzió váltás, ajánlott mielőbb frissíteni.`;
    }

    return null;
}

function getNotifyChannel(guild){
    if(guild.systemChannel){
        return guild.systemChannel;
    }

    return guild.channels.cache.find(channel =>
        channel.isTextBased &&
        channel.isTextBased() &&
        channel.permissionsFor(guild.members.me).has('SendMessages')
    );
}
async function sendVersionNotify(guild, message){
    try{
        const owner = await guild.fetchOwner();

        if(owner && owner.user){
            await owner.user.send(message);
            console.log("Verzió értesítés elküldve privátban:", owner.user.tag);
            return true;
        }
    }catch(error){
        console.log("Nem sikerült privát üzenetet küldeni a szerver tulajnak:", error.message);
    }

    const channel = getNotifyChannel(guild);

    if(channel){
        await channel.send(message);
        console.log("Verzió értesítés elküldve csatornába:", channel.name);
        return true;
    }

    console.log("Nem volt elérhető értesítési hely:", guild.name);
    return false;
}
async function checkBotVersions(client){
    console.log("Verzióellenőrzés indul...");

    const github = await getGithubVersion();

    for(const guild of client.guilds.cache.values()){
        const dbVersion = await getOrCreateBotVersion(guild.id);

        await updateBotVersionCheck(guild.id);

        const result = compareVersions(
            dbVersion.current_version,
            github.version
        );

        console.log(
            guild.name,
            dbVersion.current_version,
            "→",
            github.version,
            "=>",
            result.type
        );

        // csak recommended / major esetén foglalkozunk vele
        if(result.type !== 'recommended' && result.type !== 'major'){
            continue;
        }

        // heti 1 értesítés
        if(!isOlderThanDays(dbVersion.last_notified_at, 7)){
            console.log("Már volt értesítés 7 napon belül:", guild.name);
            continue;
        }

        const message = getVersionMessage(
            dbVersion.current_version,
            github.version,
            result.type
        );

        // 👉 új logika: először DM a tulajnak
        let sent = false;

        try{
            const owner = await guild.fetchOwner();

            if(owner && owner.user){
                await owner.user.send(message);
                console.log("Verzió értesítés elküldve privátban:", owner.user.tag);
                sent = true;
            }
        }catch(error){
            console.log("Nem sikerült privát üzenetet küldeni a szerver tulajnak:", error.message);
        }

        // 👉 fallback: csatorna
        if(!sent){
            const channel = getNotifyChannel(guild);

            if(channel){
                await channel.send(message);
                console.log("Verzió értesítés elküldve csatornába:", channel.name);
                sent = true;
            }else{
                console.log("Nincs elérhető csatorna:", guild.name);
            }
        }

        // 👉 ha bárhova ment, frissítjük
        if(sent){
            await updateBotVersionNotify(guild.id);
        }
    }
}
client.once('clientReady', async () => {
    console.log(`Bot elindult: ${client.user.tag}`);
    
    try{

        await initDatabase();
        await createGuildRolesTable();
        await logInfo('bot elindult');
        for(const guild of client.guilds.cache.values()){
            await syncGuildRoles(guild);
            await syncGuildChannels(guild);
            await getOrCreateBotVersion(guild.id);
            if(teszt_mode){
                const dbVersion = await getOrCreateBotVersion(guild.id);
                const github = await getGithubVersion();
                const result = compareVersions(
                    dbVersion.current_version,
                    github.version
                );

                console.log(
                    guild.name,
                    dbVersion.current_version,
                    "→",
                    github.version,
                    "=>",
                    result.type
                );
            }
        }
    }catch(error){
        console.error('adatbázis inicializási hiba:' , error);
        await logError(error, 'adatbázis inicializálási hiba');
    }
    setInterval(async() => {
        //await closeExpiriedQuizzes(client);
        await closeExperiedQuizzes(client);
    }, 10000);
    function scheduleDailyTask(task) {
        const now = new Date();

        const next = new Date();
        next.setHours(6, 0, 0, 0); // 06:00

        // ha már elmúlt ma 6:00 → holnapra állítjuk
        if (now >= next) {
            next.setDate(next.getDate() + 1);
        }

        const delay = next - now;

        console.log(`Következő futás: ${next}`);

        setTimeout(() => {
            task();

            // innentől már fix 24 óránként
            setInterval(task, 24 * 60 * 60 * 1000);

        }, delay);
    }
    scheduleDailyTask(async () => {
         try{
            console.log("Napi frissítés ellenőrzés (06:00)");
            await checkBotVersions(client);
        }catch(error){
            console.error("Verzióellenőrzési hiba:", error);
            await logError(error, "Verzióellenőrzési hiba");
        }
    });
    //await checkBotVersions(client);
});

client.on('messageCreate', async (message) => {
    try {
        
        if (message.author.bot) return;
        if (!message.guild) return;
        try{
            //await saveGuildUser(message.author);
            await saveGuild(message.guild);
            await saveGuildUser(message.guild.id, message.author.id);
            await saveUser(message.author);
        }catch(dbError){
            console.error('Automatikus user/guild mentési hiba:', dbError);
            await logError(dbError,'user/guild mentési hiba',{
            user_id: message.author.id,
            user_name: message.author.username,
            guild_id: message.guild.id,
            guild_name: message.guild.name
        });
        }
        if(await kopapirollo(message,client)) return;
        if (!message.content.startsWith('!')) return;

        const args = message.content.slice(1).trim().split(/\s+/);
        const commandName = args.shift()?.toLowerCase();

        if (!commandName) return;

        const command = client.commands.get(commandName);

        if (!command) {
            //await message.reply(`Ismeretlen parancsot adtál meg: ${commandName}`);
            return;
        }
        
        const permissionLevel = command.permissionLevel || 'public';
        const userPerm = await getUserCommandPermission(
            message.guild.id,
            message.author.id,
            command.name
        );
        if(userPerm && userPerm.allowed){
            // van külön engedély → mehet
        }else{
            // normál rang ellenőrzés
            if (!(await canUseLevel(message.member, permissionLevel))) {
                await message.channel.send(getNoPermissionMessage(permissionLevel));
                return;
            }

        }
        
        if (typeof command.prefix === 'function') {
            await command.prefix(message, args, client);
            
        }
    } catch (error) {
        console.error('Hiba a messageCreate eseménynél:', error);
        await logError(error, 'messegaCreate esemény',{
            user_id: message.author.id,
            user_name: message.author.username,
            guild_id: message.guild.id,
            guild_name: message.guild.name
        });
    }
    try{
        await message.delete();
    }catch(deleteError){
        console.error("Az eredeti üzenetet nem sikerült törölni:", deleteError.message);
        logError(deleteError,'Hiba a törlés közben');
    } 
});

client.on('interactionCreate', async (interaction) => {
    try {
        
        if(await handleQuizButton(interaction)) return;
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.guild) return;
        
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        const permissionLevel = command.permissionLevel || 'public';
        const userPerm = await getUserCommandPermission(
            interaction.guild.id,
            interaction.user.id,
            command.name
        );
        if(userPerm && userPerm.allowed){
            // van külön engedély → mehet
        }else{
            // normál rang ellenőrzés
            if (!(await canUseLevel(interaction.member, permissionLevel))) {
                await interaction.reply(getNoPermissionMessage(permissionLevel));
                return;
            }
        }

        if (typeof command.slash === 'function') {
            await command.slash(interaction, client);
        }
    } catch (error) {
        console.error('Hiba az interactionCreate eseménynél:', error);

        if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: 'Hiba történt a parancs feldolgozása közben.',
                ephemeral: true
            });
            logError(error,'hiba');
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
//V5 verzó asdasd
//teszt elem V6
 require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { canUseLevel, getNoPermissionMessage } = require('./utilis/permissions');
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

client.once('clientReady', async () => {
    console.log(`Bot elindult: ${client.user.tag}`);
    await logInfo('bot elindult');
    try{
        await initDatabase();
        await createGuildRolesTable();
        for(const guild of client.guilds.cache.values()){
            await syncGuildRoles(guild);
        }
    }catch(error){
        console.error('adatbázis inicializási hiba:' , error);
        await logError(error, 'adatbázis inicializálási hiba');
    }
});

client.on('messageCreate', async (message) => {
    try {
        
        if (message.author.bot) return;
        if (!message.guild) return;
        try{
            await saveGuildUser(message.author);
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
            await message.reply(`Ismeretlen parancsot adtál meg: ${commandName}`);
            return;
        }

        const permissionLevel = command.permissionLevel || 'public';

        if (!canUseLevel(message.member, permissionLevel)) {
            await message.reply(getNoPermissionMessage(permissionLevel));
            return;
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
});

client.on('interactionCreate', async (interaction) => {
    try {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.guild) return;
        
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        const permissionLevel = command.permissionLevel || 'public';

        if (!canUseLevel(interaction.member, permissionLevel)) {
            await interaction.reply({
                content: getNoPermissionMessage(permissionLevel),
                ephemeral: true
            });
            return;
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
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
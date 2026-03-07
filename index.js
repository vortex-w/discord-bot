//V5 verzó asdasd
//teszt elem V6
require('dotenv').config();

const {Client, GatewayIntentBits, Collection} = require('discord.js');
const {canUseLevel, getNoPermissionMessage} = require('./utilis/permissions');

const client = new Client({
    intents:[
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
]

for (const command of allCommands){
    if(!command.name){
        console.log('Találtam egy hibás parancsot, nincs name mező.');
        continue;
    }
    client.commands.set(command.name, command);
}

client.once ('clientReady', () =>{
    console.log(`Bot elindult: ${client.user.tag}`);
});
client.on('messageCreate' , async(message) =>{
    try{
        if(message.author.bot) return;
        if(!message.guild) return;
        if(!message.content.startsWith('!')) return;
        const args = message.content.slice(1).trim().split(/\s+/);
        const CommandName = args.shift()?.toLowerCase();

        if(!CommandName) return;

        const command = client.commands.get(CommandName);
        if(!command){
            await message.reply(`Ismeretlen parancsot adtál meg: ${CommandName}`);
            return;
        }

        const permissionLevel = command.permissionLevel || 'public';

        if(!canUseLevel(message.member, permissionLevel)){
            await message.reply(getNoPermissionMessage(permissionLevel));
            return;
        }

        if(typeof command.prefix === 'function'){
            await command.prefix(message, args);
        }
    }catch(error){
        console.error("Hiba a messageCreate eseménynél:", error);
    }
});

client.on('interactionCreate', async (interaction) => {
    try{
        if(!interaction.isChatInputCommand()) return;
        if(!interaction.guild) return;
        const command = client.commands.get(interaction.commandName);
        if(!command) return;
        const permissionLevel = command.permissionLevel || 'public';
        if(!canUseLevel(interaction.member, permissionLevel)){
            await interaction.reply({
                content: getNoPermissionMessage(permissionLevel),
                ephemeral : true
            });
            return;
        }
        if (typeof command.slash === 'function') {
            await command.slash(interaction);
        }
    }catch (error) {
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
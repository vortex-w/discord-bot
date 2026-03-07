
require('dotenv').config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

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

const commands = [];

for (const command of allCommands) {
    if (!command.name || !command.description) {
        console.log('Találtam egy hibás slash parancsot, hiányzik a name vagy description mező.');
        continue;
    }

    commands.push(
        new SlashCommandBuilder()
            .setName(command.name)
            .setDescription(command.description)
            .toJSON()
    );
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

const clientId = '1479791177527201916';
const guildId = '1263387085872562186';

(async () => {
    try {
        console.log('Slash parancsok regisztrálása...');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        console.log('Sikeresen regisztrált parancsok.');
    } catch (error) {
        console.error(error);
    }
})();
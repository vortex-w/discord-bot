const { getCommandChannels } = require("../database/queries/commandChannels");


async function getCommandTargetChannel(message, commandName){
    let targetChannel = message.channel;

    const commandChannels = await getCommandChannels(message.guild.id, commandName);

    if(commandChannels && commandChannels.length > 0){
        const savedChannelId = commandChannels[0].channel_id;
        const foundChannel = await message.guild.channels.fetch(savedChannelId).catch(() => null);

        if(foundChannel){
            targetChannel = foundChannel;
        }
    }

    return targetChannel;
}

module.exports = {
    getCommandTargetChannel
};
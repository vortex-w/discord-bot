const { saveGuildChannel } = require("../database/queries/guildChannels");


async function syncGuildChannels(guild){
    if(!guild) return;

    await guild.channels.fetch();

    for(const channel of guild.channels.cache.values()){
        await saveGuildChannel({
            guildId: guild.id,
            channelId: channel.id,
            channelName: channel.name,
            channelType: String(channel.type),
            parentId: channel.parentId
        });
    }
}

module.exports = {
    syncGuildChannels
}
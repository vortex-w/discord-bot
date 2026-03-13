const { getRolePermissions } = require("../database/guildRoles");

function isBotOwner(userId){
    return userId === process.env.BOT_OWNER_ID;
}

function isGuildOwner(guild, userId){
    if(!guild) return false;
    return guild.ownerId === userId;
}

function isOwner(guild, userId){
    return isBotOwner(userId) || isGuildOwner(guild, userId);
}

function memberHasAnyRole(member, roleIds = []){
    if(!member || !member.roles || !member.roles.cache) return false;
    return roleIds.some(roleId => member.roles.cache.has(roleId));
}

async function getPermissionRoleIds(guildId, level){
    const rows = await getRolePermissions(guildId);
    return rows
        .filter(row => row.permission_level === level)
        .map(row => row.role_id);
}

async function isAdmin(member){
    if(!member || !member.guild) return false;

    if(isOwner(member.guild, member.id)) return true;

    const adminRoleIds = await getPermissionRoleIds(member.guild.id, 'admin');
    return memberHasAnyRole(member, adminRoleIds);
}

async function isMod(member){
    if(!member || !member.guild) return false;

    if(await isAdmin(member)) return true;

    const modRoleIds = await getPermissionRoleIds(member.guild.id, 'mod');
    return memberHasAnyRole(member, modRoleIds);
}

async function canUseLevel(member, level = 'public'){
    switch(level){
        case 'owner':
            return isOwner(member.guild, member.id);

        case 'admin':
            return await isAdmin(member);

        case 'mod':
            return await isMod(member);

        case 'public':
        default:
            return true;
    }
}

function getNoPermissionMessage(level = 'public'){
    switch(level){
        case 'owner':
            return 'Ehhez a parancshoz csak a bot tulajdonosa vagy a szerver tulajdonosa férhet hozzá!';
        case 'admin':
            return 'Ehhez a parancshoz admin jogosultság kell.';
        case 'mod':
            return 'Ehhez a parancshoz mod jogosultság kell.';
        default:
            return 'Ehhez a parancshoz nincs jogosultságod.';
    }
}

module.exports = {
    isBotOwner,
    isGuildOwner,
    isOwner,
    memberHasAnyRole,
    isAdmin,
    isMod,
    canUseLevel,
    getNoPermissionMessage
};
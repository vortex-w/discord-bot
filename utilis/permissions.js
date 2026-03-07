
function parseIdList(value){
    if(!value) return [];
    return value
        .split(',')
        .map(id =>id.trim())
        .filter(id => id !=='');
}

function getAdminRoleIds(){
    return parseIdList(process.env.ADMIN_ROLE_IDS);
}
function getModRoleIds(){
    return parseIdList(process.env.MOD_ROLE_IDS);
}

function isBotOwner(userId){
    return userId === process.env.BOT_OWNER_ID;

}
function isGuildOwner(guild, userId){
    if(!guild) return false;
    return guild.ownerId === userId;
}
function isOwner(guild,userId){
    return isBotOwner(userId) || isGuildOwner(guild, userId);
}

function memberHasAnyRole(member, RoleIds = []){
    if(!member || !member.roles || !member.roles.cache) return false;
    return RoleIds.some(roleId => member.roles.cache.has(roleId));
}

function isAdmin(member){
    if(!member || !member.guild)return false;

    if(isOwner(member.guild, member.id))return true;
    const adminRoleIds = getAdminRoleIds();
    return memberHasAnyRole(member, adminRoleIds);
}

function isMod(member){
    if (!member || !member.guild) return false;
    if (isAdmin(member)) return true;
    const modRoleIds = getModRoleIds();
    return memberHasAnyRole(member,modRoleIds);
}

function canUseLevel(member, level = 'public'){
    switch(level){
        case 'owner':
            return isOwner(member.guild, member.id);
        case'admin':
            return isAdmin(member);
        case 'mod':
            return isMod(member);
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
            return 'Ehhez a parancshoz mod jogosultság kell';
        default:
            return 'ehhez a parancshoz nincs jogosultságod.';

    }
}

module.exports = {
    parseIdList,
    getAdminRoleIds,
    getModRoleIds,
    isBotOwner,
    isGuildOwner,
    isOwner,
    memberHasAnyRole,
    isAdmin,
    isMod,
    canUseLevel,
    getNoPermissionMessage
}
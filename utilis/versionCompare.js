function parseVersion(v){
    const match = v.match(/V(\d+)\.(\d+)\.(\d+)/i);

    if(!match) return null;

    return {
        major: parseInt(match[1]),
        minor: parseInt(match[2]),
        patch: parseInt(match[3])
    };
}

function compareVersions(local, remote){
    const l = parseVersion(local);
    const r = parseVersion(remote);

    if(!l || !r){
        return { type: 'invalid' };
    }

    // major verzió különbség → nagy frissítés
    if(r.major > l.major){
        return { type: 'major' };
    }

    // minor különbség
    if(r.minor > l.minor){
        if(r.minor >= 4){
            return { type: 'recommended' };
        }
        return { type: 'minor' };
    }

    // patch különbség
    if(r.patch > l.patch){
        return { type: 'patch' };
    }

    return { type: 'same' };
}

module.exports = {
    compareVersions
};
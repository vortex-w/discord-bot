const fs = require('fs');

const commitMsgFile = process.argv[2];

if (!commitMsgFile) {
    console.log("Nincs commit message fájl.");
    process.exit(0);
}

const commitMessage = fs.readFileSync(commitMsgFile, 'utf8').trim();

const versionMatch = commitMessage.match(/V\d+\.\d+\.\d+/i);

if (!versionMatch) {
    console.log("Nincs verzió a commit üzenetben. version.json nem változott.");
    process.exit(0);
}

const version = versionMatch[0].toUpperCase();

const versionData = {
    version: version,
    updated_at: new Date().toISOString(),
    message: commitMessage
};

fs.writeFileSync(
    "version.json",
    JSON.stringify(versionData, null, 4),
    "utf8"
);

//console.log(`version.json frissítve: ${version}`);
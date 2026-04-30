const fs = require('fs');
const { execSync } = require('child_process');

const commitMessage = execSync('git log -1 --pretty=%B', {
    encoding: 'utf8'
}).trim();

const versionMatch = commitMessage.match(/V\d+\.\d+\.\d+/i);

if(!versionMatch){
    console.log("Nincs verzió a commit üzenetben.");
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

console.log("version.json frissítve:", version);
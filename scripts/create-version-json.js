const fs = require('fs');

const versionData = {
    version: "V1.0.1",
    updated_at: new Date().toISOString(),
    message: "Verzió információ",
    update_level: "none"
};

fs.writeFileSync(
    "version.json",
    JSON.stringify(versionData, null, 4),
    "utf8"
);

console.log("version.json frissítve.");
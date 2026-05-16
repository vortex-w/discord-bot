# discord-bot

Saját fejlesztésű Discord bot kvíz játékhoz, pontozáshoz, jutalmakhoz, jogosultságkezeléshez és verziófigyeléshez.

## Követelmények

- Node.js
- npm
- Discord bot token
- SQLite
- Git
- PM2 szerveres futtatáshoz

## Telepítés

A projekt letöltése:

```bash
git clone https://github.com/vortex-w/discord-bot.git
cd discord-bot
```

Függőségek telepítése:

```bash
npm install
```

## Környezeti változók beállítása

A projekt `.env` fájlt használ a titkos és gépenként eltérő adatok tárolására.

Fontos:

```text
.env          → valódi titkos adatok, NEM kerülhet GitHubra
.env.example  → minta fájl, ez mehet GitHubra
```

A projektben található `.env.example` fájlból hozz létre egy saját `.env` fájlt:

```bash
cp .env.example .env
```

Ezután szerkeszd a `.env` fájlt:

```bash
nano .env
```

Windows / Visual Studio Code alatt egyszerűen nyisd meg a `.env` fájlt és írd át az értékeket.

Példa valódi `.env` fájlra:

```env
DISCORD_TOKEN=IDE_JON_A_VALODI_DISCORD_BOT_TOKEN
BOT_OWNER_ID=IDE_JON_A_BOT_OWNER_DISCORD_ID
ADMIN_ROLE_IDS=
MOD_ROLE_IDS=
```

## `.env.example` fájl

GitHubra a valódi `.env` helyett csak a `.env.example` fájl kerüljön fel.

Javasolt `.env.example` tartalom:

```env
DISCORD_TOKEN=ide_jon_a_discord_bot_token
BOT_OWNER_ID=ide_jon_a_bot_owner_discord_id
ADMIN_ROLE_IDS=
MOD_ROLE_IDS=

# DISCORD_TOKEN = ide kerül a Discord bot token
# BOT_OWNER_ID = a bot létrehozójának Discord ID-je
# ADMIN_ROLE_IDS = admin rang ID-k vesszővel elválasztva
# MOD_ROLE_IDS = moderátor rang ID-k vesszővel elválasztva
#
# Példa több admin rangra:
# ADMIN_ROLE_IDS=111111111111111111,222222222222222222
#
# Példa egy mod rangra:
# MOD_ROLE_IDS=333333333333333333
```

Fontos szabályok `.env` fájlnál:

- ne legyen szóköz az `=` jel körül
- megjegyzéshez `#` jelet használj
- ne használj `//` megjegyzést `.env` fájlban
- a valódi bot tokent soha ne töltsd fel GitHubra
- a változó neve egyezzen a kódban használt `process.env.VALTOZO_NEV` névvel

Helyes példa:

```env
DISCORD_TOKEN=abc123token
BOT_OWNER_ID=869922953918312468
```

Helytelen példa:

```env
DISCORD_TOKEN = "abc123token"
BOT_OWNER_ID = 869922953918312468 // létrehozó discord id
```

## `.gitignore` fájl

A projekt gyökerében legyen egy `.gitignore` fájl.

Javasolt tartalom:

```gitignore
.env
node_modules/
npm-debug.log
database/bot.sqlite
```

Ez megakadályozza, hogy a titkos `.env`, a `node_modules`, valamint a helyi SQLite adatbázis felkerüljön GitHubra.

## GitHubra feltöltés biztonságosan

GitHubra mehet:

```text
.env.example
.gitignore
package.json
package-lock.json
index.js
commands/
database/
events/
game/
utilis/
README.md
version.json
```

GitHubra ne menjen fel:

```text
.env
node_modules/
database/bot.sqlite
```

Ha a `.env` fájl véletlenül már bekerült a Git követésbe, akkor ezzel lehet kivenni:

```bash
git rm --cached .env
```

Ez nem törli a gépről a `.env` fájlt, csak a Git követésből veszi ki.

Ha az adatbázis is bekerült a Git követésbe, akkor ezt is ki lehet venni:

```bash
git rm --cached database/bot.sqlite
```

Ezután:

```bash
git add .gitignore .env.example README.md
git commit -m "Add env example and ignore real env"
git push
```

Ha a valódi Discord token egyszer már felkerült GitHubra, akkor azt biztonsági okból újra kell generálni a Discord Developer Portalon.

## A bot indítása fejlesztés közben

Fejlesztői indítás:

```bash
node index.js
```

Ha minden rendben van, a bot bejelentkezik Discordra.

Első indításkor a bot automatikusan létrehozza és előkészíti az SQLite adatbázist:

```text
database/bot.sqlite
```

## Indítás PM2-vel szerveren

Szerveren ajánlott PM2-vel futtatni.

Telepítés, ha még nincs fent:

```bash
npm install -g pm2
```

Indítás:

```bash
pm2 start index.js --name discord-bot
```

Állapot ellenőrzése:

```bash
pm2 list
```

Napló megtekintése:

```bash
pm2 logs discord-bot --lines 100
```

Újraindítás:

```bash
pm2 restart discord-bot
```

Leállítás / törlés PM2-ből:

```bash
pm2 delete discord-bot
```

Automatikus indulás szerver újraindítás után:

```bash
pm2 startup
pm2 save
```

## Tesztelés meglévő bot mellett

Ha egy meglévő bot mellett akarod tesztelni, akkor külön mappába és külön PM2 névvel indítsd.

Példa:

```bash
cd /home/agocska
git clone https://github.com/vortex-w/discord-bot.git discord-bot-test
cd discord-bot-test
npm install
cp .env.example .env
nano .env
pm2 start index.js --name discord-bot-test
```

Így nem nyúl hozzá a már meglévő bothoz.

Fontos:

- ne ugyanabba a mappába rakd, ahol a régi bot van
- ne ugyanazzal a PM2 névvel indítsd
- ne ugyanazt a SQLite adatbázist használja
- ugyanazt a Discord bot tokent ne futtasd egyszerre két külön példányban

Példa biztonságos felépítésre:

```text
/home/agocska/regi-bot
/home/agocska/discord-bot-test
```

PM2 nevek:

```text
regi-bot
discord-bot-test
```

## Discord bot meghívása

A botot Discord Developer Portalon keresztül kell meghívni a szerverre.

Szükséges jogosultságok:

- üzenetek olvasása
- üzenetek küldése
- üzenetelőzmények olvasása
- fájlok csatolása
- linkek beágyazása
- üzenetek kezelése, ha a botnak törölnie kell a parancsüzeneteket

A kvíz képes/gombos megjelenítéséhez különösen fontos:

- Attach Files
- Embed Links
- Read Message History
- Send Messages
- Manage Messages, ha a bot törölhet parancsüzeneteket

## Jogosultságkezelés

A bot saját jogosultsági rendszert használ.

Alap szintek:

- public
- mod
- admin
- owner

A rangok adatbázisból rendelhetők jogosultsági szintekhez.

Emellett külön felhasználók is kaphatnak hozzáférést adott parancsokhoz.

A parancsok elérhetőségét a bot futás közben ellenőrzi.

A jogosultsági rendszer figyelembe veheti:

- bot tulajdonosát
- szerver tulajdonosát
- admin rangokat
- mod rangokat
- egyedi felhasználói parancsengedélyeket

A környezeti változókban megadható rang ID-k:

```env
ADMIN_ROLE_IDS=
MOD_ROLE_IDS=
```

Több rang ID vesszővel választható el:

```env
ADMIN_ROLE_IDS=111111111111111111,222222222222222222
MOD_ROLE_IDS=333333333333333333
```

## Parancsok

A pontos parancslista Discordon kérhető le:

```text
!parancsok
```

Ez a parancs a felhasználó jogosultsági szintje alapján listázza az elérhető parancsokat.

## Kvíz játék

A bot képes fotós, gombos kvízjátékot létrehozni.

Alap használat:

```text
!quiz-game kérdés; idő; válasz1[true]; válasz2; válasz3
```

Példa:

```text
!quiz-game Mi 2+2?; 18:00:00; 3; 4[true]; 5
```

Fontos:

- legalább 3 válasz szükséges
- legalább 1 helyes válasz szükséges `[true]` jelöléssel
- a parancshoz képet kell csatolni
- a válaszok Discord gombként jelennek meg
- a pontozás a kvíz lezárásakor történik

A kvíz lezárásakor a bot:

- lezárja az aktív szavazást
- letiltja a gombokat
- összesíti a válaszokat
- megjeleníti a helyes választ / válaszokat
- pontot ad a helyesen válaszoló felhasználóknak

## Pontozás és jutalmak

A bot eltárolja a kvízválaszokat, majd a helyes válaszok alapján pontokat oszt.

A jutalomrendszer adatbázisban tárolja:

- az elérhető jutalmakat
- a jutalmak pontköltségét
- a jutalom létrehozóját
- a felhasználók pontjait

A pontos használat Discordon kérhető le:

```text
!parancsok
```

## Csatornához rendelés

Bizonyos parancsok adott csatornához rendelhetők.

Példa:

```text
!setcsatorna add #csatorna parancsnév
```

Ezután az adott parancs válasza a beállított csatornába kerülhet.

Ez akkor hasznos, ha például:

- a kvízek mindig egy adott csatornába menjenek
- a logok külön csatornába kerüljenek
- a jutalom vagy pontozás válaszai külön helyre kerüljenek

## Verziókezelés

A bot rendelkezik GitHub alapú verziófigyeléssel.

A GitHubon található `version.json` alapján összehasonlítja:

- a helyi, adatbázisban tárolt verziót
- a GitHubon elérhető verziót

A verzió lekérdezhető Discordon:

```text
!verzio
```

Ha ajánlott vagy nagyobb frissítés érhető el, a bot értesítést küldhet a szerver tulajdonosának privát üzenetben.

Ha ez nem sikerül, csatornába próbál üzenetet küldeni.

## Fejlesztői verziófrissítés

A verzió információ a commit üzenet alapján frissíthető.

Példa commit üzenet:

```text
V1.0.2 verziókezelés javítása
```

A hook frissíti a `version.json` fájlt, amelyet GitHubra feltöltve a bot később le tud kérni.

## Adatbázis

A bot SQLite adatbázist használ.

Fő adatbázis fájl:

```text
database/bot.sqlite
```

Az adatbázis táblái induláskor automatikusan létrejönnek, ha még nem léteznek.

Fontos:

A `database/bot.sqlite` fájl általában ne kerüljön fel GitHubra, mert szerverenként eltérő adatokat tartalmazhat.

Ha szeretnéd kizárni GitHubról, akkor a `.gitignore` fájlba ez kerüljön:

```gitignore
database/bot.sqlite
```

## Projekt szerkezete

```text
commands/
database/
events/
game/
utilis/
index.js
package.json
package-lock.json
.env.example
.gitignore
README.md
version.json
```

## Gyakori hibák

### Cannot find module 'dotenv'

A `dotenv` csomag nincs telepítve.

Megoldás:

```bash
npm install dotenv
```

Vagy az összes függőség telepítése:

```bash
npm install
```

### `.env` fájl hiányzik

Ha a bot nem találja a környezeti változókat, ellenőrizd, hogy létezik-e a `.env` fájl.

Linuxon:

```bash
ls -la
```

Ha nincs `.env`, akkor:

```bash
cp .env.example .env
nano .env
```

### DISCORD_TOKEN hiányzik

Ha a bot nem tud bejelentkezni, ellenőrizd, hogy a `.env` fájlban benne van-e:

```env
DISCORD_TOKEN=valodi_bot_token
```

A kódban pedig ennek megfelelően legyen használva:

```js
process.env.DISCORD_TOKEN
```

### SQLITE_BUSY: database is locked

Ez akkor fordulhat elő, ha az adatbázist egyszerre több művelet írja, vagy egy külső program nyitva tartja.

Megoldás:

- zárd be az adatbázist használó külső programot
- ellenőrizd, nem fut-e több bot példány ugyanazzal az adatbázissal
- PM2-ben nézd meg a futó példányokat:

```bash
pm2 list
```

### Missing Permissions

A botnak nincs megfelelő jogosultsága az adott csatornában.

Ellenőrizni kell:

- bot szerepkör jogosultságait
- csatorna jogosultságait
- a bot rangja magasabban van-e, mint amit kezelni akar
- tud-e üzenetet küldeni az adott csatornába
- tud-e fájlt csatolni
- tud-e embed üzenetet küldeni

### Unknown interaction

Discord interaction esetén túl későn válaszolt a bot.

Gomboknál és slash parancsoknál gyors válasz vagy `deferReply()` szükséges.

### PM2 too many unstable restarts

Ha ezt látod:

```text
PM2 | Script index.js had too many unstable restarts. Stopped. "errored"
```

A bot indulás után azonnal összeomlik.

A valódi hiba megtekintése:

```bash
pm2 logs discord-bot --lines 100
```

Vagy PM2 nélkül:

```bash
node index.js
```

A PM2 üzenete önmagában nem a valódi hiba, csak azt jelzi, hogy a bot sokszor újraindult és leállt.

### Cannot find module

Ha például ezt látod:

```text
Error: Cannot find module 'discord.js'
```

A függőségek nincsenek telepítve.

Megoldás:

```bash
npm install
```

### Ugyanaz a bot token több helyen fut

Ha ugyanazt a Discord bot tokent két külön szerveren vagy két külön PM2 folyamatban futtatod, akkor a bot példányok zavarhatják egymást.

Megoldás:

- egy tokenhez csak egy futó bot példány tartozzon
- teszthez használj külön Discord alkalmazást / külön bot tokent
- PM2-ben ellenőrizd a futó folyamatokat:

```bash
pm2 list
```

## Megjegyzés

A projekt aktív fejlesztés alatt áll.

A `.env` fájlt mindig helyileg kell létrehozni

A `.env.example` csak minta, abban nem lehet valódi token vagy titkos adat.
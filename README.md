# discord-bot

Saját fejlesztésű Discord bot kvíz játékhoz, pontozáshoz, jutalmakhoz, jogosultságkezeléshez és verziófigyeléshez.

## Követelmények

- Node.js
- npm
- Discord bot token
- SQLite

## Telepítés

A projekt letöltése:

git clone https://github.com/vortex-w/discord-bot.git  
cd discord-bot

Függőségek telepítése:

npm install

A projekt gyökerében hozz létre egy `.env` fájlt:

DISCORD_TOKEN=BOT_TOKEN  
BOT_OWNER_ID=SAJAT_DISCORD_ID

A bot indítása:

node index.js

Első indításkor a bot automatikusan létrehozza és előkészíti az SQLite adatbázist:

database/bot.sqlite

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

## Jogosultságkezelés

A bot saját jogosultsági rendszert használ.

Alap szintek:

- public
- mod
- admin
- owner

A rangok adatbázisból rendelhetők jogosultsági szintekhez. Emellett külön felhasználók is kaphatnak hozzáférést adott parancsokhoz.

A parancsok elérhetőségét a bot futás közben ellenőrzi.

## Parancsok

A pontos parancslista Discordon kérhető le:

!parancsok

Ez a parancs a felhasználó jogosultsági szintje alapján listázza az elérhető parancsokat.

## Kvíz játék

A bot képes fotós, gombos kvízjátékot létrehozni.

Alap használat:

!quiz-game kérdés; idő; válasz1[true]; válasz2; válasz3

Példa:

!quiz-game Mi 2+2?; 18:00:00; 3; 4[true]; 5

Fontos:

- legalább 3 válasz szükséges
- legalább 1 helyes válasz szükséges `[true]` jelöléssel
- a parancshoz képet kell csatolni
- a válaszok Discord gombként jelennek meg
- a pontozás a kvíz lezárásakor történik

## Pontozás és jutalmak

A bot eltárolja a kvízválaszokat, majd a helyes válaszok alapján pontokat oszt.

A jutalomrendszer adatbázisban tárolja az elérhető jutalmakat, azok pontköltségét és a hozzájuk tartozó létrehozót.

A pontos használat Discordon kérhető le:

!parancsok

## Csatornához rendelés

Bizonyos parancsok adott csatornához rendelhetők.

Példa:

!setcsatorna add #csatorna parancsnév

Ezután az adott parancs válasza a beállított csatornába kerülhet.

## Verziókezelés

A bot rendelkezik GitHub alapú verziófigyeléssel.

A GitHubon található `version.json` alapján összehasonlítja:

- a helyi, adatbázisban tárolt verziót
- a GitHubon elérhető verziót

A verzió lekérdezhető Discordon:

!verzio

Ha ajánlott vagy nagyobb frissítés érhető el, a bot értesítést küld a szerver tulajdonosának privát üzenetben. Ha ez nem sikerül, csatornába próbál üzenetet küldeni.

## Fejlesztői verziófrissítés

A verzió információ a commit üzenet alapján frissíthető.

Példa commit üzenet:

V1.0.2 verziókezelés javítása

A hook frissíti a `version.json` fájlt, amelyet GitHubra feltöltve a bot később le tud kérni.

## Adatbázis

A bot SQLite adatbázist használ.

Fő adatbázis fájl:

database/bot.sqlite

Az adatbázis táblái induláskor automatikusan létrejönnek, ha még nem léteznek.

## Gyakori hibák

SQLITE_BUSY: database is locked

Ez akkor fordulhat elő, ha az adatbázist egyszerre több művelet írja, vagy egy külső program nyitva tartja.

Missing Permissions

A botnak nincs megfelelő jogosultsága az adott csatornában. Ellenőrizni kell a csatorna és a bot szerepkör jogosultságait.

Unknown interaction

Discord interaction esetén túl későn válaszolt a bot. Gomboknál és slash parancsoknál gyors válasz vagy `deferReply()` szükséges.

## Projekt szerkezete

commands/  
database/  
events/  
game/  
utilis/  
index.js

## Megjegyzés

A projekt aktív fejlesztés alatt áll.
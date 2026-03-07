module.exports = async function kopapirollo(message, client){
    if(!message.mentions.has(client.user)) return false;

    const content = message.content.toLowerCase();
    let userChoice = null;
    if(content.includes('ko') || content.includes('kő')) userChoice= 'ko';
    if(content.includes('papir') || content.includes('papír')) userChoice = 'papir';
    if(content.includes('ollo') || content.includes('olló')) userChoice = 'ollo';

    if(!userChoice) return false;
    const botChoices = ['ko', 'papir', 'ollo'];
    const botChoice = botChoices[Math.floor(Math.random() * botChoices.length)];

    const names = {
        ko : 'Kő',
        papir: 'Papír',
        ollo: 'Olló'
    };
    let result;
    if(userChoice === botChoice){
        result = 'Döntetlen';

    }
    else if(
        (userChoice === 'ko' && botChoice==='ollo')||
        (userChoice==='papir' && botChoice==='ko')||
        (userChoice==='ollo' && botChoice==='papir')
    ){
        result = 'Nyertél ';
    }else{
        result = 'A bot nyert!';
    }
    await message.reply(
        `Te: **${names[userChoice]}**\n`+
        `Én: **${names[botChoice]}**\n`+
        `Eredmény: **${result}**`
    );
    return true;
}
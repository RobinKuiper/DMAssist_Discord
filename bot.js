var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var firebase = require('firebase')

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

// Initialize Firebase
const config = {
  apiKey: "AIzaSyDr2iBwOXrZ4Ec1sykHI47Zmx3tUdi7LpU",
  authDomain: "dndassist-2870c.firebaseapp.com",
  databaseURL: "https://dndassist-2870c.firebaseio.com",
  projectId: "dndassist-2870c",
  storageBucket: "dndassist-2870c.appspot.com",
  messagingSenderId: "987962337354"
};
firebase.initializeApp(config);
let database = firebase.database();

// Load Monsters
let monsters = []
database.ref('monster_data').on('child_added', snapshot => {
    let monster = snapshot.val()
    monster.key = snapshot.key
    monsters.push(monster)
})

// Load Spells
let spells = []
database.ref('spell_data').on('child_added', snapshot => {
    let spell = snapshot.val()
    spell.key = snapshot.key
    spells.push(spell)
})

// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});
bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ' + bot.username + ' - (' + bot.id + ')');
});

bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) == '#') {
        var args = message.substring(1).split(' ');
        var cmd = args[0];

        let query, result
       
        args = args.splice(1);
        switch(cmd) {
            case 'noob':
                bot.sendMessage({
                    to: channelID,
                    message: 'JORDY!'
                })
            break;

            case 'author': case 'owner':
                bot.sendMessage({
                    to: channelID,
                    message: 'Robin Kuiper (robingjkuiper@gmail.com) - http://robinkuiper.eu'
                })
            break;

            case 'dice': case 'roll':
                let d = args[0].replace('d', ' ').replace('D', ' ').replace('+', ' ').split(' ')
                let multiplier = d[0], dice = d[1], modifier = d[2]

                let message = 'Throwing ' + multiplier + 'D' + dice
                if(modifier) message += '+' + modifier

                bot.sendMessage({
                    to: channelID,
                    message: message
                })

                let math = Dice.roll(multiplier, dice) * 1
                if(modifier) math += modifier * 1
                bot.sendMessage({
                    to: channelID,
                    message: '**' + math + '**'
                })
            break;

            case 'link': case 'url':
                bot.sendMessage({
                    to: channelID,
                    message: 'https://dmassist.eu/'
                })
            break;

            case 'stage': case 'staging': case 'dev': case 'development':
                bot.sendMessage({
                    to: channelID,
                    message: 'https://staging.dmassist.eu/'
                })
            break;

            case 'monster': case 'm':
                query = args.join(' ');
                result = searchMonster(query)

                if(result.length === 0){
                    bot.sendMessage({
                        to: channelID,
                        message: "Couldn't find monster: " + args[0]
                    })
                }else if(result.length === 1){
                    let monster = result[0]
                    bot.sendMessage({
                        to: channelID,
                        message: MonsterLayout(monster)
                    })
                }else{
                    let message = 'Multiple result found, which one do you seek?\n'

                    result.forEach(monster => {
                        message += monster.name + '\n'
                    })

                    bot.sendMessage({
                        to: channelID,
                        message: message
                    })
                }
            break;

            case 'spell': case 's':
                query = args.join(' ');
                result = searchSpell(query)

                if(result.length === 0){
                    bot.sendMessage({
                        to: channelID,
                        message: "Couldn't find spell: " + args[0]
                    })
                }else if(result.length === 1){
                    let spell = result[0]
                    bot.sendMessage({
                        to: channelID,
                        message: SpellLayout(spell)
                    })
                }else{
                    let message = 'Multiple spells found, which one do you seek?\n'

                    result.forEach(spell => {
                        message += spell.name + '\n'
                    })

                    bot.sendMessage({
                        to: channelID,
                        message: message
                    })
                }
            break;
            // Just add any case commands if you want to..
         }
     }
});

const searchMonster = (query) => monsters.filter((monster) => monster.name.toLowerCase().includes(query.toLowerCase()) )
const searchSpell = (query) => spells.filter((spell) => spell.name.toLowerCase().includes(query.toLowerCase()) )
const formatCR = (cr) => (cr === 0.125) ? '1/8' : (cr === 0.25) ? '1/4' : (cr === 0.5) ? '1/2' : cr
const formatNumber = (number) => number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

const MonsterLayout = (monster) => {
    let layout = '**' + monster.name + '**\n'
    layout += '*' + monster.alignment + ' ' + monster.size + ' ' + monster.type + '*'
    layout += (monster.subtype) ? '*(' + monster.subtype + ')*\n\n' : '\n\n'
    layout += '**Armor Class** ' + monster.armor_class + ' \n **Hit Points:** ' + monster.hit_points + '\n'
    layout += '**Speed** ' + monster.speed + '\n'
    layout += '**Languages** ' + monster.languages + '\n'
    layout += '**Challenge Rating** ' + formatCR(monster.challenge_rating) + ' (' + CRtoEXP(monster.challenge_rating) + 'XP)\n\n'
    layout += 'More: http://www.dmassist.eu/monster/' + monster.slug

    return layout
}

const SpellLayout = (spell) => {
    let layout = '**' + spell.name + '**\n'
    layout += '*' + formatSpellLevel(spell.level, 'level') + ' ' + spell.school + '*\n\n'
    layout += '**Casting Time:** ' + spell.casting_time + '\n'
    layout += '**Range** ' + formatSpellRange(spell.range) + '\n'
    layout += '**Duraction** ' + spell.duration + '\n\n' 
    layout += '**Classes** ' + spell.classes.join(', ') + '\n\n'
    layout += '**Components** ' + spell.components.join(', ')
    layout += (spell.material) ? ' (' + spell.material + ')\n\n' : '\n\n'
    layout += spell.desc.replace(/<\/?[^>]+(>|$)/g, "") + '\n\n'
    if(spell.higher_level) layout += '**At Higher Levels** ' + spell.higher_level.replace(/<\/?[^>]+(>|$)/g, "") + '\n\n'
    layout += 'More: https://www.dmassist.eu/spell/' + spell.slug

    return layout
}

const CRtoEXP = (cr) => {
  var crToExp = {
    0: 10,
    0.125: 25,
    0.25: 50,
    0.5: 100,
    1: 200,
    2: 450,
    3: 700,
    4: 1100,
    5: 1800,
    6: 2300,
    7: 2900,
    8: 3900,
    9: 5000,
    10: 5900,
    11: 7200,
    12: 8400,
    13: 10000,
    14: 11500,
    15: 13000,
    16: 15000,
    17: 18000,
    18: 20000,
    19: 22000,
    20: 25000,
    21: 33000,
    22: 41000,
    23: 50000,
    24: 62000,
    25: 75000,
    26: 90000,
    27: 105000,
    28: 120000,
    29: 135000,
    30: 155000
  }

  return formatNumber(crToExp[cr])
}

const formatSpellLevel = (level, prefix='') => {
  switch(level){
    case 0: return 'Cantrip';
    case 1: return level + 'st ' + prefix;
    case 2: return level + 'nd ' + prefix;
    case 3: return level + 'rd ' + prefix;
    default: return level + 'th ' + prefix;
  }
}

const formatSpellRange = (range) => {
  switch(range) {
    case 0: return 'Self'
    case -1: return 'CHANGE'
    case -2: return 'CHANGE'
    case -3: return 'CHANGE'
    case -4: return 'CHANGE'
    case -5: return 'Touch'
    case 2222: return '1 Mile'
    case 5555: return '500 Miles'
    default: return range + ' feet'
  }
}

const calculateMod = (score) => {
  var mod = Math.floor((score-10)/2);
  var formatted = (mod > 0) ? '+' + mod : mod
  return { mod, formatted }
}

const Dice = {
  roll: (multiplier, dice) => {
    let result = 0;
    let random = () => {
      return Math.floor(Math.random() * dice) + 1;
    }
    for (var i = 0; i < multiplier; i++) {
      result += random();
    }

    return result;
  }
}
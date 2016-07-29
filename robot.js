var Botkit = require('botkit');
var giphy = require('./giphy');
var stats = require('./stats');

//environment
var BOT_MASTER        = process.env.BOT_MASTER;
var SLACK_TOKEN       = process.env.SLACK_TOKEN;
var BOT_DEBUG         = !!process.env.BOT_DEBUG;

var GLOBAL_THRESHOLD  = process.env.GLOBAL_THRESHOLD;

if( !SLACK_TOKEN ){
  console.log('Error: Specify SLACK_TOKEN in environment');
  process.exit(1);
}

//per channel statistics
var channel_stats = {};
function getOfCreateChannelStats(bot, aGiphy){
  var channel = aGiphy.channel();

  if(!channel_stats[channel]){
    channel_stats[channel] = stats({
      threshold: GLOBAL_THRESHOLD
    });

    var aChanStats = channel_stats[channel];
    channel_stats[channel].onLevelUp(function(){
      bot.say({
        text: toLevelUpMessage(aChanStats),
        channel: channel
      });
    });
  }

  return channel_stats[channel];
}

var controller = Botkit.slackbot({
  debug: BOT_DEBUG
});

// connect the bot to a stream of messages
controller.spawn({
  token: SLACK_TOKEN,
}).startRTM()

// Reset statistics
controller.hears('^\s*(reset)\s*$',['direct_mention'],onReset);
controller.hears('^\s*(reset)\s*$',['direct_message'],onReset);

// Track latest giphy and record stats
controller.hears('\/giphy (.*)',['message_received', 'direct_message', 'ambient'],onGiphy);

//handlers
function onReset(bot,message) {
  if( message.user === BOT_MASTER ){
    bot.reply(message,'Ok... reseting all stats.');
    Object.keys(channel_stats).forEach(function(chan_stat){
      chan_stat.reset();
    })
  }
  else{
    bot.reply(message, 'You are not my master. I do what I want!');
  }
}

function onGiphy(bot,message) {
  console.log("Saw a giphy...");
  var aGiphy = giphy.fromMessage(message);
  getOfCreateChannelStats(bot, aGiphy).up();
}

//messages
function toLevelUpMessage(aChanStats){
  return `*Level Up!*
This channel is now at level *${aChanStats.level}*
Currently producing giphys at *${aChanStats.rate()} gpm*
`
}

var Botkit = require('botkit');
var Promise = require('promise');
var mixin = require('mixin-object');

var giphy = require('./giphy');
var stats = require('./stats');

//environment
var BOT_MASTER        = process.env.BOT_MASTER;
var SLACK_TOKEN       = process.env.SLACK_TOKEN;
var BOT_DEBUG         = (process.env.BOT_DEBUG==='true');

var GLOBAL_THRESHOLD  = process.env.GLOBAL_THRESHOLD;

if( !SLACK_TOKEN ){
  console.log('Error: Specify SLACK_TOKEN in environment');
  process.exit(1);
}

//per channel statistics
var channel_stats = {};
function getOfCreateChannelStats(bot, aGiphy){
  return channel_stats[aGiphy.channel()] ?
    Promise.resolve(channel_stats[aGiphy.channel()]) : createChannelStats(bot, aGiphy);
}

function createChannelStats(bot, aGiphy){
  return new Promise(function(resolve){
    var channel = aGiphy.channel();

    //see if we have data saved for this channel and start from there
    controller.storage.channels.get(channel, function(err, channelData){
      var savedState = channelData || {};

      var aChanStats = stats(mixin({
        threshold: GLOBAL_THRESHOLD
      }, savedState.stats));

      aChanStats.onLevelUp(function(){
        bot.say({
          text: toChannelLevelUpMessage(aChanStats),
          channel: channel
        });
      });

      channel_stats[channel] = aChanStats;
      resolve(aChanStats);
    });
  });
}

//per user statistics
var user_stats = {};
function getOfCreateUserStats(bot, aGiphy){
  return user_stats[aGiphy.user()] ?
    Promise.resolve(user_stats[aGiphy.user()]) : createUserStats(bot, aGiphy);
}

function createUserStats(bot, aGiphy){
  return new Promise(function(resolve){
    var user = aGiphy.user();
    controller.storage.users.get(user, function(err, userData){
      var savedState = userData || {};

      var aUserStats = stats(mixin({
        threshold: GLOBAL_THRESHOLD
      }, savedState.stats));

      aUserStats.onLevelUp(function(){
        bot.say({
          text: toUserLevelUpMessage(user, aUserStats),
          channel: aGiphy.channel()
        });
      });
      user_stats[user] = aUserStats;
      resolve(aUserStats);
    });
  });
}

var controller = Botkit.slackbot({
  debug: BOT_DEBUG,
  json_file_store: './data'
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
  getOfCreateChannelStats(bot, aGiphy).then(function(chanStats){
    chanStats.up();
    controller.storage.channels.save({
        id: aGiphy.channel(),
        stats: chanStats.summary()
      }, function(err){
        if(err){
          console.error("Failed to save channel stats!", err);
        }
      });
  });

  getOfCreateUserStats(bot, aGiphy).then(function(userStats){
    userStats.up();
    controller.storage.users.save({
        id: aGiphy.user(),
        stats: userStats.summary()
      }, function(err){
        if(err){
          console.error("Failed to save user stats!", err);
        }
      });
  });
}

//messages
function toChannelLevelUpMessage(aChanStats){
  return `*Level Up!*
This channel is now at level *${aChanStats.level}*
Currently producing giphys at *${aChanStats.rate()} gpm*
`
}

function toUserLevelUpMessage(user, aUserStats){
  return `*Level Up!*
*${user}* is now at level *${aUserStats.level}*
Currently producing giphys at *${aUserStats.rate()} gpm*
`
}

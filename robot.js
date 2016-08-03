var Botkit = require('botkit');
var Promise = require('promise');
var mixin = require('mixin-object');
var AsciiTable = require('ascii-table')

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
function getOrCreateChannelStats(bot, aGiphy){
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
        console.log("Sending level up message", aChanStats, channel);
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
function getOrCreateUserStats(bot, aGiphy){
  var userID = aGiphy.user().id;
  return user_stats[userID] ?
    Promise.resolve(user_stats[userID]) : createUserStats(bot, aGiphy);
}

function createUserStats(bot, aGiphy){
  return new Promise(function(resolve){
    var user = aGiphy.user();
    controller.storage.users.get(user.id, function(err, userData){
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
      user_stats[user.name] = aUserStats;
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
}).startRTM(function (err, bot) {
    if (err) {
        throw new Error(err);
    }

    // @ https://api.slack.com/methods/users.list
    bot.api.users.list({}, function (err, response) {
        if (response.hasOwnProperty('members') && response.ok) {
            var total = response.members.length;
            for (var i = 0; i < total; i++) {
                var member = response.members[i];
                console.log({name: member.name, id: member.id});
            }
        }
    });
});

//Load games stored data
controller.storage.users.all(function(err, all_user_data) {
  all_user_data = all_user_data || [];
  all_user_data.forEach(function(user_data){
    user_stats[user_data.name] = stats(mixin({
      threshold: GLOBAL_THRESHOLD
    }, user_data.stats));
  })
});


// Reset statistics
controller.hears('^\s*(reset)\s*$',['direct_mention'],secure(onReset));
controller.hears('^\s*(reset)\s*$',['direct_message'],secure(onReset));

// Leaderboard
controller.hears('^\s*(leaderboard)\s*$',['direct_mention'],secure(onLeaderboard));
controller.hears('^\s*(leaderboard)\s*$',['direct_message'],secure(onLeaderboard));

// Track latest giphy and record stats
controller.hears('\/giphy (.*)',['message_received', 'direct_message', 'ambient'],onGiphy);

function secure(handler) {
  return function(bot,message){
    if( message.user === BOT_MASTER ){
      handler.call(this, bot, message);
    }
    else{
      bot.reply(message, 'You are not my master. I do what I want!');
    }
  }
}

//handlers
function onReset(bot,message) {
  bot.reply(message,'Ok... reseting all stats.');
  Object.keys(channel_stats).forEach(function(chan_stat){
    chan_stat.reset();
  })
}

function onLeaderboard(bot, message) {

  bot.reply(message,toLeaderBoardMessage(user_stats));
}

function onGiphy(bot,message) {
  console.log("Saw a giphy...");
  var aGiphy = giphy.fromMessage(message);
  getOrCreateChannelStats(bot, aGiphy).then(function(chanStats){
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

  getOrCreateUserStats(bot, aGiphy).then(function(userStats){
    userStats.up();
    controller.storage.users.save({
        id: aGiphy.user().id,
        name: aGiphy.user().name,
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
Currently producing giphys at *${Math.round(aChanStats.rate() * 100) / 100} gpm*
`
}

function toUserLevelUpMessage(user, aUserStats){
  return `*Level Up!*
<@${user.id}> is now at level *${aUserStats.level}*
Currently producing giphys at *${Math.round(aUserStats.rate() * 100) / 100} gpm*
`
}

function toLeaderBoardMessage(user_stats){
  var table = new AsciiTable();
  table.setAlign(0, AsciiTable.RIGHT)
    .setAlign(1, AsciiTable.LEFT)
    .setAlign(2, AsciiTable.RIGHT);

  Object.keys(user_stats).map(function(aUser){
    return {id: aUser, stat: user_stats[aUser]};
  }).sort(function(userA, userB){
    return userB.stat.points - userA.stat.points;
  }).forEach(function(user, idx){
    table.addRow(idx+1, `<@${user.id}>`, `${user.stat.points} pts`)
  });

  table.removeBorder();

  var message =  {attachments: [{
    fallback: "Visit channel for current standings.",
    pretext: "*Current Standings*",
    text: '```\u200b'+table.toString()+'```',
    color: '#FD6729',
    thumb_url: "http://www.betbattle.com/wp-content/uploads/2014/05/leaderboard.png",
    mrkdwn_in: ["text", "pretext"]
  }]};

  console.log( "Leaderboard Message", message);
  return message;
}

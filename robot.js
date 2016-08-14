var Botkit = require('botkit');
var Promise = require('promise');
var mixin = require('mixin-object');

var store = require('./lib/models/index');

//missions
var StandardMission = require('./lib/missions/standard');
var MatchTheGiphyMission = require('./lib/missions/giphy_match');

//environment
var BOT_MASTER        = process.env.BOT_MASTER;
var SLACK_TOKEN       = process.env.SLACK_TOKEN;
var BOT_DEBUG         = (process.env.BOT_DEBUG==='true');

var GLOBAL_THRESHOLD  = process.env.GLOBAL_THRESHOLD;

if( !SLACK_TOKEN ){
  console.log('Error: Specify SLACK_TOKEN in environment');
  process.exit(1);
}

var controller = Botkit.slackbot({
  debug: BOT_DEBUG
});

var slack_users; //set up after a spawn

// connect the bot to a stream of messages
controller.spawn({token: SLACK_TOKEN,}).startRTM(
  function (err, bot) {
    if (err) {
        throw new Error(err);
    }
    slack_users = require('./lib/slack/users')(bot);
  }
);

// Settings
controller.hears('^\s*settings\s*(.*)$',['direct_mention'],secure(onSettings));

// Leaderboard
controller.hears('^\s*leaderboard\s*$',['direct_mention'],secure(onLeaderboard));

// Track latest giphy and record stats
controller.hears('\/giphy (.*)',['message_received', 'direct_message', 'mention', 'ambient'],onGiphy);

// Current challenge
controller.hears('^\s*show challenge\s*$',['direct_mention'],onShowChallenge);
controller.hears('^\s*reset challenge\s*$',['direct_mention'],onResetChallenge);

// End current game
controller.hears('^\s*end game\s*$',['direct_mention'],secure(onEndGame));

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
function onGiphy(bot,message) {
  console.log("Got a giphy...", message);
  store.Game.forChannel(message.channel).then(
    function(game){
        //start or get current game
        if(game.isNew()){
          bot.reply(message,"Game is on baby!");
          console.log("Starting game...", game);
          game.start();
          game.save();

          //start missions
          StandardMission.for(game).start(bot.reply.bind(bot, message));
          MatchTheGiphyMission.for(game).start(bot.reply.bind(bot, message));
        }
        console.log("Playing game " + game.get('id'));
        return game;
    }
  ).then(
    function(game){
      return store.Player.getOrCreate(message.user).then(
        function(player){
          //get and add player to game if necessary
          return player.inGame(game).then(
            function(inGame){
              if(!inGame){
                game.addPlayer(player);
                bot.reply(message,`Welcome to the game <@${player.messaging_id}>!`);
                player.save();
              }
              return [game, player];
            }
          );
        }
      )
    }
  ).then(
    function([game, player]){
      return store.GiphyPost.new(game, player, message).then(
        function(post){
          return [game, player, post]
        }
      );
    }
  ).then(
      function([game, player, post]){
        //process missions
        StandardMission.for(game).onPost(post, bot.reply.bind(bot, message));
        MatchTheGiphyMission.for(game).onPost(post, bot.reply.bind(bot, message));
      }
  ).catch(function(err){
    console.error("Not able to process giphy,", err, message);
  });

}

function onShowChallenge(bot,message) {
  console.log("Showing challenge", message);
  store.Game.forChannel(message.channel, true).then(
    function(game){
      if(!game){
        bot.reply(message,"No active game. Start one by posting a giphy!");
        return;
      }
      MatchTheGiphyMission.for(game).show(bot.reply.bind(bot, message));
    }
  );
}

function onResetChallenge(bot,message) {
  console.log("Reset challenge", message);
  store.Game.forChannel(message.channel, true).then(
    function(game){
      if(!game){
        bot.reply(message,"No active game. Start one by posting a giphy!");
        return;
      }
      MatchTheGiphyMission.for(game).reset(bot.reply.bind(bot, message));
    }
  );
}

function onEndGame(bot,message) {
  console.log("Ending game", message);
  store.Game.forChannel(message.channel, true).then(
    function(game){
        if(!game){
          bot.reply(message,"No active game.");
          return;
        }

        console.log("Ending game " + game.get('id'));
        game.finish();
        game.save().then(function(game){
          bot.reply(message,"Game Over!");
          displayLeaderboard(bot, message, game, 'Final Standings');
        });
    }
  );
}

function onSettings(bot, message) {
  store.Game.forChannel(message.channel, true).then(function(game){
    if(!game){
      bot.reply(message,"No active game.");
      return;
    }

    var params = message.match[1].trim();
    if( !params ){
      displaySettings(bot,message,game);
    }
    else{
      var puts = params.split(',').map(
        function(param){
          var parts = param.split('='),
            name = parts[0].trim();
            value = parts[1].trim();

          return store.Settings.put(game, name, value);
        }
      );

      Promise.all(puts).then(
        function(){
          displaySettings(bot,message,game);
        }
      );
    }
  });
}

function displaySettings(bot, message, game){
  store.Settings.for(game).getAll().then(
    function(settings){
      if(settings.length == 0){
        bot.reply(message,'I looks and looked, and did not find any settings');
      }
      else{
        var allSettings = {};
        settings.forEach(
          function(setting){
            allSettings[setting.name] = setting.value;
          }
        );

        var settingsMessage = require('./lib/messages/settings')(allSettings);
        bot.reply(message,settingsMessage);
      }
    }
  );
}

function onLeaderboard(bot, message) {
  store.Game.forChannel(message.channel, true).then(function(game){
    if(!game){
      bot.reply(message,"No active game.");
      return;
    }

    displayLeaderboard(bot, message, game);
  });
}

function displayLeaderboard(bot, message, game, title){
  store.Stat.in(game).top("points", 10).then(
    function(pointStats){
      if(pointStats.length == 0){
        bot.reply(message,'Where\'s everybody?');
      }
      else{
        var promises = pointStats.map(function(pointStat){
          return slack_users.get(pointStat.Player.messaging_id).then(
            function(user){
              return {
                id: user.id,
                name: user.name,
                points: Math.round(pointStat.value)
              };
            });
        });
        Promise.all(promises).then(function(scores){
          var leaderboardMessage = require('./lib/messages/leaderboard')(scores, title);
          bot.reply(message,leaderboardMessage);
        });
      }
    }
  );
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

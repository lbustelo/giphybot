var Botkit = require('botkit');
var Promise = require('promise');
var mixin = require('mixin-object');

var store = require('./lib/models/index');

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

// Leaderboard
controller.hears('^\s*(leaderboard)\s*$',['direct_mention'],secure(onLeaderboard));
controller.hears('^\s*(leaderboard)\s*$',['direct_message'],secure(onLeaderboard));

// Track latest giphy and record stats
controller.hears('\/giphy (.*)',['message_received', 'direct_message', 'ambient'],onGiphy);

// End current game
controller.hears('^\s*(end game)\s*$',['direct_mention'],secure(onEndGame));

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
  console.log("Got a giphy...");
  store.Game.forChannel(message.channel).then(
    function(game){
        //start or get current game
        if(game.isNew()){
          bot.reply(message,"Game is on baby!");
          console.log("Starting game...");
          game.start();
          game.save();
          setSpecialGiphy(game);
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
      //record the giphy
      return store.Giphy.getOrCreateFromMessage(message).then(
        function(giphy){
          if(giphy){
            console.log(`Processing giphy ${giphy.id}`);
            return [game, player, giphy];
          }
        }
      );
    }
  ).then(
    function([game, player, giphy]){
      store.GiphyPost.by(player).latest(game).then(
        function(post){
          if(post)
            console.log("Latest post:", post.id);
        }
      )
      //compute points

      store.Stat.get('points',player,game).then(function(points){
        //all posts are 1 point regardless
        points.inc();

        //special giphy bonus points
        store.Settings.get(game,'special_giphy').then(
          function(special_giphy_setting){
            if( giphy.id === special_giphy_setting.value ){
              var bonus = 10;
              points.inc(bonus);
              var bonusMessage = require('./lib/messages/secret_giphy_bonus')(player, bonus, giphy);
              bot.reply(message,bonusMessage);
              setSpecialGiphy(game);
            }
          }
        );


      });

      //record the post
      return game.post(giphy).by(player).save();
    }
  ).catch(function(err){
    console.error("Not able to process giphy,", err, message);
  });

}

function onEndGame(bot,message) {
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

function onLeaderboard(bot, message) {
  store.Game.forChannel(message.channel, true).then(function(game){
    if(!game){
      bot.reply(message,"No active game.");
      return;
    }

    displayLeaderboard(bot, message, game);
  });
}

function setSpecialGiphy(game){
  store.Giphy.randomPick().then(
    function(pickedGiphy){
      if(pickedGiphy){
        store.Settings.put(game,'special_giphy', pickedGiphy.id);
      }
      else {
        console.log("This game will not have special giphy.")
      }
    }
  );
}

function displayLeaderboard(bot, message, game, title){
  store.Stat.in(game).top("points", 10).then(
    function(pointStats){
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

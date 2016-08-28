var Botkit = require('botkit');
var mixin = require('mixin-object');
var store = require('./lib/models');

//missions
var StandardMission = require('./lib/missions/standard');
var MatchTheGiphyMission = require('./lib/missions/giphy_match');
var GiphyMinesMission = require('./lib/missions/giphy_mines');

//environment
var BOT_MASTER        = process.env.BOT_MASTER;
var SLACK_TOKEN       = process.env.SLACK_TOKEN;
var BOT_DEBUG         = (process.env.BOT_DEBUG==='true');

if( !SLACK_TOKEN ){
  console.log('Error: Specify SLACK_TOKEN in environment');
  process.exit(1);
}

var controller = Botkit.slackbot({
  debug: BOT_DEBUG
});

// connect the bot to a stream of messages
controller.spawn({token: SLACK_TOKEN,}).startRTM(
  function (err, bot) {
    if (err) {
        throw new Error(err);
    }
  }
);

// Settings
var SettingsController = require('./lib/controllers/settings');
controller.hears('^\s*settings( game [0-9]+)?(.*=.*)*$',['direct_message', 'direct_mention'],secure(SettingsController));

// Leaderboard
var LeaderboardController = require('./lib/controllers/leaderboard');
controller.hears('^\s*leaderboard\s*$',['direct_mention'],LeaderboardController);

// Track latest giphy and record stats
controller.hears('\/giphy (.*)',['message_received', 'direct_message', 'mention', 'ambient'],onGiphy);

// Mine challenge
controller.hears('^\s*set mines\s*$',['direct_mention'],GiphyMinesMission.controller);

// Match challenge
controller.hears('^\s*show challenge\s*$',['direct_mention'],onShowChallenge);
controller.hears('^\s*reset challenge\s*$',['direct_mention'],onResetChallenge);

// End current game
var EndController = require('./lib/controllers/end');
controller.hears('^\s*end game\s*$',['direct_mention'],secure(EndController));

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
          GiphyMinesMission.for(game).start(bot.reply.bind(bot, message));
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
        GiphyMinesMission.for(game).onPost(post, bot.reply.bind(bot, message));
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

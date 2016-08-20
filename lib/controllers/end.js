var store = require('../models');
var LeaderBoardReply = require('../replies/leaderboard')

module.exports = function(bot, message) {
  console.log("Handling end game message...", message);
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
          LeaderBoardReply.build(game, 'Final Standings').reply(bot, message);
        });
    }
  );
}

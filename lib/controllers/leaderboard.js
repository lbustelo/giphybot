var store = require('../models');
var LeaderBoardReply = require('../replies/leaderboard')

module.exports = function(bot, message) {
  console.log('Handling leaderboard message...', message);
  return store.Game.forChannel(message.channel, true).then(function(game){
    if(!game){
      bot.reply(message,'No active game.');
    }
    else{
      LeaderBoardReply.build(game).reply(bot, message);
    }
  });
};

var LeaderBoardMessageBuilder = require('../messages/leaderboard');

function replyWithLeaderboard(game, title, bot, message){
  return game.leaderboard().then(
    function(leaderboard){
      if(leaderboard.length == 0){
        bot.reply(message,'Where\'s everybody?');
      }
      else{
        var slack_users = require('../slack/users')(bot);
        return slack_users.decorate(leaderboard).then(
          function(decoratedLeaderboard){
            bot.reply(message, LeaderBoardMessageBuilder(decoratedLeaderboard, title));
          }
        );
      }
    }
  );
};

module.exports.build = function(game, title){
  return {
    reply: replyWithLeaderboard.bind(null, game, title || undefined)
  }
}

var store = require('../models');

module.exports = function (bot, message) {
  console.log(message)

  var params;
  var gamePromise;
  if(message.match[1] && message.match[1].trim().startsWith("game")){
    var gameId = parseInt(message.match[1].trim().split(' ')[1].trim());
    gamePromise = store.Game.byId(gameId);
    params = message.match[2] && message.match[2].trim();
  }
  else{
    gamePromise = store.Game.forChannel(message.channel, true);
    params = message.match[1] && message.match[1].trim();
  }

  gamePromise.then(function(game){
    if(!game){
      bot.reply(message,{
        channel: message.user,
        text: 'No active game.'
      });
      return;
    }

    if( !params ){
      displaySettings(bot,message,game);
    }
    else{
      var puts = params.split(';').map(
        function(param){
          var parts = param.split('='),
            name = parts[0] && parts[0].trim();
            value = parts[1] && parts[1].trim();

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
        bot.startPrivateConversation(message,function(err, convo){
            convo.say('I looks and looked, and did not find any settings');
        });
      }
      else{
        var allSettings = {};
        settings.forEach(
          function(setting){
            allSettings[setting.name] = setting.value;
          }
        );

        var settingsMessage = require('../messages/settings')(game, allSettings);
        console.log("user", message.user);

        bot.startPrivateConversation(message,function(err, convo){
            convo.say(settingsMessage);
        });
      }
    }
  );
}

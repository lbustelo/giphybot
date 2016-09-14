var store = require('../../models');

/**
 * Giphy mines mission allows players to set giphy's as mines that when
 * a player lands on them, points are tranfered.
 */
var MINES_SETTING         = 'giphy_mines.mines';
var POINTS_SETTING        = 'giphy_mines.hit_points';
var MAX_MINES_SETTING     = 'giphy_mines.max_mines';

var DUP_IGNORE_SETTING    = 'standard.dup_check'; //list of giphy's to ignore

var DEFAULT_POINTS        = 100;
var DEFAULT_MAX_MINES     = 3;

var GIPHY_URL_PATTERN=/http:\/\/i.giphy.com\/(.*).gif/

var challenge = function(game){
  this.game = game;
}

/**
 * Processes a giphy post to determing if mission was
 * acomplished
 */
challenge.prototype.onPost = function(post, reply){
  console.log(`Processing giphy mines for game ${this.game.id}...`);

  store.withinTransaction(function(){
    return getGiphyMines(this.game).then(
      function(mines){
        if(this._isAHit(post, mines)){
          var winnerId = mines[post.Giphy.id];
          return store.Player.get(winnerId).then(
            function(winner){
              return Promise.all([
                this._deactivateMine(post, mines),
                this._applyHitPoints(post, winner, reply)
              ]);

            }.bind(this)
          );
        }
        else if(this._isSelfHit(post, mines)){
          return Promise.all([
            this._deactivateMine(post, mines),
            this._applySelfHitPoints(post, reply)
          ]);
        }
        else{
          console.log("giphy_mine: No hit");
        }
      }.bind(this)
    );
  }.bind(this));
}

challenge.prototype._isAHit = function(post, mines){
  return mines[post.Giphy.id] && !this._isSelfHit(post, mines);
}

challenge.prototype._isSelfHit = function(post, mines){
  return mines[post.Giphy.id] === post.Player.id;
}

challenge.prototype._deactivateMine = function(post, mines){
  delete mines[post.Giphy.id];
  store.Settings.inGame(this.game).put(MINES_SETTING, mines);
}

challenge.prototype._applyHitPoints = function(post, winner, reply){
  console.log(`giphy mines: Clean hit... Deduction points for player ${post.Player.id}...`);
  return Promise.all([
    this.game.getPointsFor(winner),
    this.game.getPointsFor(post.Player),
    getBonusPoints(this.game)
  ]).then(
    function([winnerPoints, losserPoint, bonus]){
      winnerPoints.inc(bonus);
      losserPoint.inc(-bonus);
      reply(WinnerMessageBuilder(winner, post.Player, bonus));
    }
  );
}

challenge.prototype._applySelfHitPoints = function(post, reply){
  console.log(`giphy mines: Self hit... Deduction points for player ${post.Player.id}...`);
  return Promise.all([
    this.game.getPointsFor(post.Player),
    getBonusPoints(this.game)
  ]).then(
    function([points, bonus]){
      points.inc(-bonus);
      reply(SelfHitMessageBuilder(post.Player, bonus));
    }
  );
}

challenge.prototype.start = function(reply){
  console.log(`Starting giphy mines for game ${this.game.id}...`);
  this._reset(reply);
}

challenge.prototype.reset = function(reply){
  console.log(`Resetting giphy mines for game ${this.game.id}...`);
  this._reset(reply);
}

challenge.prototype._reset = function(reply){

}

challenge.prototype.show = function(reply){

}

/**
 * Mines are stored in an object with the key being the Giphy id and the value
 * the Player id that set it.
 */
function getGiphyMines(game){
  return store.Settings.inGame(game).get(MINES_SETTING).or({});
}

function getBonusPoints(game){
  return store.Settings.inGame(game).get(POINTS_SETTING).or(DEFAULT_POINTS);
}

function getMaxMines(game){
  return store.Settings.inGame(game).get(MAX_MINES_SETTING).or(DEFAULT_MAX_MINES);
}

function WinnerMessageBuilder(winner, looser, points){
  var message =  {
    "attachments": [
      {
        "fallback": "You just landed on a mine!",
        "title": "Giphy Mines",
        "text": `<@${looser.messaging_id}>: You landed on a giphy mine set by <@${winner.messaging_id}>!`,
        "color": "#FF0000",
        "thumb_url": "https://d30y9cdsu7xlg0.cloudfront.net/png/1652-200.png",
        "footer": `:fire: ${points} points exchange`,
        "mrkdwn_in": ["text"]
      }
    ]
  };
  return message;
}

function SelfHitMessageBuilder(looser, points){
  var message =  {
    "attachments": [
      {
        "fallback": "Ouch! You just on your own mine!",
        "title": "Giphy Mines",
        "text": `<@${looser.messaging_id}>: WTF... You landed on your own giphy mine!`,
        "color": "#FF0000",
        "thumb_url": "https://d30y9cdsu7xlg0.cloudfront.net/png/1652-200.png",
        "footer": `:bomb: You loose ${points}!`,
        "mrkdwn_in": ["text"]
      }
    ]
  };
  return message;
}

module.exports.for = function(game){
  return new challenge(game);
}

module.exports.controller = function(bot, message){
  console.log('Handling setting mines...', message);
  return store.Game.forChannel(message.channel, true).then(function(game){
    if(!game){
      bot.reply(message,'No active game.');
      return;
    }

    //get the current mines for the player
    Promise.all([
      getGiphyMines(game),
      getMaxMines(game),
      store.Player.getOrCreate(message.user),
    ]).then(
      function([mines,maxMines,player]){
        askForMines(bot, message, mines, maxMines, game, player);
      }
    );

  });
}

function askForMines(bot, message, mines, maxMines, game, player){
  var playerMines = toPlayerMines(mines, player);

  if( playerMines.length < maxMines ){
    //ask for more
    bot.api.chat.postMessage(
      toMinesMessage(
        'Give me some *GIPHY* URLs to set your mines.',
        message.user,
        instructionsAttachment().concat(toMinesAttachments(playerMines))),
        function(err, question){
          startAskingForMoreMines(bot, question, game, player);
        });

  }
  else {
    //list them and say that's it
    bot.api.chat.postMessage(
      toMinesMessage(
        'All your mines are set!',
        message.user,
        toMinesAttachments(playerMines)));
  }
}

function startAskingForMoreMines(bot, messageToReplace, game, player){
  console.log("messageToReplace", messageToReplace);
  bot.startConversation({channel:messageToReplace.channel, user:player.messaging_id},function(err, convo){
      convo.ask("",
      [{
        pattern: GIPHY_URL_PATTERN,
        callback: processNewMine.bind(null, game, player, messageToReplace, bot)
      },
      {
        default: true,
        callback: function(response,convo) {
          convo.say('Did not get that. Try again.');
          convo.repeat();
          convo.next()
        }
      }], {
        key: "mine"
      });
  });
}

function processNewMine(game, player, messageToReplace, bot, response, convo) {
  var mine = response.match[1];

  store.withinTransaction(function(){
    return Promise.all([
      getGiphyMines(game),
      getMaxMines(game)
    ]).then(function([mines,maxMines]){
      if(mines[mine]){
        //already set, try a different one
        convo.say("That one is already being used... Give me something new.");
        convo.repeat();
        convo.next();
      }
      else{
        mines[mine] = player.id;
        return store.Settings.inGame(game).put(MINES_SETTING,mines).then(
          function(updatedMines){
            console.log("updated mines:", updatedMines);
            var playerMines = toPlayerMines(updatedMines, player);

            var updatedMessage = {
              text: messageToReplace.message.text,
              ts: messageToReplace.message.ts,
              channel: messageToReplace.channel,
              attachments: JSON.stringify(instructionsAttachment().concat(toMinesAttachments(playerMines))),
              as_user: true
            };

            console.log( "updating with", updatedMessage);
            bot.api.chat.update(updatedMessage, function(err){
              if(err){
                console.error("Opps! ", err);
              }
              if(playerMines.length < maxMines){
                convo.say("Got it... Give me another one");
                convo.repeat();
                convo.next();
              }
              else{
                convo.say("All mines set... Good luck!");
                convo.next();
              }
            });
          }
        );
      }
    });
  });
}

function toPlayerMines(mines, player){
  return Object.keys(mines).filter(function(mine){
    return mines[mine] == player.id;
  });
}

function toMinesMessage(text, channel, attachments){
  var mineMessage = {
      "as_user": true,
      "channel": channel,
      "text": text
  }
  mineMessage.attachments = attachments;
  return mineMessage;
}

function toMinesAttachments(mines){
  return mines.map(function(mine){
    return {
      "text": "",
      "footer": `http://i.giphy.com/${mine}.gif`
    }
  });
}

function instructionsAttachment(){
  return [{
      "fallback": "Set some GIPHY mines.",
      "color": "#36a64f",
      "footer": "Use the Gif Download URL",
      "image_url": "https://dl.dropboxusercontent.com/u/14411470/giphybot/giphy_mine_instructions.png"
  }]
}

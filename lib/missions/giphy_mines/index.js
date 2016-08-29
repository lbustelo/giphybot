var store = require('../../models');

/**
 * Giphy mines mission allows players to set giphy's as mines that when
 * a player lands on them, points are tranfered.
 */
var MINES_SETTING         = 'giphy_mines.mines';
var POINTS_SETTING        = 'giphy_mines.hit_points';

var DUP_IGNORE_SETTING    = 'standard.dup_check'; //list of giphy's to ignore

var DEFAULT_POINTS      = 100;

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

  getGiphyMines(this.game).then(
    function(mines){
      if(this._isAHit(post, mines)){
        var winnerId = mines[post.Giphy.id];
        store.Player.get(winnerId).then(
          function(winner){
            this._deactivateMine(post, mines);
            this._applyHitPoints(post, winner, reply);
          }.bind(this)
        );
      }
      else if(this._isSelfHit(post, mines)){
        this._deactivateMine(post, mines);
        this._applySelfHitPoints(post, reply);
      }
      else{
        console.log("giphy_mine: No hit");
      }
    }.bind(this)
  );
}

challenge.prototype._isAHit = function(post, mines){
  return mines[post.Giphy.id] && !this._isSelfHit(post, mines);
}

challenge.prototype._isSelfHit = function(post, mines){
  return mines[post.Giphy.id] === post.Player.id;
}

challenge.prototype._deactivateMine = function(post, mines){
  delete mines[post.Giphy.id];
  store.Settings.put(this.game,MINES_SETTING, JSON.stringify(mines));
}

challenge.prototype._applyHitPoints = function(post, winner, reply){
  console.log(`giphy mines: Clean hit... Deduction points for player ${post.Player.id}...`);
  Promise.all([
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
  Promise.all([
    this.game.getPointsFor(post.Player),
    getBonusPoints(this.game)
  ]).then(
    function([points, bonus]){
      points.inc(-bonus);
      reply('You landed on your own mine!')
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
  return store.Settings.get(game, MINES_SETTING).then(
    function(mines_setting){
      console.log("setting", `####${mines_setting}####`);
      return mines_setting?JSON.parse(mines_setting):{};
    }
  );
}

function getBonusPoints(game){
    return store.Settings.get(game,POINTS_SETTING, DEFAULT_POINTS).then(
    function(points_setting){
      return Math.abs(parseInt(points_setting));
    }
  );
}

function ChallengeMessageBuilder(giphy, bonus){
  var message =  {
    attachments: [
      {
        fallback: 'Play match the giphy!',
        title: 'Match the Giphy',
        image_url: `${giphy.url}`,
        color: '#FD6729',
        footer: `Earn ${bonus} points by matching the giphy`,
        footer_icon: 'http://vignette1.wikia.nocookie.net/restaurant-story-2/images/6/6b/Coin-icon.png/revision/latest?cb=20150508155053',
        mrkdwn_in: ["text, footer"]
      }
    ]
  };
  return message;
}

function WinnerMessageBuilder(winner, looser, points){
  var message =  {
    "attachments": [
      {
        "fallback": "You just landed on a mine!",
        "title": "Giphy Mines",
        "text": `<@${looser.messaging_id}>: You landed on a giphy mine set by <@${winner.messaging_id}>!`,
        "color": "#FD6729",
        "thumb_url": "https://d30y9cdsu7xlg0.cloudfront.net/png/1652-200.png",
        "footer": `:fire: ${points} points exchange`,
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

    bot.api.chat.postMessage({
        "as_user": true,
        "channel": message.user,
        "text": "Give me some *GIPHY* URLs to set your mines.",
        "attachments": [
            {
                "fallback": "Set some GIPHY mines.",
                "color": "#36a64f",
                "footer": "Use the Gif Download URL",
                "image_url": "https://dl.dropboxusercontent.com/u/14411470/giphybot/giphy_mine_instructions.png"
            }
        ]
    }, function(err, question){
      console.log("postMessage response", question);
      bot.startPrivateConversation(message,function(err, convo){
          convo.ask("",
          [{
            pattern: GIPHY_URL_PATTERN,
            callback: function(response,convo) {
              question.message.attachments.push({
                "text": "",
                "footer": `${convo.responses.mine.text}`
              });

              var updatedMessage = {
                text: question.message.text,
                ts: question.message.ts,
                channel: question.channel,
                attachments: JSON.stringify(question.message.attachments),
                as_user: true
              }

              console.log( "updating with", updatedMessage);
              bot.api.chat.update(updatedMessage, function(err){
                if(err){
                  console.error("Opps! ", err);
                }
                askMoreGiphy(convo);
                convo.next();
              });
            }
          },
          {
            default: true,
            callback: function(response,convo) {
              convo.say('Did not get that.');
              convo.next()
            }
          }], {
            key: "mine"
          });
      });

      function askMoreGiphy(convo){
        convo.ask('Got it... Give me another one',
        [{
          pattern: GIPHY_URL_PATTERN,
          callback: function(response,convo) {
            convo.repeat();
            convo.next();
          }
        },
        {
          default: true,
          callback: function(response,convo) {
            convo.say('Did not get that.');
            convo.next()
          }
        }]);
      }

    });
  });
}

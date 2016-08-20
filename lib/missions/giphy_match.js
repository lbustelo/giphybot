var store = require('../models/index');

/**
 * Match the Giphy mission selects a random giphy. The user
 * to repost the same giphy, wins.
 */
var GIPHY_SETTING         = 'giphy_match.giphy';
var POINTS_SETTING        = 'giphy_match.points';
var MULTIPLIER_SETTING    = 'giphy_match.multiplier';
var AUTORESTART_SETTING   = 'giphy_match.auto_restart';

var DUP_IGNORE_SETTING    = 'standard.dup_ignore'; //list of giphy's to ignore

var DEFAULT_POINTS    = 25;
var DEFAULT_AUTORESTART = true;
var DEFAULT_MULTIPLIER = 1;

var AUTORESTART_TIMEOUT = 5000;

var challenge = function(game){
  this.game = game;
}

/**
 * Processes a giphy post to determing if mission was
 * acomplished
 */
challenge.prototype.onPost = function(post, reply){
  console.log(`Processing match the giphy for game ${this.game.id}...`);

  getGiphyToMatch(this.game).then(
    function(giphy_to_match){
      var giphy = post.Giphy;
      var matches = giphy.id === giphy_to_match.id;
      if(matches){
        var message = JSON.parse(post.Message.raw);
        var cheating = message.match[1].indexOf(giphy.id) > -1;
        if(cheating){
          reply(`No cheating <@${post.Player.messaging_id}>! Try a different way.`)
        }
        else{
          Promise.all([
            this.game.getPointsFor(post.Player),
            getBonusPoints(this.game),
            isAutoRestart(this.game)
          ]).then(
            function([points, bonus, isAutoRestart]){
              points.inc(bonus);
              reply(WinnerMessageBuilder(post.Player, bonus, post.Giphy));

              if(isAutoRestart){
                setTimeout(this.reset.bind(this,reply), AUTORESTART_TIMEOUT);
              }
            }.bind(this)
          );
        }
      }
    }.bind(this)
  );
}

challenge.prototype.start = function(reply){
  console.log(`Starting match the giphy for game ${this.game.id}...`);
  this._reset(reply);
}

challenge.prototype.reset = function(reply){
  console.log(`Resetting match the giphy for game ${this.game.id}...`);
  this._reset(reply);
}

challenge.prototype._reset = function(reply){
  Promise.all([
    this._pickGiphy(),
    getBonusPoints(this.game)
  ]).then(
    function([giphy, bonus]){
      reply(ChallengeMessageBuilder(giphy, bonus));
    }
  ).catch(
    function(error){
      console.error("giphy_match: error picking giphy", error);
    }
  );
}

challenge.prototype.show = function(reply){
  Promise.all([
    getGiphyToMatch(this.game),
    getBonusPoints(this.game)
  ]).then(
    function([giphy, bonus]){
        reply(ChallengeMessageBuilder(giphy, bonus));
    }
  );
}

challenge.prototype._pickGiphy = function(){
  return store.Giphy.randomPick().then(
    function(pickedGiphy){
      if(pickedGiphy){
        console.log("Picked giphy",pickedGiphy);

        return Promise.all([
            store.Settings.put(this.game,DUP_IGNORE_SETTING, JSON.stringify([pickedGiphy.id])),
            store.Settings.put(this.game,GIPHY_SETTING, pickedGiphy.id)
        ]).then(
          function(){
            return pickedGiphy;
          }
        );
      }
      else {
        throw new Error("Unable to select a giphy!");
      }
    }.bind(this)
  );
}

function getGiphyToMatch(game){
  return store.Settings.get(game, GIPHY_SETTING).then(
    function(giphy_setting){
      return store.Giphy.get(giphy_setting);
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

function isAutoRestart(game){
  return store.Settings.get(game,AUTORESTART_SETTING, DEFAULT_AUTORESTART).then(
    function(auto_restart_setting){
      return auto_restart_setting.toLowerCase() === 'true'
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

function WinnerMessageBuilder(player, points, giphy){
  var message =  {
    "attachments": [
      {
        "fallback": "Bonus points!",
        "title": "Match the Giphy",
        "text": `<@${player.messaging_id}>: You matched the giphy!`,
        "color": "#FD6729",
        "thumb_url": "http://blog.roblox.com/wp-content/uploads/2014/04/Clan-Icon-700px.png",
        "footer": `:thumbsup: Here's ${points} points`,
        "mrkdwn_in": ["text"]
      }
    ]
  };
  return message;
}

module.exports.for = function(game){
  return new challenge(game);
}

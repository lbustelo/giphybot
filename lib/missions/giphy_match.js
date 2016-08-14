var store = require('../models/index');

/**
 * Match the Giphy mission selects a random giphy. The user
 * to repost the same giphy, wins.
 */
var GIPHY_SETTING         = 'giphy_match.giphy';
var POINTS_SETTING        = 'giphy_match.points';
var MULTIPLIER_SETTING    = 'giphy_match.multiplier';
var AUTORESTART_SETTING   = 'giphy_match.auto_restart';

var DEFAULT_POINTS    = 25;
var DEFAULT_AUTORESTART = true;
var DEFAULT_MULTIPLIER = 1;

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
                setTimeout(this.reset.bind(this,reply), 2000);
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
        return store.Settings.put(this.game,GIPHY_SETTING, pickedGiphy.id).then(
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
      return store.Giphy.get(giphy_setting.value);
    }
  );
}

function getBonusPoints(game){
  return store.Settings.get(game,POINTS_SETTING).then(
    function(points_setting){
      return parseInt(points_setting) || DEFAULT_POINTS;
    }
  );
}

function isAutoRestart(game){
  return store.Settings.get(game,AUTORESTART_SETTING).then(
    function(auto_restart_setting){
      return auto_restart_setting.value !== '' ? auto_restart_setting.value : DEFAULT_AUTORESTART;
    }
  );
}

function ChallengeMessageBuilder(giphy, bonus){
  var message =  {
    attachments: [
      {
        fallback: 'Play match the giphy!',
        title: 'Match the Giphy',
        text: `Earn *${bonus}* points by matching the giphy`,
        image_url: `${giphy.url}`,
        color: '#FD6729',
        footer: 'Thanks to @james for suggesting feature',
        footer_icon: 'https://avatars.slack-edge.com/2016-04-01/31392822582_a005cafcb2154c18b488_24.jpg',
        mrkdwn_in: ["text"]
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
        "footer": `${points} points`,
        "footer_icon": "https://pbs.twimg.com/profile_images/699676239620083713/WCUM0RqH.jpg",
        "mrkdwn_in": ["text"]
      }
    ]
  };
  return message;
}

module.exports.for = function(game){
  return new challenge(game);
}

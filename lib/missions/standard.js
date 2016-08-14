var store = require('../models/index');

/**
 * This is the standard game that gives points just for posting giphys
 */
var POINTS_SETTING        = 'standard.points';
var DUP_PENALTY_SETTING   = 'standard.dup_penalty';

var LOOKBACK_SETTING      = 'standard.dup_lookback'; //how many past post to look to penalize for dups


var DEFAULT_POINTS        = 1;
var DEFAULT_DUP_PENALTY   = -5;

var DEFAULT_LOOKBACK      = -1; //-1 means all

var challenge = function(game){
  this.game = game;
}

/**
 * Processes a giphy post to determing if mission was
 * acomplished
 */
challenge.prototype.onPost = function(post, reply){
  console.log(`Processing standard for game ${this.game.id}...`);
  getLookbackLimit(this.game).then(
    function(lookbackLimit){
      this.game.findDuplicatePost(post, lookbackLimit>=0?lookbackLimit:undefined).then(
        function(dupPosts){
          dupPosts.length>0 ?
            this._applyDupPenalty(post, dupPosts, reply) :
            this._applyPostPoints(post, reply);
        }.bind(this)
      );
    }.bind(this)
  );
}

challenge.prototype._applyPostPoints = function(post, reply){
  console.log(`Applying standard post points to player ${post.Player.id}...`);
  Promise.all([
    this.game.getPointsFor(post.Player),
    getPointsForPost(this.game)
  ]).then(
    function([points, bonus]){
      points.inc(bonus);
    }
  );
}

challenge.prototype._applyDupPenalty = function(post, dupPosts, reply){
  console.log(`Applying penalty points to player ${post.Player.id} for duplicate...`);
  Promise.all([
    this.game.getPointsFor(post.Player),
    getDupPenalty(this.game)
  ]).then(
    function([points, basePenalty]){
      var penalty = basePenalty * dupPosts.length;
      points.inc(penalty);
      reply(PenaltyMessageBuilder(post.Player, penalty, post.Giphy, dupPosts.length));
    }
  );
}

challenge.prototype.start = function(reply){
  console.log(`Starting standard for game ${this.game.id}...`);
}

challenge.prototype.reset = function(reply){
  console.log(`Resetting standard for game ${this.game.id}...`);
}

challenge.prototype.show = function(reply){

}

function getPointsForPost(game){
  return store.Settings.get(game,POINTS_SETTING).then(
    function(points_setting){
      return parseInt(points_setting) || DEFAULT_POINTS;
    }
  );
}

function getDupPenalty(game){
  return store.Settings.get(game,DUP_PENALTY_SETTING).then(
    function(penalty_settings){
      return parseInt(penalty_settings) || DEFAULT_DUP_PENALTY;
    }
  );
}

function getLookbackLimit(game){
  return store.Settings.get(game,LOOKBACK_SETTING).then(
    function(points_setting){
      return parseInt(points_setting) || DEFAULT_LOOKBACK;
    }
  );
}

function PenaltyMessageBuilder(player, penalty, giphy, dupCount){
  var message =  {
    "attachments": [
      {
        "fallback": "Penalty!",
        "title": "Duplicate Giphy",
        "text": `<@${player.messaging_id}>: You posted a duplicate giphy! I've seen this one ${dupCount} time${dupCount>1 ? 's' : ''}.`,
        "color": "#FD6729",
        "thumb_url": "http://plainicon.com/dboard/userprod/2831_9307e/prod_thumb/plainicon.com-54580-w-256px-16dc.png",
        "footer": `:thumbsdown: Say bye bye to ${Math.abs(penalty)} points. ${dupCount>=5 ? 'Ouch!' : ''}`,
        "mrkdwn_in": ["text"]
      }
    ]
  };
  return message;
}

module.exports.for = function(game){
  return new challenge(game);
}

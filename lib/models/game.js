'use strict';
var moment = require('moment');

module.exports = function(sequelize, DataTypes) {
  var Game = sequelize.define('Game', {
    channel: DataTypes.STRING,
    status: {
      type: DataTypes.ENUM,
      values: ['new', 'active', 'over'],
      defaultValue: 'new'
    },
    start_time: DataTypes.DATE,
    end_time: DataTypes.DATE
  }, {
    classMethods: {
      associate: function(models) {
        models.Game.belongsToMany(models.Player, {through: 'GamePlayers'});
        models.Game.hasMany(models.Stat, {as: 'Stats', foreignKey: 'game'});
        models.Game.hasMany(models.GiphyPost, {as: 'Posts', foreignKey: 'game'});
        models.Game.hasMany(models.Settings, {as: 'Settings', foreignKey: 'game'});
      }
    }
  });

  /*
   * Class Methods
   */

  /**
   * Returns a Game for the given channel. The Game can be new or active.
   */
  Game.forChannel = function(channel, doNotCreate){
    var findFunc = !doNotCreate ? 'findOrCreate' : 'findOne';
    return Game[findFunc]({where:{channel: channel, status: 'active'}, defaults:{status: 'new'}}).then(
      function(){
        var game = Array.isArray(arguments[0])?arguments[0][0]:arguments[0],
          created = Array.isArray(arguments[0])?arguments[0][1]:!!arguments[1];
        if(created){
          console.log("New game for channel");
        }
        return game;
      }
    );
  };

  /**
   * Returns a newly created game
   */
  Game.new = function(channel){
    return Game.create({channel: channel});
  };

  /**
   * Return game by id
   */
  Game.byId = function(id){
    return Game.findById(id);
  };

  /*
   * Instance Methods
   */
  Game.Instance.prototype.isNew = function(){
    return this.get('status') === 'new';
  }

  Game.Instance.prototype.isActive = function(){
    return this.get('status') === 'active';
  }

  Game.Instance.prototype.isOver = function(){
    return this.get('status') === 'over';
  }

  Game.Instance.prototype.start = function(){
    this.set({
      status: 'active',
      start_time: moment().toDate()
    });
  }

  Game.Instance.prototype.finish = function(){
    this.set({
      status: 'over',
      end_time: moment().toDate()
    });
  }

  Game.Instance.prototype.findDuplicatePost = function(post, limit){
    var store = require('../models/index');
    var where = {
      giphy:post.giphy,
      id: {
        $ne: post.id
      }
    };
    return store.GiphyPost.in(this).latest(where, limit);
  }

  Game.Instance.prototype.getPointsFor = function(player){
    var store = require('../models');
    return store.Stat.get('points',player,this);
  }

  Game.Instance.prototype.leaderboard = function(limit){
    var store = require('../models');
    limit = limit || 10;

    return store.Stat.in(this).top("points", limit).then(
      function(pointStats){
        return pointStats.map(function(pointStat){
          return {
            id: pointStat.Player.messaging_id,
            player: pointStat.Player,
            points: Math.round(pointStat.value)
          }
        });
      }
    );
  }

  return Game;
};

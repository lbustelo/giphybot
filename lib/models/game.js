'use strict';
var Promise = require('promise');
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
    return Game.create({channel: channel}).then(function(game){
      return game;
    });
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

  Game.Instance.prototype.post = function(giphy){
    var GiphyPost = require('./index').GiphyPost;
    return GiphyPost.build({"game": this.id, "giphy": giphy.id});
  }

  return Game;
};

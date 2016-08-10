'use strict';
module.exports = function(sequelize, DataTypes) {
  var Stat = sequelize.define('Stat', {
    name: DataTypes.STRING,
    value: {
      type: DataTypes.DOUBLE,
      defaultValue: 0},
    type: DataTypes.ENUM("integer","decimal")
  }, {
    classMethods: {
      associate: function(models) {
        models.Stat.belongsTo(models.Player, {foreignKey: 'player'});
        models.Stat.belongsTo(models.Game, {foreignKey: 'game'});
      }
    },
    scopes: {
      in: function(game){
        return {
          where: {
            game: game.id
          }
        }
      }
    }
  });

  /*
   * Class Methods
   */
  Stat.in = function(game){
    return this.scope({ method: ['in', game]});
  }

  Stat.get = function(name, player, game){
    return this.findOrCreate({where: {player: player.id, name: name, game: game.id}}).spread(
      function(stat, created){
        if(created){
          console.log(`New ${name} stat created for player ${player.id}`)
        }
        return stat.save();
      }
    );
  }

  Stat.top = function(name, limit){
    var Player = require('./index').Player;
    return this.findAll({where: {name: name}, order:[['value', 'DESC']], include:[ Player ], limit: limit});
  }

  /*
   * Instance Methods
   */
  Stat.Instance.prototype.inc = function(by){
    return this.increment('value', {by:by || 1});
  }

  return Stat;
};

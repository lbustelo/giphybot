'use strict';
module.exports = function(sequelize, DataTypes) {
  var Player = sequelize.define('Player', {
    messaging_id: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        models.Player.belongsToMany(models.Game, {through:'GamePlayers'});
        models.Player.hasMany(models.Stat, {as: 'Stats', foreignKey: 'player'});
        models.Player.hasMany(models.GiphyPost, {as: 'Posts', foreignKey: 'player'});
      }
    }
  });

  /*
   * Class Methods
   */
  Player.getOrCreate = function(messaging_id){
    return Player.findOrCreate({where:{messaging_id: messaging_id}}).spread(
      function(player, created){
        if(created){
          console.log("New player created");
        }
        return player;
      }
    );
  }

  /*
   * Instance Methods
   */
  Player.Instance.prototype.inGame = function(game){
    return game.hasPlayer(this);
  }

  return Player;
};

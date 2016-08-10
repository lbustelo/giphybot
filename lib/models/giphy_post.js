'use strict';
module.exports = function(sequelize, DataTypes) {
  var GiphyPost = sequelize.define('GiphyPost', {

  }, {
    classMethods: {
      associate: function(models) {
        models.GiphyPost.belongsTo(models.Game, {foreignKey: 'game'});
        models.GiphyPost.belongsTo(models.Player, {foreignKey: 'player'});
        models.GiphyPost.belongsTo(models.Giphy, {foreignKey: 'giphy'});
      }
    },
    scopes: {
        in: function(game){
          return {
            where: {
              game: game.id
            }
          }
        },
        by: function(player){
          return {
            where: {
              player: player.id
            }
          }
        }
    }
  });

  /*
   * Class Methods
   */
  GiphyPost.latest = function(game){
    var query = {order: [['createdAt', 'DESC']]};
    if(game){
      query.where = {
        game: game.id
      }
    }
    return this.findOne(query);
  }

  GiphyPost.by= function(player){
    return this.scope({ method: ['by', player]})
  }

  /*
   * Instance Methods
   */
  GiphyPost.Instance.prototype.by = function(player){
    this.set("player", player.id);
    return this;
  }

  return GiphyPost;
};

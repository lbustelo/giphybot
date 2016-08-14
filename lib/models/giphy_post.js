'use strict';
module.exports = function(sequelize, DataTypes) {
  var GiphyPost = sequelize.define('GiphyPost', {
  }, {
    classMethods: {
      associate: function(models) {
        models.GiphyPost.belongsTo(models.Game, {foreignKey: 'game'});
        models.GiphyPost.belongsTo(models.Player, {foreignKey: 'player'});
        models.GiphyPost.belongsTo(models.Giphy, {foreignKey: 'giphy'});
        models.GiphyPost.hasOne(models.Message, {foreignKey: 'post', as: 'Message'})

        models.GiphyPost.addScope('defaultScope',{
          include: [
            {model: models.Message, as: 'Message'},
            {model: models.Giphy, as: 'Giphy'},
            {model: models.Player, as: 'Player'}
          ]
        },{override: true});
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
   GiphyPost.new = function(game, player, message){
     var models = require('./index');
     return models.Giphy.getOrCreateFromMessage(message).then(
       function(giphy){
         if(!giphy){
           return Promise.reject('Error recording Giphy!');
         }

         var post = GiphyPost.build({
           game: game.id,
           player: player.id,
           giphy: giphy.id
         });

         post.setMessage(models.Message.build({id: message.ts, raw:JSON.stringify(message), post:post}));
         return post.save().then(
           function(post){
             return post.reload();
           }
         );
       }
     );
   };

  GiphyPost.latest = function(game){
    var query = {order: [['createdAt', 'DESC']]};
    if(game){
      query.where = {
        game: game.id
      }
    }
    return this.findOne(query);
  }

  return GiphyPost;
};

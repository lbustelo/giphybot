'use strict';
var Promise = require('promise');

var GIPHY_URL_PATTERN=/http[s]?:\/\/media[0-9]?.giphy.com\/media\/(.*)\/giphy.*.gif/
function extract_giphy_id(giphy_url){
  var matches = GIPHY_URL_PATTERN.exec(giphy_url)
  return matches && matches.length === 2 ? matches[1] : undefined;
}

module.exports = function(sequelize, DataTypes) {
  var Giphy = sequelize.define('Giphy', {
    id: {
      type: DataTypes.STRING,
      primaryKey: true},
    url: DataTypes.STRING(1024*1)
  }, {
    classMethods: {
      associate: function(models) {
        models.Giphy.hasMany(models.GiphyPost, {as: 'Posts', foreignKey: 'giphy'});
      }
    }
  });

  /*
   * Class Methods
   */

  /**
   * Returns a Giphy based on the massage
   */
  Giphy.getOrCreateFromMessage = function(message){
    var giphy_meta = message.attachments[0];
    var id = extract_giphy_id(giphy_meta.image_url);
    console.log(`giphy id ${id} from ${giphy_meta.image_url}`);
    if(id){
      return Giphy.findOrCreate({where: {id: id}, defaults:{url: giphy_meta.image_url}}).spread(
        function(giphy, created){
          if(created){
            console.log(`New giphy stored ${giphy.url}`);
          }
          return giphy;
        }
      );
    }
    else{
      return Promise.resolve(null);
    }

  };

  return Giphy;
};

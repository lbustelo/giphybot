'use strict';
module.exports = function(sequelize, DataTypes) {
  var Settings = sequelize.define('Settings', {
    name: DataTypes.STRING,
    value: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        models.Stat.belongsTo(models.Game, {foreignKey: 'game'});
      }
    }
  });

  /*
   * Class Methods
   */
  Settings.get = function(game, name){
    return Settings.findOrCreate({where: {name:name, game:game.id}}).spread(
      function(setting){
          return setting;
      }
    );;
  }

  Settings.put = function(game, name, value){
    return Settings.findOrCreate({where: {name:name,game:game.id}}).spread(
      function(setting){
          return setting.update({value:value});
      }
    );
  }

  return Settings;
};

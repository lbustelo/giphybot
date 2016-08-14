'use strict';
module.exports = function(sequelize, DataTypes) {
  var Settings = sequelize.define('Settings', {
    name: DataTypes.STRING,
    value: {
      type: DataTypes.STRING,
      defaultValue: ''
    }
  }, {

    classMethods: {
      associate: function(models) {
        models.Stat.belongsTo(models.Game, {foreignKey: 'game'});
      }
    },
    scopes: {
        for: function(game){
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
  Settings.getAll = function(){
   return Settings.findAll();
  }

  Settings.get = function(game, name, defaultValue){
    return Settings.findOrCreate({where: {name:name, game:game.id}}).spread(
      function(setting, created){
        return (created && defaultValue !== undefined && defaultValue !== null) ?
          setting.update({value: defaultValue}).then(function(setting){return setting.value}) :
          setting.value;
      }
    );
  }

  Settings.put = function(game, name, value){
    return Settings.findOrCreate({where: {name:name,game:game.id}}).spread(
      function(setting){
        return setting.update({value:value});
      }
    );
  }

  Settings.for= function(game){
    return this.scope({ method: ['for', game]})
  }

  return Settings;
};

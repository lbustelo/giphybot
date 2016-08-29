'use strict';
module.exports = function(sequelize, DataTypes) {
  var Settings = sequelize.define('Settings', {
    name: DataTypes.STRING,
    value: {
      type: DataTypes.STRING,
      defaultValue: ''
    }
  },
  {
    classMethods: {
      associate: function(models) {
        models.Settings.belongsTo(models.Game, {foreignKey: 'game'});
        models.Settings.belongsTo(models.Player, {foreignKey: 'player'});
      }
    }
  });

  /*
   * Class Methods
   */
  Settings.getAll = function(){
   return Settings.findAll();
  }

  Settings.get = function(game, player, name){
    var where = {
      name: name
    }
    if(player != undefined){
      where.player = player && player.id;
    }

    if(game != undefined){
      where.game = game && game.id;
    }
    var findPromise = Settings.findOne({
      where: where
    }).then(
      function(setting){
        if(!setting){
          return null;
        }
        else{
          return JSON.parse(setting.value);
        }
      }
    );

    findPromise.or = function(defaultValue){
      return findPromise.then(function(value){
        return Promise.resolve(
          (value == null || value == undefined) ?
            defaultValue :
            value
        );
      })
    }

    return findPromise;
  }

  Settings.put = function(game, player, name, value){
    console.log("Settings.put", game, player, name, value);
    var where = {
      name: name
    }
    if(player != undefined){
      where.player = player && player.id;
    }

    if(game != undefined){
      where.game = game && game.id;
    }
    return Settings.findOrCreate({
      where: where
    }).spread(
      function(setting){
        return setting.update({
          value: JSON.stringify(value)
        });
      }
    );
  }

  Settings.forPlayer = function(player){
    return {
      get: Settings.get.bind(null, undefined, player),
      put: Settings.put.bind(null, undefined, player),
      inGame: function(game){
        return {
          get: Settings.get.bind(null, game, player),
          put: Settings.put.bind(null, game, player)
        }
      }
    }
  }

  Settings.inGame = function(game){
    return {
      get: Settings.get.bind(null, game, undefined),
      put: Settings.put.bind(null, game, undefined),
      forPlayer: function(player){
        return {
          get: Settings.get.bind(null, game, player),
          put: Settings.put.bind(null, game, player)
        }
      }
    }
  }

  return Settings;
};

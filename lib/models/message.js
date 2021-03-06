'use strict';
module.exports = function(sequelize, DataTypes) {
  var Message = sequelize.define('Message',
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    raw: DataTypes.STRING(1024*2)
  },
  {
    classMethods: {
      associate: function(models) {
        models.Message.belongsTo(models.GiphyPost, {foreignKey: 'post'});
      }
    }
  });

  return Message;
};

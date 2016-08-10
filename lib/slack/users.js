'use strict';
var Promise = require('promise');

module.exports = function(bot) {
  var promise =  new Promise(function(resolve){
    // @ https://api.slack.com/methods/users.list
    bot.api.users.list({}, function (err, response) {
        if (response.hasOwnProperty('members') && response.ok) {
            var lookup = {};
            response.members.forEach(function(member){
              lookup[member.id] = member;
            });
            resolve(lookup);
        }
        else{
          reject(err);
        }
    });
  });

  promise.get = function(id){
    return promise.then(function(lookup){
      return lookup[id];
    })
  }

  promise.getAll = function(ids){
    return promise.then(function(lookup){
      var result = {};
      (ids || []).forEach(function(id){
        result[id] = lookup[id];
      });
      return result;
    })
  }

  return promise;
};

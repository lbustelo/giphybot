'use strict';
var slack_users;
module.exports = function(bot) {
  if( slack_users ){
    return slack_users;
  }
  slack_users = new Promise(function(resolve, reject){
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

  slack_users.get = function(id){
    return slack_users.then(function(lookup){
      return lookup[id];
    })
  }

  slack_users.getAll = function(ids){
    return slack_users.then(function(lookup){
      var result = {};
      (ids || []).forEach(function(id){
        result[id] = lookup[id];
      });
      return result;
    })
  }

  /**
   * Iterages over objects that container at least {id:<slack_id>} and add
   * user profile details.
   */
  slack_users.decorate = function(users){
    return slack_users.then(function(lookup){
      var promises = users.map(function(user){
        return slack_users.get(user.id).then(
          function(profile){
            user.name = profile.name;
            return user;
          });
      });

      return Promise.all(promises);
    })
  }

  return slack_users;
};

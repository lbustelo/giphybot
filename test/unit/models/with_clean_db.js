var store = require('../../../lib/models');

before(function(){
  //cleans DB before any tests are run
  return store.sequelize.sync({force: true});
})

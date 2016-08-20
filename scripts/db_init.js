var db = require('../lib/models/index.js');

db.sequelize.sync({force:true});

var db = require('./models/index.js');

db.sequelize.sync({force:true});

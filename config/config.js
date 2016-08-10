module.exports = {
  "development": {
    "username": "test",
    "password": "test",
    "database": "test",
    "host": process.env.DB_HOST || "127.0.0.1",
    "dialect": "postgres",
    "migrationStorage": "none"
  },
  "production": {
    "username": "root",
    "password": null,
    "database": "database_production",
    "host": process.env.DB_HOST || "127.0.0.1",
    "dialect": "mysql"
  }
}

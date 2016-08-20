module.exports = {
  "development": {
    "username": "test",
    "password": "test",
    "database": "test",
    "host": process.env.DB_HOST || "127.0.0.1",
    "dialect": "postgres",
    "migrationStorage": "none",
    "logging": (process.env.DB_DEBUG==='true')
  },
  "production": {
    "username": "root",
    "password": null,
    "database": "database_production",
    "host": process.env.DB_HOST || "127.0.0.1",
    "dialect": "postgres",
    "logging": (process.env.DB_DEBUG==='true')
  }
}

module.exports = {
  db: {
    "test": {
      "username": "test",
      "password": "test",
      "database": "giphy_bot_test",
      "host": process.env.DB_HOST || "127.0.0.1",
      "dialect": "postgres",
      "migrationStorage": "none",
      "logging": (process.env.DB_DEBUG==='true')
    },
    "development": {
      "username": "test",
      "password": "test",
      "database": "giphy_bot_dev",
      "host": process.env.DB_HOST || "127.0.0.1",
      "dialect": "postgres",
      "migrationStorage": "none",
      "logging": (process.env.DB_DEBUG==='true')
    },
    "production": {
      "username": "root",
      "password": null,
      "database": "giphy_bot_prod",
      "host": process.env.DB_HOST || "127.0.0.1",
      "dialect": "postgres",
      "logging": (process.env.DB_DEBUG==='true')
    }
  }
}

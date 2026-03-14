require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host:     process.env.DB_HOST     || 'localhost',
      port:     Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME     || 'coreinventory',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
    },
    migrations: { directory: './src/db/migrations', tableName: 'knex_migrations' },
    seeds:      { directory: './src/db/seeds' },
    pool: { min: 2, max: 10 },
  },
  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    migrations: { directory: './src/db/migrations', tableName: 'knex_migrations' },
    pool: { min: 2, max: 10 },
  },
};

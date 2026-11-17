import { defineConfig, PostgreSqlDriver } from '@mikro-orm/postgresql';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  driver: PostgreSqlDriver,
  clientUrl: process.env.DATABASE_URL,
  schema: 'public',
  schemaGenerator: {
    ignoreSchema: [
      'auth',
      'storage',
      'realtime',
      'vault',
      'extensions',
      'graphql',
      'graphql_public',
      'pgbouncer',
      'pgsodium',
      'pgsodium_masks',
    ],
  },
  entities: ['./dist/src/entities/**/*.js'],
  entitiesTs: ['./src/entities/**/*.ts'],
  debug: true,
  driverOptions: {
    connection: {
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
  },
});

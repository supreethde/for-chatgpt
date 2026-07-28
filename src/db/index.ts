// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

const { Pool } = pg;

// Function to create a new connection pool.
export const createPool = () => {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 15000,
    });
  }
  return new Pool({
    host: process.env.SQL_HOST || 'localhost',
    user: process.env.SQL_USER || 'postgres',
    password: process.env.SQL_PASSWORD || '',
    database: process.env.SQL_DB_NAME || 'postgres',
    connectionTimeoutMillis: 15000,
  });
};

let poolInstance: pg.Pool | null = null;

export const getPool = () => {
  if (!poolInstance) {
    poolInstance = createPool();
    poolInstance.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return poolInstance;
};

let dbInstance: ReturnType<typeof drizzle> | null = null;

export const getDb = () => {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
};

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    const instance = getDb() as any;
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});


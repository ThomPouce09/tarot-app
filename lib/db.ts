import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../drizzle/schema';

const sqlite = new Database('./dev.db');
export const db = drizzle(sqlite, { schema });
export const { users, readings } = schema;

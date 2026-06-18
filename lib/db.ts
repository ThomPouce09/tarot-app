import { neon } from '@neondb/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../drizzle/schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

export { db };

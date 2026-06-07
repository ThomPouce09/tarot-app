import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../drizzle/schema';

// Connexion à la base de données Neon
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

export * from '../drizzle/schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno.');
}

// Deshabilitar prefetch para entornos serverless (Vercel / Supabase Pooler).
// max:5 evita agotar el pool de conexiones del Supabase Pooler cuando hay
// muchas instancias serverless corriendo en paralelo.
const client = postgres(process.env.DATABASE_URL, { prepare: false, max: 5 });

export const db = drizzle(client, { schema });

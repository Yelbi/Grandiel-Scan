import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

// Cargar .env.local para que drizzle-kit tenga acceso a DATABASE_URL
config({ path: '.env.local' });

export default {
  schema:  './lib/db/schema.ts',
  out:     './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;

import { defineConfig } from 'drizzle-kit';

// Only used to generate SQL migrations (`npm run db:generate`); no database connection.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
});

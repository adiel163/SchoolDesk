import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db",
  dialect: "postgresql", // Neon Postgres
  // The connection string is read from the DATABASE_URL env var by the Neon serverless driver.
  // drizzle-kit will use the `neon-http` driver under the hood when `auth` is set, but we just need the dialect.
});
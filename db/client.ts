import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ schema: import.meta.env.SCHEMA ? import.meta.env.SCHEMA : undefined }); // placeholder; actual schema imported where needed
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "./db/client";
import { students, teachers, academicSessions, terms, classes, subjects, results, auditLogs } from "./db/schema";

// Better-Auth uses a separate auth schema; we map some of our tables via the adapter.
// For simplicity, we configure email password and add a `role` field via additionalUserFields.
// The adapter is initialized with our Drizzle db instance and the schema tables that Better-Auth expects
// (user, session, account, verification). We'll provide minimal required tables.

export const auth = betterAuth({
  // The drizzle adapter receives our db connection and the schema fragments it needs.
  adapter: drizzleAdapter(db, {
    provider: "pg", // Neon is PostgreSQL
    usePlural: false, // our schema uses singular table names (e.g. "user" not "users")
    // We only need the "user" model for auth; we map it to our `students` table loosely.
    // Better-Auth expects certain columns; we'll rely on the defaults and add extra fields.
    schema: {
      // Provide the tables Better-Auth knows about. We point to our own tables.
      user: students, // using students table as the user store (it has id, email, password etc.)
      // session, account, verification are not needed if we use cookie-based JWT.
    },
  }),
  emailAndPassword: {
    enabled: true,
    // requireEmailVerification: false, // keep simple for now
  },
  // Add a `role` field to the user session.
  additionalUserFields: {
    role: {
      type: "string",
      // role will be stored in user metadata; we'll set it during sign-up / onboarding.
    },
  },
  // Session config: use JWT stored in cookie
  session: {
    // maxAge: 60 * 60 * 24 * 30, // 30 days
  },
  // Trust the origin for Next.js
  trustedOrigins: ["http://localhost:3000", "https://your-app.vercel.app"],
  // Define the base URL for the app
  // baseURL: "http://localhost:3000",
});
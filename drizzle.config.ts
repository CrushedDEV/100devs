import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Next.js reads `.env.local`; drizzle-kit runs outside Next so we load it here.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getEnv } from "@/lib/env";

import * as schema from "./schema";

/**
 * A single pooled connection reused across hot reloads and serverless
 * invocations. `prepare: false` is required by transaction-pooled providers
 * such as Vercel Postgres / Neon / Supabase pgBouncer.
 */
const globalForDb = globalThis as unknown as {
  __sql?: ReturnType<typeof postgres>;
  __db?: DrizzleClient;
};

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

function createClient(): DrizzleClient {
  const { DATABASE_URL } = getEnv();
  const sql =
    globalForDb.__sql ??
    postgres(DATABASE_URL, { max: 5, idle_timeout: 20, prepare: false });

  if (process.env.NODE_ENV !== "production") globalForDb.__sql = sql;
  return drizzle(sql, { schema });
}

/**
 * Connection is opened on first property access rather than at import time, so
 * `next build` can statically analyse modules without a live DATABASE_URL.
 */
export const db = new Proxy({} as DrizzleClient, {
  get(_target, prop, receiver) {
    const client = (globalForDb.__db ??= createClient());
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export type Database = DrizzleClient;
export { schema };

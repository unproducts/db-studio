import { defineHandler, readBody, getQuery, createError, HTTPError } from "h3";
import type { Database } from "db0";

export interface RawHandlerOptions {
  db: Database;
}

type Param = string | number | boolean | undefined | null;

function throwBadRequest(message: string): never {
  throw new HTTPError(message, { status: 400 });
}

function normalizeParams(params: Param | Param[]): Param[] {
  if (!params) return [];
  return Array.isArray(params) ? params : [params];
}

/**
 * Creates a raw SQL handler that executes queries directly
 *
 * - GET: Executes query with db.prepare().all() and returns rows
 * - POST: Executes statement with db.prepare().run() and returns { success: boolean }
 */
export function createHandler(options: RawHandlerOptions) {
  const { db } = options;

  const handler = defineHandler(async (event) => {
    const method = event.req.method;

    if (method === "GET") {
      const query = getQuery<{ sql?: string; params?: string | string[] }>(
        event,
      );
      if (!query.sql) throwBadRequest("SQL query is required");
      const statement = db.prepare(query.sql);
      return { rows: await statement.all(...normalizeParams(query.params)) };
    }

    if (method === "POST") {
      const body = await readBody<{ sql?: string; params?: string | string[] }>(
        event,
      );
      if (!body?.sql) throwBadRequest("SQL query is required");
      const statement = db.prepare(body.sql);
      return {
        success: (await statement.run(...normalizeParams(body.params))).success,
      };
    }

    throw new HTTPError("Method not allowrd", { status: 405 });
  });

  return handler;
}

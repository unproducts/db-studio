import { defineHandler, readBody, HTTPError } from "h3";
import type { Database, SQLDialect } from "db0";

export interface ActionsHandlerOptions {
  db: Database;
}

function throwBadRequest(message: string): never {
  throw new HTTPError(message, { status: 400 });
}

const tableQueries: Record<SQLDialect, string> = {
  sqlite: `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
  postgresql: `SELECT table_name as name FROM information_schema.tables WHERE table_schema='public'`,
  mysql: `SELECT table_name as name FROM information_schema.tables WHERE table_schema=DATABASE()`,
  libsql: `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
};

const columnQueries: Record<SQLDialect, (table: string) => string> = {
  sqlite: (table) => `PRAGMA table_info('${table}')`,
  postgresql: (table) => `SELECT column_name as name, data_type as type, is_nullable FROM information_schema.columns WHERE table_name='${table}' ORDER BY ordinal_position`,
  mysql: (table) => `SELECT column_name as name, data_type as type, is_nullable FROM information_schema.columns WHERE table_name='${table}' ORDER BY ordinal_position`,
  libsql: (table) => `PRAGMA table_info('${table}')`,
};

async function getTables(db: Database) {
  const rows = await db.prepare(tableQueries[db.dialect]).all();
  return { tables: (rows as { name: string }[]).map((row) => row.name) };
}

async function getTableInfo(db: Database, table: string) {
  const rows = await db.prepare(columnQueries[db.dialect](table)).all();
  
  if (db.dialect === 'sqlite' || db.dialect === 'libsql') {
    // PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
    const columns = (rows as { name: string; type: string; notnull: number }[]).map((row) => ({
      name: row.name,
      type: row.type || 'TEXT',
      nullable: row.notnull === 0,
    }));
    return { columns };
  } else {
    // PostgreSQL/MySQL: is_nullable is 'YES' or 'NO'
    const columns = (rows as { name: string; type: string; is_nullable: string }[]).map((row) => ({
      name: row.name,
      type: row.type,
      nullable: row.is_nullable === 'YES',
    }));
    return { columns };
  }
}

export function createHandler(options: ActionsHandlerOptions) {
  const { db } = options;

  const handler = defineHandler(async (event) => {
    if (event.req.method !== "POST") {
      throw new HTTPError("Method not allowed", { status: 405 });
    }

    const body = await readBody<{ action?: string; table?: string }>(event);
    if (!body?.action) throwBadRequest("Action is required");

    switch (body.action) {
      case "getTables":
        return getTables(db);
      case "getTableInfo":
        if (!body.table) throwBadRequest("Table name is required");
        return getTableInfo(db, body.table);
      default:
        throwBadRequest(`Unknown action: ${body.action}`);
    }
  });

  return handler;
}

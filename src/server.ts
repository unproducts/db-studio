import { serve } from "srvx";
import { defineHandler } from "h3";
import { createDatabase } from "db0";
import { parseURL, withoutBase } from "ufo";
import type { Database, Connector, ConnectorOptions } from "db0";
import { createHandler as createRawHandler } from "./handlers/raw.js";
import { createHandler as createActionsHandler } from "./handlers/actions.js";

/**
 * Supported database types for the server
 */
export type DatabaseType = "sqlite" | "postgresql" | "mysql";

/**
 * Connection options mapped by database type
 */
export type ConnectionOptions<T extends DatabaseType> = T extends "sqlite"
  ? ConnectorOptions["node-sqlite"]
  : T extends "postgresql"
    ? ConnectorOptions["postgresql"]
    : T extends "mysql"
      ? ConnectorOptions["mysql2"]
      : never;

/**
 * Handler configuration options
 */
export interface HandlerOptions<T extends DatabaseType = DatabaseType> {
  /**
   * Database type to use
   */
  db: T;
  /**
   * Connection options specific to the database type
   */
  connectionOptions: ConnectionOptions<T>;
}

/**
 * Server configuration options
 */
export interface ServerOptions<
  T extends DatabaseType = DatabaseType,
> extends HandlerOptions<T> {
  /**
   * Host to bind the server to
   */
  host?: string;
  /**
   * Port to listen on
   */
  port?: number;
}

/**
 * Dynamically imports the appropriate database connector based on type
 */
async function getConnector<T extends DatabaseType>(
  type: T,
  options: ConnectionOptions<T>,
): Promise<Connector> {
  switch (type) {
    case "sqlite": {
      const { default: sqliteConnector } =
        await import("db0/connectors/node-sqlite");
      return sqliteConnector(options as ConnectorOptions["node-sqlite"]);
    }
    case "postgresql": {
      const { default: postgresqlConnector } =
        await import("db0/connectors/postgresql");
      return postgresqlConnector(options as ConnectorOptions["postgresql"]);
    }
    case "mysql": {
      const { default: mysqlConnector } = await import("db0/connectors/mysql2");
      return mysqlConnector(options as ConnectorOptions["mysql2"]);
    }
    default:
      throw new Error(`Unsupported database type: ${type}`);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Creates the root request handler with path-based routing
 *
 * @param db - Database instance to use for handlers
 * @returns A fetch-compatible request handler
 */
function createRootHandler(db: Database) {
  const rawHandler = createRawHandler({ db });
  const actionsHandler = createActionsHandler({ db });

  const handler = defineHandler(async (event) => {
    // Handle CORS preflight
    if (event.req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const { pathname } = parseURL(event.req.url);

    let response: Response;

    if (withoutBase(pathname, "/raw") !== pathname) {
      response = (await rawHandler.fetch(event.req)) as Response;
    } else if (withoutBase(pathname, "/actions") !== pathname) {
      response = (await actionsHandler.fetch(event.req)) as Response;
    } else {
      response = Response.json({ error: "Not found" }, { status: 404 });
    }

    return withCors(response);
  });

  return handler;
}

/**
 * Creates a request handler with database integration
 *
 * @param options - Handler configuration including database type and connection details
 * @returns A fetch-compatible request handler
 *
 * @example
 * ```ts
 * const handler = await createHandler({
 *   db: 'sqlite',
 *   connectionOptions: { name: 'mydb' }
 * });
 * ```
 */
export async function createHandler<T extends DatabaseType>(
  options: HandlerOptions<T>,
): Promise<(request: Request) => Promise<Response>> {
  const connector = await getConnector(options.db, options.connectionOptions);
  const db: Database = createDatabase(connector);

  const rootHandler = createRootHandler(db);

  return (request: Request) => rootHandler.fetch(request) as Promise<Response>;
}

/**
 * Creates and starts an HTTP server with database integration
 *
 * @param options - Server configuration including database type, connection details, host, and port
 * @returns The server instance from srvx
 *
 * @example
 * ```ts
 * import { createServer } from 'nuxtup';
 *
 * const server = await createServer({
 *   db: 'sqlite',
 *   connectionOptions: { name: 'mydb' },
 *   host: 'localhost',
 *   port: 3000
 * });
 * ```
 */
export async function createServer<T extends DatabaseType>(
  options: ServerOptions<T>,
) {
  const handler = await createHandler({
    db: options.db,
    connectionOptions: options.connectionOptions,
  });

  const server = serve({
    fetch: handler,
    hostname: options.host ?? "localhost",
    port: options.port ?? 3000,
    manual: true,
  });

  return server;
}

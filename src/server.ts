import { serve } from "srvx";
import { H3 } from "h3";
import { createDatabase } from "db0";
import type { Database, Connector, ConnectorOptions } from "db0";
import { createHandler as createRawHandler } from "./handlers/raw.js";
import { createHandler as createActionsHandler } from "./handlers/actions.js";
import { serveUIStatic } from "./static-serve.js";

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
  /**
   * Whether to serve built-in static UI assets
   */
  serveUI: boolean;
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
  options: ConnectionOptions<T>
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

/**
 * Creates the root request handler with path-based routing
 *
 * @param db - Database instance to use for handlers
 * @param serveUI - Whether to serve the built-in UI
 * @returns H3 app instance
 */
function createRootHandler(db: Database, serveUI: boolean = false) {
  const rawHandler = createRawHandler({ db });
  const actionsHandler = createActionsHandler({ db });

  const app = new H3();

  // CORS middleware
  app.use((event) => {
    if (event.req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
  });

  // API routes
  app.all("/raw/**", rawHandler);
  app.all("/actions/**", actionsHandler);

  // Serve UI if enabled (catchall)
  if (serveUI) {
    app.get("/**", (event) => serveUIStatic(event));
  }

  return app;
}

/**
 * Creates a request handler with database integration
 *
 * @param options - Handler configuration including database type and connection details
 * @returns A fetch-compatible request handler
 *
 * @example
 * ```ts
 * import { createHandler } from '@unproducts/db-studio';
 *
 * const handler = await createHandler({
 *   db: 'sqlite',
 *   connectionOptions: { path: './mydb.sqlite' }
 * });
 *
 * // Use with any server framework
 * Bun.serve({ fetch: handler });
 * ```
 */
export async function createHandler<T extends DatabaseType>(
  options: HandlerOptions<T>
): Promise<(request: Request) => Promise<Response>> {
  const connector = await getConnector(options.db, options.connectionOptions);
  const db: Database = createDatabase(connector);

  const app = createRootHandler(db, options.serveUI);

  return (request: Request) => app.fetch(request) as Promise<Response>;
}

/**
 * Creates and starts an HTTP server with database integration
 *
 * @param options - Server configuration including database type, connection details, host, and port
 * @returns The server instance from srvx
 *
 * @example
 * ```ts
 * import { createServer } from '@unproducts/db-studio';
 *
 * const server = await createServer({
 *   db: 'sqlite',
 *   connectionOptions: { path: './mydb.sqlite' },
 *   host: 'localhost',
 *   port: 3000
 * });
 *
 * server.serve();
 * ```
 */
export async function createServer<T extends DatabaseType>(
  options: ServerOptions<T>
) {
  const handler = await createHandler({
    db: options.db,
    connectionOptions: options.connectionOptions,
    serveUI: !!options.serveUI,
  });

  const server = serve({
    fetch: handler,
    hostname: options.host ?? "localhost",
    port: options.port ?? 3000,
    manual: true,
  });

  return server;
}

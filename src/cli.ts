#!/usr/bin/env node
import { resolve } from "node:path";
import { defineCommand, runMain } from "citty";
import { createServer, type DatabaseType } from "./server.js";

const main = defineCommand({
  meta: {
    name: "@unproducts/db-studio",
    description: "Database server CLI - expose db0 databases via HTTP",
  },
  args: {
    db: {
      type: "string",
      description: "Database type: sqlite, postgresql, or mysql",
      required: true,
    },
    port: {
      type: "string",
      description: "Port to listen on",
      default: "3000",
    },
    host: {
      type: "string",
      description: "Hostname to listen on",
      default: "localhost",
    },
    // SQLite options
    path: {
      type: "string",
      description: "SQLite database file path",
    },
    // PostgreSQL/MySQL options
    url: {
      type: "string",
      description: "Database connection URL (PostgreSQL)",
    },
    dbHost: {
      type: "string",
      description: "Database host (PostgreSQL/MySQL)",
    },
    dbPort: {
      type: "string",
      description: "Database port (PostgreSQL/MySQL)",
    },
    dbUser: {
      type: "string",
      description: "Database user (PostgreSQL/MySQL)",
    },
    dbPassword: {
      type: "string",
      description: "Database password (PostgreSQL/MySQL)",
    },
    dbName: {
      type: "string",
      description: "Database name (PostgreSQL/MySQL)",
    },
  },
  async run({ args }) {
    const dbType = args.db as DatabaseType;

    if (!["sqlite", "postgresql", "mysql"].includes(dbType)) {
      console.error(
        `Invalid database type: ${dbType}. Must be one of: sqlite, postgresql, mysql`,
      );
      process.exit(1);
    }

    let connectionOptions: unknown;

    switch (dbType) {
      case "sqlite": {
        const dbPath = args.path ? resolve(args.path) : undefined;
        connectionOptions = {
          path: dbPath,
          name: dbPath ? undefined : "db",
        };
        break;
      }
      case "postgresql": {
        if (args.url) {
          connectionOptions = { url: args.url };
        } else {
          connectionOptions = {
            host: args.dbHost || "localhost",
            port: args.dbPort ? Number.parseInt(args.dbPort, 10) : 5432,
            user: args.dbUser,
            password: args.dbPassword,
            database: args.dbName,
          };
        }
        break;
      }
      case "mysql": {
        connectionOptions = {
          host: args.dbHost || "localhost",
          port: args.dbPort ? Number.parseInt(args.dbPort, 10) : 3306,
          user: args.dbUser,
          password: args.dbPassword,
          database: args.dbName,
        };
        break;
      }
    }

    const port = Number.parseInt(args.port, 10);

    const server = await createServer({
      db: dbType,
      connectionOptions: connectionOptions as never,
      host: args.host,
      port,
    });

    server.serve();
  },
});

runMain(main);

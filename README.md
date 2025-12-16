# DB Studio

<!-- automd:badges color=yellow -->

[![npm version](https://img.shields.io/npm/v/@unproducts/db-studio?color=yellow)](https://npmjs.com/package/@unproducts/db-studio)
[![npm downloads](https://img.shields.io/npm/dm/@unproducts/db-studio?color=yellow)](https://npm.chart.dev/@unproducts/db-studio)

<!-- /automd -->

Lightweight server that exposes your database over HTTP API. Ships with a minimal UI and CLI. Supports SQLite, PostgreSQL, and MySQL.

Think of it as light weight Drizzle studio.

## Installation

```sh
npm install @unproducts/db-studio
```

## CLI

```sh
# SQLite
npx @unproducts/db-studio --db sqlite --path ./mydb.sqlite

# PostgreSQL
npx @unproducts/db-studio --db postgresql --url "postgres://user:pass@localhost:5432/mydb"

# MySQL
npx @unproducts/db-studio --db mysql --dbHost localhost --dbUser root --dbName mydb
```

Server starts on `http://localhost:3000` by default. Use `--port` and `--host` to customize.

## Programmatic Usage

### High-level: `createServer`

Use `createServer` to quickly spin up a standalone HTTP server:

```ts
import { createServer } from "@unproducts/db-studio";

const server = await createServer({
  db: "sqlite",
  connectionOptions: { path: "./mydb.sqlite" },
  host: "localhost",
  port: 3000,
});

server.serve();
```

### Low-level: `createHandler`

Use `createHandler` to get a fetch-compatible request handler that you can integrate with any server framework:

```ts
import { createHandler } from "@unproducts/db-studio";

const handler = await createHandler({
  db: "sqlite",
  connectionOptions: { path: "./mydb.sqlite" },
});

// Use with Bun
Bun.serve({ fetch: handler, port: 3000 });

// Use with Deno
Deno.serve({ port: 3000 }, handler);

// Use with Node.js (via adapters like @hono/node-server)
```

### Connection Options

#### SQLite

```ts
connectionOptions: { path: "./mydb.sqlite" }
```

#### PostgreSQL

```ts
// Using URL
connectionOptions: { url: "postgres://user:pass@localhost:5432/mydb" }

// Using individual options
connectionOptions: {
  host: "localhost",
  port: 5432,
  user: "user",
  password: "pass",
  database: "mydb",
}
```

#### MySQL

```ts
connectionOptions: {
  host: "localhost",
  port: 3306,
  user: "root",
  password: "pass",
  database: "mydb",
}
```

## Endpoints

### `POST /actions`

High-level database operations.

```sh
# List tables
curl -X POST http://localhost:3000/actions \
  -H "Content-Type: application/json" \
  -d '{"action": "getTables"}'

# Get table columns
curl -X POST http://localhost:3000/actions \
  -H "Content-Type: application/json" \
  -d '{"action": "getTableInfo", "table": "users"}'
```

### `GET|POST /raw`

Execute raw SQL queries.

```sh
# SELECT (GET)
curl "http://localhost:3000/raw?sql=SELECT%20*%20FROM%20users"

# INSERT/UPDATE/DELETE (POST)
curl -X POST http://localhost:3000/raw \
  -H "Content-Type: application/json" \
  -d '{"sql": "INSERT INTO users (name) VALUES (?)", "params": ["Alice"]}'
```

## License

<!-- automd:contributors license=MIT -->

Published under the [MIT](https://github.com/unproducts/db-studio/blob/main/LICENSE) license.
Made by [community](https://github.com/unproducts/db-studio/graphs/contributors) 💛
<br><br>
<a href="https://github.com/unproducts/db-studio/graphs/contributors">
<img src="https://contrib.rocks/image?repo=unproducts/db-studio" />
</a>

<!-- /automd -->

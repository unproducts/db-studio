# DB Studio

<!-- automd:badges color=yellow -->

[![npm version](https://img.shields.io/npm/v/db-studio?color=yellow)](https://npmjs.com/package/db-studio)
[![npm downloads](https://img.shields.io/npm/dm/db-studio?color=yellow)](https://npm.chart.dev/db-studio)

<!-- /automd -->

Lightweight server that exposes your database over HTTP API. Ships with a minimal UI and CLI. Supports SQLite, PostgreSQL, and MySQL.

Think of it as light weight Drizzle studio.

## CLI

```sh
# SQLite
npx db-studio --db sqlite --path ./mydb.sqlite

# PostgreSQL
npx db-studio --db postgresql --url "postgres://user:pass@localhost:5432/mydb"

# MySQL
npx db-studio --db mysql --dbHost localhost --dbUser root --dbName mydb
```

Server starts on `http://localhost:3000` by default. Use `--port` and `--host` to customize.

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

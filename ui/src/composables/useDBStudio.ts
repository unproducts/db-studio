import { ofetch } from "ofetch";

const api = ofetch.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

export default function useDBStudio() {
  return {
    query: <T = Record<string, unknown>>(sql: string) =>
      api<{ rows: T[] }>("/raw", { method: "GET", query: { sql } }),

    exec: (sql: string) =>
      api<{ success: boolean }>("/raw", { method: "POST", body: { sql } }),

    listTables: () =>
      api<{ tables: string[] }>("/actions", { method: "POST", body: { action: "getTables" } }),

    getTableInfo: (table: string) =>
      api<{ columns: { name: string; type: string; nullable: boolean }[] }>("/actions", { method: "POST", body: { action: "getTableInfo", table } }),
  };
}

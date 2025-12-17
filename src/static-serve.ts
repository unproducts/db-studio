import { serveStatic, type H3Event } from "h3";
import { readFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const uiDir = join(__dirname, "../dist-ui");

/**
 * Serves static UI assets from the dist-ui directory
 */
export function serveUIStatic(event: H3Event) {
  return serveStatic(event, {
    indexNames: ["index.html"],
    getContents: (id) => readFile(join(uiDir, id)),
    getMeta: async (id) => {
      const stats = await stat(join(uiDir, id)).catch(() => {});
      if (stats?.isFile()) {
        return {
          size: stats.size,
          mtime: stats.mtimeMs,
        };
      }
    },
  });
}

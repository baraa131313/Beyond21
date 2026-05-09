import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const clientDir = join(__dirname, "dist", "client");

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

async function serveStatic(req, res) {
  const filePath = join(clientDir, req.url.split("?")[0]);
  try {
    const s = await stat(filePath);
    if (!s.isFile()) return false;
    const ext = extname(filePath);
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    const data = await readFile(filePath);
    const headers = { "Content-Type": mime, "Content-Length": data.length };
    if (req.url.includes("/assets/")) {
      headers["Cache-Control"] = "public, max-age=31536000, immutable";
    }
    res.writeHead(200, headers);
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

const mod = await import("./dist/server/server.js");
const handler = mod.default?.fetch || mod.fetch;

const port = process.env.PORT || 3000;

const server = createServer(async (req, res) => {
  if (await serveStatic(req, res)) return;

  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host || `localhost:${port}`;
  const url = new URL(req.url, `${protocol}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }

  let body = undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = Buffer.concat(chunks);
  }

  const request = new Request(url.toString(), {
    method: req.method,
    headers,
    body,
  });

  try {
    const response = await handler(request);
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        res.write(value);
      }
    } else {
      res.end(await response.text());
    }
  } catch (err) {
    console.error("SSR error:", err);
    res.writeHead(500);
    res.end("Internal Server Error");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Frontend listening on port ${port}`);
});

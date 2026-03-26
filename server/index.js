import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { createServer } from "node:http";
import { aggregateWeather } from "./weather-core.js";

const PORT = Number(process.env.PORT || 8788);
const DIST_DIR = resolve(process.cwd(), "dist");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};

const sendJson = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
};

const serveFile = (res, filePath) => {
  const ext = extname(filePath);
  const type = mimeTypes[ext] || "application/octet-stream";
  res.writeHead(200, { "content-type": type });
  createReadStream(filePath).pipe(res);
};

createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (url.pathname === "/api/weather") {
    try {
      const payload = await aggregateWeather({
        weatherApiKey: process.env.WEATHERAPI_KEY,
        openWeatherKey: process.env.OPENWEATHER_KEY,
      });
      sendJson(res, 200, payload);
      return;
    } catch {
      sendJson(res, 500, { error: "Weather aggregation failed" });
      return;
    }
  }

  const requestPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = join(DIST_DIR, requestPath);
  const safePath = resolve(filePath);

  if (!safePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (existsSync(safePath) && statSync(safePath).isFile()) {
    serveFile(res, safePath);
    return;
  }

  const fallback = join(DIST_DIR, "index.html");
  if (existsSync(fallback)) {
    serveFile(res, fallback);
    return;
  }

  res.writeHead(404);
  res.end(readFileSync(join(process.cwd(), "index.html"), "utf-8"));
}).listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

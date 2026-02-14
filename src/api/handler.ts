import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../../server/routes";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      console.log(logLine);
    }
  });

  next();
});

// Direct devices endpoint with robust file loading (bypasses tropeConstraints cache issues)
app.get("/api/devices", (_req, res) => {
  try {
    const handlerDir = dirname(fileURLToPath(import.meta.url));
    const searchPaths = [
      join(handlerDir, 'data', 'rhetorical_figures_cleaned.json'),
      join(handlerDir, '..', 'data', 'rhetorical_figures_cleaned.json'),
      join(handlerDir, '..', 'api', 'data', 'rhetorical_figures_cleaned.json'),
      join(process.cwd(), 'data', 'rhetorical_figures_cleaned.json'),
      join(process.cwd(), 'api', 'data', 'rhetorical_figures_cleaned.json'),
      '/var/task/data/rhetorical_figures_cleaned.json',
      '/var/task/api/data/rhetorical_figures_cleaned.json',
    ];
    console.log(`[devices] handlerDir: ${handlerDir}, cwd: ${process.cwd()}`);
    for (const p of searchPaths) {
      if (existsSync(p)) {
        console.log(`[devices] Found data at: ${p}`);
        const raw = JSON.parse(readFileSync(p, 'utf-8'));
        const deviceList = raw.map((d: any) => ({
          figure_name: d.figure_name,
          definition: d.definition,
        }));
        deviceList.sort((a: any, b: any) => a.figure_name.localeCompare(b.figure_name));
        return res.json(deviceList);
      }
    }
    // Log filesystem contents for debugging
    const debugPaths = [handlerDir, process.cwd(), '/var/task', '/var/task/api', '/var/task/data'];
    for (const dp of debugPaths) {
      try {
        const contents = readdirSync(dp);
        console.log(`[devices] ls ${dp}: ${contents.join(', ')}`);
      } catch (e) {
        console.log(`[devices] ls ${dp}: ERROR ${e}`);
      }
    }
    console.error(`[devices] Data file not found. Searched: ${searchPaths.join(', ')}`);
    return res.status(500).json({ error: 'Rhetorical devices data file not found', searchPaths, handlerDir, cwd: process.cwd() });
  } catch (error) {
    console.error('[devices] Error:', error);
    return res.status(500).json({ error: 'Failed to load devices' });
  }
});

// Register all routes
let routesRegistered = false;
const initPromise = (async () => {
  if (!routesRegistered) {
    await registerRoutes(app);
    routesRegistered = true;
  }
})();

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Export for Vercel
export default async function handler(req: Request, res: Response) {
  await initPromise;
  return app(req, res);
}

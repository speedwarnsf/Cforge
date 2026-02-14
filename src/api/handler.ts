import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../../server/routes";
import rhetoricalDevicesData from "../../data/rhetorical_figures_cleaned.json";

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

// Direct devices endpoint — data is bundled by esbuild via static import
app.get("/api/devices", (_req, res) => {
  try {
    const deviceList = (rhetoricalDevicesData as any[]).map((d: any) => ({
      figure_name: d.figure_name,
      definition: d.definition,
    }));
    deviceList.sort((a: any, b: any) => a.figure_name.localeCompare(b.figure_name));
    return res.json(deviceList);
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

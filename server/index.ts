import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { precomputeCorpusEmbeddings } from "./utils/embeddingRetrieval";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Start precomputing corpus embeddings in background
  precomputeCorpusEmbeddings().catch(err => {
    console.error("❌ Failed to precompute corpus embeddings:", err);
  });
  
  // Pre-warm theory cache for improved performance
  const { preWarmTheoryCache } = await import("./utils/enhancedTheoryMapping");
  preWarmTheoryCache();
  
  // Serve static downloads BEFORE other routes to avoid conflicts
  app.use('/downloads', express.static('static'));
  
  // Redirect old routes to main app
  app.get('/test-interface.html', (req, res) => {
    res.redirect('/');
  });
  
  app.get('/code-share', (req, res) => {
    res.redirect('/');
  });
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });
  
  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      log(`Port ${port} is already in use. Attempting to retry in 2 seconds...`);
      setTimeout(() => {
        server.close();
        server.listen(port, "0.0.0.0", () => {
          log(`serving on port ${port}`);
        });
      }, 2000);
    } else {
      log(`Server error: ${err.message}`);
      throw err;
    }
  });

  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();

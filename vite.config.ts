import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better performance
        manualChunks(id) {
          // React core - cached long-term
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor';
          }
          // Radix UI primitives
          if (id.includes('@radix-ui/')) {
            return 'ui';
          }
          // React Query
          if (id.includes('@tanstack/react-query')) {
            return 'query';
          }
          // Recharts + d3 - include in vendor to avoid circular dependency TDZ errors
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-vendor') || id.includes('node_modules/decimal.js-light')) {
            return 'vendor';
          }
          // Framer motion
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) {
            return 'motion';
          }
          // Markdown rendering
          if (id.includes('react-markdown') || id.includes('remark-') || id.includes('rehype-') || id.includes('unified') || id.includes('mdast-') || id.includes('hast-') || id.includes('micromark')) {
            return 'markdown';
          }
          // Utility libs
          if (id.includes('node_modules/clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
            return 'utils';
          }
          // Lucide icons
          if (id.includes('lucide-react')) {
            return 'icons';
          }
        }
      }
    },
    // Increase chunk size warning limit to 1000kb but aim to keep under 500kb
    chunkSizeWarningLimit: 1000,
    // CSS code splitting
    cssCodeSplit: true,
    // Optimize bundle size
    sourcemap: false, // Disable sourcemaps in production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific console methods
        passes: 2 // Multiple passes for better compression
      },
      mangle: {
        safari10: true // Fix safari 10 issues
      },
      output: {
        comments: false // Remove all comments
      }
    },
    // Additional optimizations
    assetsInlineLimit: 4096, // Inline small assets < 4kb
    reportCompressedSize: true, // Report compressed size in build
    target: 'es2020' // Modern target for smaller bundle
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});

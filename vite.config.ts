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
        manualChunks: {
          // Vendor chunks
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover'],
          query: ['@tanstack/react-query'],
          motion: ['framer-motion'],
          // Utils
          utils: ['clsx', 'tailwind-merge', 'class-variance-authority'],
          // Lucide icons separate chunk to prevent bloat
          icons: ['lucide-react'],
          // Typography and larger UI components
          typography: ['react-markdown']
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

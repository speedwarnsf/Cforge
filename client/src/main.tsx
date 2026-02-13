import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Performance monitoring
if (process.env.NODE_ENV === 'development') {
  console.log("ConceptForge Development Mode");
}

// Only clear caches in development or when explicitly requested
const shouldClearCaches = process.env.NODE_ENV === 'development' || 
  new URLSearchParams(window.location.search).has('clearCache');

if (shouldClearCaches) {
  // Force clear all caches and unregister service workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
        console.log('Unregistered SW:', registration);
      }
    });
  }

  if ('caches' in window) {
    caches.keys().then(function(names) {
      for (let name of names) {
        caches.delete(name);
        console.log('Deleted cache:', name);
      }
    });
  }
}

const container = document.getElementById("root");
if (!container) {
  console.error("Root element not found");
  throw new Error("Root element not found");
}

console.log("Root element found, creating React root...");
const root = createRoot(container);
console.log("🚀 Rendering App component...");

// Add responsive viewport handling
const setViewportHeight = () => {
  // Fix viewport height issues on mobile browsers
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

window.addEventListener('resize', setViewportHeight);
setViewportHeight();

root.render(<App />);
console.log("App component rendered successfully");

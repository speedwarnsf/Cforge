// Cache bust: Force React render 2025-07-18-04:49
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Debug React rendering
console.log("🔥 React Main.tsx Loading...");

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

const container = document.getElementById("root");
if (!container) {
  console.error("❌ Root element not found");
  throw new Error("Root element not found");
}

console.log("✅ Root element found, creating React root...");
const root = createRoot(container);
console.log("🚀 Rendering App component...");

// Add fullscreen capabilities
const requestFullscreen = () => {
  const elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if ((elem as any).webkitRequestFullscreen) {
    (elem as any).webkitRequestFullscreen();
  } else if ((elem as any).msRequestFullscreen) {
    (elem as any).msRequestFullscreen();
  }
};

// Auto-request fullscreen on user interaction
let fullscreenRequested = false;
const handleFirstInteraction = () => {
  if (!fullscreenRequested) {
    fullscreenRequested = true;
    requestFullscreen();
    document.removeEventListener('click', handleFirstInteraction);
    document.removeEventListener('touchstart', handleFirstInteraction);
  }
};

document.addEventListener('click', handleFirstInteraction);
document.addEventListener('touchstart', handleFirstInteraction);

// Add fullscreen class to body
document.body.classList.add('fullscreen-app');

root.render(<App />);
console.log("✅ App component rendered successfully");

import { createRoot } from "react-dom/client";
import App from "./App-minimal";
import "./index.css";

// Only clear caches when explicitly requested via URL param
if (new URLSearchParams(window.location.search).has('clearCache')) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => r.unregister());
    });
  }
  if ('caches' in window) {
    caches.keys().then(names => names.forEach(n => caches.delete(n)));
  }
}

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");

const root = createRoot(container);

// Responsive viewport height for mobile browsers
const setViewportHeight = () => {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
};
window.addEventListener('resize', setViewportHeight);
setViewportHeight();

root.render(<App />);

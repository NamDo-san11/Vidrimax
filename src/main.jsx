import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "aos/dist/aos.css";
import App from "./App.jsx";
import AOS from "aos";

// Inicializar AOS (animaciones on scroll)
AOS.init({ duration: 1000, once: true });

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Registrar Service Worker para PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => {
        console.log("✅ Service Worker registrado:", reg.scope);
      })
      .catch((err) => {
        console.error("❌ Error al registrar Service Worker:", err);
      });
  });
}

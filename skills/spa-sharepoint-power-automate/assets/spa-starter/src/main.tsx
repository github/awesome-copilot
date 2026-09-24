import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { registerSW } from "./lib/registerSW";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Solo en produccion: en dev el SW cachearia modulos de Vite y confundiria.
if (import.meta.env.PROD) registerSW();

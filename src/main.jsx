import { createRoot } from "react-dom/client";
import App from "./App";
import { EDIT } from "./theatre";
import "./styles.css";

async function boot() {
  // El estudio de Theatre solo se carga con /?edit
  if (EDIT) {
    const [{ default: studio }, { default: extension }] = await Promise.all([
      import("@theatre/studio"),
      import("@theatre/r3f/dist/extension"),
    ]);
    studio.extend(extension);
    studio.initialize();
  }
  createRoot(document.getElementById("root")).render(<App />);
}

boot();

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Hide splash screen after app renders
const hideSplash = () => {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    setTimeout(() => {
      splash.style.opacity = "0";
      setTimeout(() => splash.remove(), 400);
    }, 600); // Show splash for at least 600ms
  }
};

createRoot(document.getElementById("root")!).render(<App />);
hideSplash();

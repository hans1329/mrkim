import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Set --app-height CSS variable to fix iOS PWA bottom gap
const setAppHeight = () => {
  document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
};
setAppHeight();
window.addEventListener("resize", setAppHeight);
// Also listen to orientationchange for iOS
window.addEventListener("orientationchange", () => {
  setTimeout(setAppHeight, 100);
});

// Hide splash screen after app renders
const hideSplash = () => {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    setTimeout(() => {
      splash.style.opacity = "0";
      setTimeout(() => splash.remove(), 400);
    }, 600);
  }
};

createRoot(document.getElementById("root")!).render(<App />);
hideSplash();

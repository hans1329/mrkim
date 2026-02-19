import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// MetaMask 등 Web3 확장 프로그램의 자동 연결 시도로 인한 에러 억제
window.addEventListener("unhandledrejection", (event) => {
  const msg = event.reason?.message || String(event.reason || "");
  if (
    msg.includes("MetaMask") ||
    msg.includes("ethereum") ||
    msg.includes("Web3") ||
    msg.includes("wallet")
  ) {
    event.preventDefault();
  }
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

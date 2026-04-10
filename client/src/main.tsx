import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress Vite dev overlay for expected browser media errors so they don't
// interrupt the user. These are handled gracefully inside the video player.
window.addEventListener("unhandledrejection", (e) => {
  const msg = e?.reason?.message ?? "";
  if (
    msg.includes("play() request was interrupted") ||
    msg.includes("The play() request") ||
    msg.includes("AbortError") ||
    msg.includes("no supported sources")
  ) {
    e.preventDefault();
  }
});
window.addEventListener("error", (e) => {
  const msg = e?.message ?? "";
  if (msg.includes("no supported sources") || msg.includes("AbortError")) {
    e.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);

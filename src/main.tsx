import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme before first paint
const savedTheme = localStorage.getItem("fitlab-theme") || "dark";
document.documentElement.classList.add(savedTheme);

createRoot(document.getElementById("root")!).render(<App />);

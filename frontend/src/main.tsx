import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router";
import App from "./app/App.tsx";
import MobilePage from "./app/MobilePage.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/mobile" element={<MobilePage />} />
    </Routes>
  </HashRouter>
);

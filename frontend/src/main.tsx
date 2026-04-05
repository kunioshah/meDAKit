import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import LandingPage from "./app/LandingPage.tsx";
import PatientSelectPage from "./app/PatientSelectPage.tsx";
import App from "./app/App.tsx";
import MobilePage from "./app/MobilePage.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/patient/:id" element={<PatientSelectPage />} />
      <Route path="/patient/:id/session" element={<App />} />
      <Route path="/mobile" element={<MobilePage />} />
    </Routes>
  </BrowserRouter>
);

/**
 * @file main.tsx
 * @description Application entry point. Mounts the React app and defines all
 * client-side routes via react-router. Routes:
 *   /                       — Device select (PatientSelectPage)
 *   /patients               — Laptop patient grid (LandingPage)
 *   /phone-connected        — Post-QR options page (PhoneConnectedPage)
 *   /patient/:id/session    — Laptop session / prompting page (App)
 *   /mobile                 — Mobile patient list (MobilePatientListPage)
 *   /mobile/patient/:id     — Mobile session / camera page (MobilePage)
 */
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import LandingPage from "./app/LandingPage.tsx";
import PatientSelectPage from "./app/PatientSelectPage.tsx";
import PhoneConnectedPage from "./app/PhoneConnectedPage.tsx";
import App from "./app/App.tsx";
import MobilePage from "./app/MobilePage.tsx";
import MobilePatientListPage from "./app/MobilePatientListPage.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<PatientSelectPage />} />
      <Route path="/patients" element={<LandingPage />} />
      <Route path="/phone-connected" element={<PhoneConnectedPage />} />
      <Route path="/patient/:id/session" element={<App />} />
      <Route path="/mobile" element={<MobilePatientListPage />} />
      <Route path="/mobile/patient/:id" element={<MobilePage />} />
    </Routes>
  </BrowserRouter>
);

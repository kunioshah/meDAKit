/**
 * @file App.tsx
 * @description Laptop session page for an active patient (/patient/:id/session).
 * Polls /api/phone-data every 2s to receive input from a connected phone.
 * Loads patient info on mount and passes it to the PatientInfoPanel sidebar.
 * Passes the patient ID to ConnectModal so the QR code links directly to this
 * patient's mobile session. Hosts the DataDisplay input/output area where
 * text and images are submitted and saved to conversations.json.
 */
import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { Header } from './components/header';
import { DataDisplay } from './components/data-display';
import { PatientInfoPanel } from './components/patient-info-panel';
import { PlusBackground } from './components/plus-background';
import { ConnectModal } from './components/ConnectModal';

interface PatientInfo {
  sex?: string;
  age?: string;
  medications?: string;
  allergies?: string;
  medical_history?: string;
}

export default function App() {
  const { id } = useParams<{ id: string }>();
  const [patientInfo, setPatientInfo] = useState<PatientInfo | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    fetch('/api/patients/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: id }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setPatientInfo(d.patient_info))
      .catch(() => {});
  }, [id]);
  const [medicalData, setMedicalData] = useState<{
    text?: string;
    images?: string[];
  }>({});

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/phone-data');
        if (res.ok) {
          const data = await res.json();
          if (data.text || data.images) setMedicalData(data);
        }
      } catch {}
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => clearInterval(id);
  }, []);
  const [isPatientPanelOpen, setIsPatientPanelOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  return (
    <div className="h-screen bg-[#f5f5f5] relative overflow-hidden flex flex-col">
      <PlusBackground />

      <div className="relative z-10 flex-1 min-h-0 flex flex-col overflow-hidden">
        <Header onConnectToPhone={() => setIsConnectModalOpen(true)} />

        <main className="flex-1 min-h-0 flex flex-col max-w-[960px] mx-auto w-full px-6 py-6">
          <DataDisplay data={medicalData} patientId={id} />
        </main>
      </div>

      <PatientInfoPanel
        isOpen={isPatientPanelOpen}
        onClose={() => setIsPatientPanelOpen(false)}
        patientId={id}
        patientInfo={patientInfo}
      />

      <ConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        patientId={id}
      />

      {/* Patient Info Button - Fixed on Side */}
      <button
        onClick={() => setIsPatientPanelOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-[#7ed957] hover:bg-[#6ec847] text-black px-4 py-4 md:py-6 rounded-l-xl shadow-lg transition-all z-20"
        style={{ writingMode: 'vertical-rl' }}
      >
        <span className="hidden md:inline">Patient Information</span>
      </button>
    </div>
  );
}

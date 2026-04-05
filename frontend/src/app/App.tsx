import { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { Header } from './components/header';
import { DataDisplay } from './components/data-display';
import { PatientInfoPanel } from './components/patient-info-panel';
import { PlusBackground } from './components/plus-background';
import { ConnectModal } from './components/ConnectModal';

export default function App() {
  const { id } = useParams<{ id: string }>();
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

      <div className="relative z-10 flex-1 min-h-0 overflow-hidden">
        <Header onConnectToPhone={() => setIsConnectModalOpen(true)} />

        <main className="max-w-[960px] mx-auto px-6 py-6 flex-1 min-h-0 overflow-hidden flex flex-col">
          <DataDisplay data={medicalData} />
        </main>
      </div>

      <PatientInfoPanel
        isOpen={isPatientPanelOpen}
        onClose={() => setIsPatientPanelOpen(false)}
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

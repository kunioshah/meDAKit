import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Laptop, Smartphone } from 'lucide-react';
import { Header } from './components/header';
import { PlusBackground } from './components/plus-background';
import { ConnectModal } from './components/ConnectModal';

export default function PatientSelectPage() {
  const navigate = useNavigate();
  const [connectOpen, setConnectOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f5f5] relative flex flex-col">
      <PlusBackground />
      <div className="relative z-10 flex flex-col flex-1">
        <Header logoOnly />

        <main className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
          <p className="text-gray-500 text-lg">How would you like to proceed?</p>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
            <button
              onClick={() => setConnectOpen(true)}
              className="flex-1 bg-white/60 backdrop-blur-sm hover:bg-white/80 rounded-[24px] p-8 flex flex-col items-center gap-4 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-[#7ed957]/20 flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-[#7ed957]" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-black text-lg">Connect to Phone</p>
                <p className="text-sm text-gray-500 mt-1">Use your phone as the input device</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/patients')}
              className="flex-1 bg-white/60 backdrop-blur-sm hover:bg-white/80 rounded-[24px] p-8 flex flex-col items-center gap-4 transition-colors"
            >
              <div className="w-16 h-16 rounded-full bg-[#7ed957]/20 flex items-center justify-center">
                <Laptop className="w-8 h-8 text-[#7ed957]" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-black text-lg">Continue with Laptop</p>
                <p className="text-sm text-gray-500 mt-1">Enter information directly on this device</p>
              </div>
            </button>
          </div>
        </main>
      </div>

      <ConnectModal
        isOpen={connectOpen}
        onClose={() => setConnectOpen(false)}
        onDone={() => { setConnectOpen(false); navigate('/phone-connected'); }}
      />
    </div>
  );
}

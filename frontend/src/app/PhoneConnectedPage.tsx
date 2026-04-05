/**
 * @file PhoneConnectedPage.tsx
 * @description Post-connection options page (/phone-connected). Shown after
 * the user completes the QR code phone connection flow. Offers three actions:
 * reopen the QR code modal, switch to laptop-only mode (/patients), or work
 * concurrently with both phone and laptop (/patients with phone still active).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { QrCode, Laptop, MonitorSmartphone } from 'lucide-react';
import { Header } from './components/header';
import { PlusBackground } from './components/plus-background';
import { ConnectModal } from './components/ConnectModal';

export default function PhoneConnectedPage() {
  const navigate = useNavigate();
  const [connectOpen, setConnectOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f5f5] relative flex flex-col">
      <PlusBackground />
      <div className="relative z-10 flex flex-col flex-1">
        <Header logoOnly />

        <main className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#7ed957]/20 flex items-center justify-center mx-auto mb-4">
              <MonitorSmartphone className="w-8 h-8 text-[#7ed957]" strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-normal text-black">Phone Connected</h2>
            <p className="text-gray-500 mt-2">What would you like to do?</p>
          </div>

          <div className="flex flex-col gap-4 w-full max-w-sm">
            <button
              onClick={() => setConnectOpen(true)}
              className="bg-white/60 backdrop-blur-sm hover:bg-white/80 rounded-[24px] p-6 flex items-center gap-5 transition-colors shadow-sm"
            >
              <div className="w-12 h-12 rounded-full bg-[#7ed957]/20 flex items-center justify-center shrink-0">
                <QrCode className="w-6 h-6 text-[#7ed957]" strokeWidth={1.5} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-black">Reopen QR Code</p>
                <p className="text-sm text-gray-500 mt-0.5">Show the connection codes again</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/patients')}
              className="bg-white/60 backdrop-blur-sm hover:bg-white/80 rounded-[24px] p-6 flex items-center gap-5 transition-colors shadow-sm"
            >
              <div className="w-12 h-12 rounded-full bg-[#7ed957]/20 flex items-center justify-center shrink-0">
                <Laptop className="w-6 h-6 text-[#7ed957]" strokeWidth={1.5} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-black">Switch to Laptop</p>
                <p className="text-sm text-gray-500 mt-0.5">Use this device only</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/patients')}
              className="bg-white/60 backdrop-blur-sm hover:bg-white/80 rounded-[24px] p-6 flex items-center gap-5 transition-colors shadow-sm"
            >
              <div className="w-12 h-12 rounded-full bg-[#7ed957]/20 flex items-center justify-center shrink-0">
                <MonitorSmartphone className="w-6 h-6 text-[#7ed957]" strokeWidth={1.5} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-black">Work Concurrently</p>
                <p className="text-sm text-gray-500 mt-0.5">Use phone and laptop together</p>
              </div>
            </button>
          </div>
        </main>
      </div>

      <ConnectModal
        isOpen={connectOpen}
        onClose={() => setConnectOpen(false)}
        onDone={() => setConnectOpen(false)}
      />
    </div>
  );
}

/**
 * @file header.tsx
 * @description Shared header component used across all pages. Features a
 * left-anchored hamburger menu that opens a patient list sidebar (loads from
 * /api/patients on open, patients grouped in a collapsible dropdown). Logo is
 * absolutely centered. Right side shows "Connect to phone" button (when
 * showConnect=true) and an Arduino connection status badge that polls
 * /api/sensor-data every 3s — green when data is fresh within 6s, gray
 * otherwise. logoOnly mode centers the logo with hamburger still present.
 * showHamburger=false hides the menu (used on the mobile session page).
 * mobileNav=true routes sidebar patient links to /mobile/patient/:id.
 */
import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router';

interface HeaderProps {
  onConnectToPhone?: () => void;
  showConnect?: boolean;
  showHamburger?: boolean;
  compact?: boolean;
  logoOnly?: boolean;
  /** If true, clicking a patient in the sidebar goes to /mobile/patient/:id instead of /patient/:id/session */
  mobileNav?: boolean;
}

interface Patient {
  id: string;
  name: string;
}

export function Header({
  onConnectToPhone,
  showConnect = true,
  showHamburger = true,
  compact = false,
  logoOnly = false,
  mobileNav = false,
}: HeaderProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [arduinoConnected, setArduinoConnected] = useState(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/sensor-data');
        if (res.ok) {
          const d = await res.json();
          const fresh = d.last_seen && (Date.now() - new Date(d.last_seen).getTime()) < 6000;
          setArduinoConnected(!!fresh);
        }
      } catch {}
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;
    fetch('/api/patients')
      .then(r => r.json())
      .then(d => setPatients(d.patients ?? []))
      .catch(() => {});
  }, [sidebarOpen]);

  const hamburger = showHamburger ? (
    <button
      onClick={() => setSidebarOpen(true)}
      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
      aria-label="Open patient list"
    >
      <Menu className={compact ? 'w-5 h-5' : 'w-6 h-6'} />
    </button>
  ) : <div className="w-10 shrink-0" />;

  const logo = (
    <h1 className={`tracking-tight ${compact ? 'text-xl' : 'text-3xl'}`}>
      <span className="text-black font-bold">me</span>
      <span className="text-[#7ed957] font-bold">DAK</span>
      <span className="text-black font-bold">it</span>
    </h1>
  );

  const sidebar = (
    <>
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Patients</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <details open className="group">
            <summary className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none hover:bg-gray-50 transition-colors border-b border-gray-100 list-none">
              <span className="text-sm font-medium text-gray-700">All Patients</span>
              <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
            </summary>
            {patients.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6 px-5">No patients on record.</p>
            ) : (
              <ul>
                {patients.map(p => (
                  <li key={p.id}>
                    <button
                      onClick={() => {
                        setSidebarOpen(false);
                        navigate(mobileNav ? `/mobile/patient/${p.id}` : `/patient/${p.id}/session`);
                      }}
                      className="w-full px-6 py-3 text-left hover:bg-gray-50 transition-colors flex items-baseline gap-2 border-b border-gray-50"
                    >
                      <span className="font-medium text-black truncate">{p.name ?? p.id}</span>
                      <span className="text-xs text-gray-400 shrink-0">#{p.id}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </details>
        </div>

        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={() => { setSidebarOpen(false); navigate(mobileNav ? '/mobile' : '/patients'); }}
            className="w-full bg-[#7ed957] hover:bg-[#6ec847] text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            View All Patients
          </button>
        </div>
      </div>
    </>
  );

  if (logoOnly) {
    return (
      <>
        {sidebar}
        <header className="bg-white/80 backdrop-blur-sm px-6 py-6 flex items-center justify-between">
          {hamburger}
          <div className="absolute left-1/2 -translate-x-1/2">{logo}</div>
          <div className="w-10" /> {/* spacer to balance hamburger */}
        </header>
      </>
    );
  }

  return (
    <>
      {sidebar}
      <header className={`bg-white/80 backdrop-blur-sm px-6 ${compact ? 'py-2' : 'py-6'}`}>
        <div className="max-w-[960px] mx-auto relative flex items-center justify-between">
          {hamburger}

          {/* Logo — truly centered */}
          <div className="absolute left-1/2 -translate-x-1/2">{logo}</div>

          {/* Right side */}
          <div className="flex items-center gap-3 shrink-0">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm ${arduinoConnected ? 'bg-[#7ed957]/20 text-[#4a9e2a]' : 'bg-[#e5e5e5] text-gray-400'}`}>
              <Cpu className="w-4 h-4" />
              <span>{arduinoConnected ? 'Arduino' : 'No Arduino'}</span>
            </div>
            {showConnect && (
              <button onClick={onConnectToPhone}
                className="bg-[#e5e5e5] hover:bg-[#d5d5d5] text-black px-6 py-2.5 rounded-full transition-colors text-sm">
                Connect to phone
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

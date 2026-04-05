import { useState } from 'react';
import { X, Wifi, Smartphone } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Phase = 'credentials' | 'qrcodes';

export function ConnectModal({ isOpen, onClose }: ConnectModalProps) {
  const [phase, setPhase] = useState<Phase>('credentials');
  const [ssid, setSsid] = useState('MedScan');
  const [password, setPassword] = useState('medscan123');
  const [appUrl, setAppUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ip');
      if (!res.ok) throw new Error('Bad response');
      const data = await res.json();
      setAppUrl(data.app_url);
      setPhase('qrcodes');
    } catch {
      setError('Could not reach the backend. Make sure FastAPI is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const wifiQr = `WIFI:T:WPA;S:${ssid};P:${password};;`;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <h2 className="text-xl">Connect to Phone</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {phase === 'credentials' ? (
            <form onSubmit={handleGenerate} className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Enter your Windows Mobile Hotspot name and password. The phone will scan two QR codes — one to join the network, one to open the app.
              </p>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Hotspot Name (SSID)</label>
                <input
                  type="text"
                  value={ssid}
                  onChange={(e) => setSsid(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7ed957] focus:border-transparent transition-shadow"
                  placeholder="e.g. MedScan"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-700 mb-1.5">Hotspot Password</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7ed957] focus:border-transparent transition-shadow"
                  placeholder="e.g. medscan123"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#7ed957] hover:bg-[#6ec847] disabled:bg-gray-200 disabled:text-gray-400 text-black py-3 rounded-lg transition-colors"
              >
                {loading ? 'Fetching IP…' : 'Generate QR Codes'}
              </button>
            </form>
          ) : (
            <div className="p-6">
              <p className="text-sm text-gray-500 text-center mb-6">
                Have the phone scan these in order.
              </p>

              <div className="flex gap-6 justify-center">
                {/* QR 1 — WiFi */}
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <QRCodeSVG value={wifiQr} size={160} />
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Wifi className="w-4 h-4 text-[#7ed957]" />
                    Step 1 — Join WiFi
                  </div>
                  <p className="text-xs text-gray-400">{ssid}</p>
                </div>

                {/* QR 2 — App URL */}
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <QRCodeSVG value={appUrl} size={160} />
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-700">
                    <Smartphone className="w-4 h-4 text-[#7ed957]" />
                    Step 2 — Open App
                  </div>
                  <p className="text-xs text-gray-400">{appUrl}</p>
                </div>
              </div>

              <button
                onClick={() => setPhase('credentials')}
                className="mt-6 w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Change hotspot settings
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

import { useRef, useState } from 'react';
import { Camera, Image, Mic, Plus, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from './components/header';
import { PlusBackground } from './components/plus-background';

export default function MobilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [generatedText, setGeneratedText] = useState('');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [hasSent, setHasSent] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);

  const handleSend = async () => {
    setSending(true);
    setHasSent(true);
    try {
      await fetch('/api/phone-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, images }),
      });
    } finally {
      setSending(false);
    }
  };

  const addImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      setImages(prev => {
        const next = [...prev, url];
        setCurrentIndex(next.length - 1);
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  // ── Shared pieces ──────────────────────────────────────────────────────────

  const hiddenInputs = (
    <>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { e.target.files?.[0] && addImage(e.target.files[0]); setPlusMenuOpen(false); }} />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { e.target.files?.[0] && addImage(e.target.files[0]); setPlusMenuOpen(false); }} />
    </>
  );

  const portraitThumbnail = (
    <AnimatePresence>
      {images.length > 0 && !generatedText && !hasSent && (
        <motion.div
          className="flex gap-2 overflow-x-auto shrink-0"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        >
          {images.map((img, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)}
              className={`w-10 h-10 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-colors ${i === currentIndex ? 'border-[#7ed957]' : 'border-transparent'}`}>
              <img src={img} className="w-full h-full object-cover" alt={`thumb-${i}`} />
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const landscapeThumbnail = (
    <AnimatePresence>
      {images.length > 0 && !generatedText && !hasSent && (
        <motion.div
          className="flex gap-2 overflow-x-auto shrink-0"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        >
          {images.map((img, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)}
              className={`w-10 h-10 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-colors ${i === currentIndex ? 'border-[#7ed957]' : 'border-transparent'}`}>
              <img src={img} className="w-full h-full object-cover" alt={`thumb-${i}`} />
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const genBox = (cls = '') => (
    <div className={`bg-white/60 backdrop-blur-sm rounded-[24px] p-6 overflow-y-auto ${cls}`}>
      {generatedText
        ? <p className="text-black leading-relaxed">{generatedText}</p>
        : <p className="text-gray-400 text-center text-sm">Generated response will appear here</p>
      }
    </div>
  );

  const textInput = (cls = '') => (
    <div className={`bg-[#b5b5b5] rounded-[20px] p-4 flex items-start gap-2 ${cls}`}>
      <textarea
        placeholder="Ask meDAKit"
        value={inputText}
        onChange={e => setInputText(e.target.value)}
        className="flex-1 h-full bg-transparent border-none outline-none text-black placeholder:text-gray-600 text-sm resize-none overflow-y-auto"
      />
      <button type="button" className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-gray-600/20 transition-colors" aria-label="Record audio">
        <Mic className="w-4 h-4 text-gray-700" />
      </button>
    </div>
  );

  const sendBtn = (cls = '') => (
    <button onClick={handleSend} disabled={sending}
      className={`shrink-0 bg-[#7ed957] hover:bg-[#6ec847] disabled:opacity-50 text-black rounded-[20px] font-semibold tracking-widest text-sm transition-colors ${cls}`}>
      SEND
    </button>
  );

  const arrowSendBtn = (
    <button onClick={handleSend} disabled={sending}
      className="shrink-0 w-11 h-11 bg-[#7ed957] hover:bg-[#6ec847] disabled:opacity-50 text-black rounded-full flex items-center justify-center transition-colors">
      <ArrowRight className="w-5 h-5" />
    </button>
  );

  // ── Portrait-only pieces ───────────────────────────────────────────────────

  // Large stacked cards shown before first upload
  const portraitInitialCards = (
    <AnimatePresence>
      {!hasSent && (
        <motion.div className="flex flex-col gap-3 shrink-0"
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}>
          <button onClick={() => cameraInputRef.current?.click()}
            className="w-full bg-white/60 backdrop-blur-sm rounded-[24px] py-5 flex flex-col items-center gap-2 hover:bg-white/80 transition-colors">
            <div className="w-12 h-12 rounded-full bg-[#7ed957]/20 flex items-center justify-center">
              <Camera className="w-6 h-6 text-[#7ed957]" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-black text-sm">Take photo</p>
              <p className="text-xs text-gray-500">Real-time diagnosis</p>
            </div>
          </button>

          <button onClick={() => fileInputRef.current?.click()}
            className="w-full bg-white/60 backdrop-blur-sm rounded-[24px] py-5 flex flex-col items-center gap-2 hover:bg-white/80 transition-colors">
            <div className="w-12 h-12 rounded-full bg-[#7ed957]/20 flex items-center justify-center">
              <Image className="w-6 h-6 text-[#7ed957]" strokeWidth={1.5} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-black text-sm">Upload from device</p>
              <p className="text-xs text-gray-500">Upload from roll</p>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Compact input bar shown after first upload
  const portraitCompactBar = (
    <AnimatePresence>
      {hasSent && (
        <motion.div className="shrink-0 flex items-center gap-2 relative"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}>

          {/* Plus menu popup */}
          <AnimatePresence>
            {plusMenuOpen && (
              <motion.div
                className="absolute bottom-14 left-0 flex flex-col gap-2 z-10"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}>
                <button onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-[14px] px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-white transition-colors">
                  <Camera className="w-4 h-4 text-[#7ed957]" /> Take photo
                </button>
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-[14px] px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-white transition-colors">
                  <Image className="w-4 h-4 text-[#7ed957]" /> Upload image
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={() => setPlusMenuOpen(o => !o)}
            className="shrink-0 w-11 h-11 bg-white/60 hover:bg-white/80 rounded-full flex items-center justify-center transition-colors">
            <Plus className="w-5 h-5 text-gray-700" />
          </button>

          {textInput('flex-1')}
          {arrowSendBtn}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Landscape pieces ───────────────────────────────────────────────────────

  const actionCards = (
    <div className="grid grid-cols-2 gap-3 shrink-0">
      <button onClick={() => cameraInputRef.current?.click()}
        className="relative bg-white/60 backdrop-blur-sm rounded-[20px] p-4 flex flex-col items-start justify-end h-20 overflow-hidden hover:bg-white/80 transition-colors text-left">
        <Camera className="absolute right-3 top-3 w-10 h-10 text-gray-200" strokeWidth={1.2} />
        <span className="text-xs font-medium text-black z-10">Take photo</span>
      </button>
      <button onClick={() => fileInputRef.current?.click()}
        className="relative bg-white/60 backdrop-blur-sm rounded-[20px] p-4 flex flex-col items-start justify-end h-20 overflow-hidden hover:bg-white/80 transition-colors text-left">
        <Image className="absolute right-3 top-3 w-10 h-10 text-gray-200" strokeWidth={1.2} />
        <span className="text-xs font-medium text-black z-10">Upload image from device</span>
      </button>
    </div>
  );

  return (
    <div className="bg-[#f5f5f5] relative flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      <PlusBackground />
      {hiddenInputs}

      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        {/* Portrait header */}
        <div className="landscape:hidden">
          <Header showConnect={false} showHamburger={false} />
        </div>
        {/* Landscape header */}
        <div className="portrait:hidden">
          <Header showConnect={false} showHamburger={false} compact />
        </div>

        {/* Portrait layout */}
        <main className="landscape:hidden flex-1 min-h-0 px-4 pt-2 pb-4 flex flex-col gap-3">
          {genBox('flex-1 min-h-0')}
          {portraitInitialCards}
          {portraitThumbnail}
          {/* Standard input shown before first upload */}
          {!hasSent && (
            <div className="flex gap-3 items-stretch shrink-0">
              {textInput('flex-1')}
              {sendBtn('px-4 min-w-14 flex items-center justify-center')}
            </div>
          )}
          {portraitCompactBar}
        </main>

        {/* Landscape layout */}
        <div className="portrait:hidden flex-1 min-h-0 flex gap-3 px-4 pt-2 pb-4">
          <div className="flex flex-col gap-3 w-[260px] shrink-0">
            <AnimatePresence>
              {!hasSent && (
                <motion.div className="flex flex-col gap-3"
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}>
                  {actionCards}
                </motion.div>
              )}
            </AnimatePresence>
            {landscapeThumbnail}
            {textInput('flex-1 min-h-0')}
            {hasSent ? (
              <div className="shrink-0 flex items-center gap-2 relative">
                <AnimatePresence>
                  {plusMenuOpen && (
                    <motion.div className="absolute bottom-14 left-0 flex flex-col gap-2 z-10"
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
                      <button onClick={() => cameraInputRef.current?.click()}
                        className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-[14px] px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-white transition-colors">
                        <Camera className="w-4 h-4 text-[#7ed957]" /> Take photo
                      </button>
                      <button onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-[14px] px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-white transition-colors">
                        <Image className="w-4 h-4 text-[#7ed957]" /> Upload image
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                <button onClick={() => setPlusMenuOpen(o => !o)}
                  className="shrink-0 w-11 h-11 bg-white/60 hover:bg-white/80 rounded-full flex items-center justify-center transition-colors">
                  <Plus className="w-5 h-5 text-gray-700" />
                </button>
                {arrowSendBtn}
              </div>
            ) : (
              sendBtn('py-3 w-full')
            )}
          </div>
          {genBox('flex-1 min-h-0')}
        </div>

      </div>
    </div>
  );
}

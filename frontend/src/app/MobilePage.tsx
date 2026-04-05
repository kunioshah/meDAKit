import { useRef, useState } from 'react';
import { Camera, Image, Mic } from 'lucide-react';
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

  const handleSend = async () => {
    setSending(true);
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

  const thumbnail = (
    <AnimatePresence>
      {images.length > 0 && !generatedText && (
        <motion.div
          className="flex gap-2 overflow-x-auto shrink-0"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        >
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`w-10 h-10 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-colors ${i === currentIndex ? 'border-[#7ed957]' : 'border-transparent'}`}
            >
              <img src={img} className="w-full h-full object-cover" alt={`thumb-${i}`} />
            </button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

  const actionCards = (landscape = false) => (
    <div className="grid grid-cols-2 gap-3 shrink-0">
      <button
        onClick={() => cameraInputRef.current?.click()}
        className={`relative bg-white/60 backdrop-blur-sm rounded-[20px] p-4 flex flex-col items-start justify-end overflow-hidden hover:bg-white/80 transition-colors text-left ${landscape ? 'h-20' : 'h-28'}`}
      >
        <Camera className="absolute right-3 top-3 w-10 h-10 text-gray-200" strokeWidth={1.2} />
        <span className="text-xs font-medium text-black z-10">Take photo</span>
      </button>
      <button
        onClick={() => fileInputRef.current?.click()}
        className={`relative bg-white/60 backdrop-blur-sm rounded-[20px] p-4 flex flex-col items-start justify-end overflow-hidden hover:bg-white/80 transition-colors text-left ${landscape ? 'h-20' : 'h-28'}`}
      >
        <Image className="absolute right-3 top-3 w-10 h-10 text-gray-200" strokeWidth={1.2} />
        <span className="text-xs font-medium text-black z-10">Upload image from device</span>
      </button>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => e.target.files?.[0] && addImage(e.target.files[0])} />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && addImage(e.target.files[0])} />
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
    <button
      onClick={handleSend}
      disabled={sending}
      className={`shrink-0 bg-[#7ed957] hover:bg-[#6ec847] disabled:opacity-50 text-black rounded-[20px] font-semibold tracking-widest text-sm transition-colors ${cls}`}
    >
      {sending ? '...' : 'SEND'}
    </button>
  );

  const genBox = (cls = '') => (
    <div className={`bg-white/60 backdrop-blur-sm rounded-[24px] p-6 overflow-y-auto ${cls}`}>
      {generatedText
        ? <p className="text-black leading-relaxed">{generatedText}</p>
        : <p className="text-gray-400 text-center text-sm">Generated response will appear here</p>
      }
    </div>
  );

  return (
    <div className="bg-[#f5f5f5] relative flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      <PlusBackground />

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
        <main className="landscape:hidden flex-1 min-h-0 px-4 pb-4 flex flex-col gap-3">
          {genBox('flex-1 min-h-0')}
          {actionCards()}
          {thumbnail}
          <div className="flex gap-3 items-stretch shrink-0">
            {textInput('flex-1 min-h-0')}
            {sendBtn('px-4 min-w-14 flex items-center justify-center')}
          </div>
        </main>

        {/* Landscape layout */}
        <div className="portrait:hidden flex-1 min-h-0 flex gap-3 px-4 pb-4">
          <div className="flex flex-col gap-3 w-[260px] shrink-0">
            {actionCards(true)}
            {thumbnail}
            {textInput('flex-1 min-h-0')}
            {sendBtn('py-3 w-full')}
          </div>
          {genBox('flex-1 min-h-0')}
        </div>

      </div>
    </div>
  );
}

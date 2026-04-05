/**
 * @file MobilePage.tsx
 * @description Mobile session / camera page (/mobile/patient/:id). The primary
 * input interface for the phone. Supports portrait and landscape orientations
 * with distinct responsive layouts. Features: take photo (camera capture),
 * upload multiple images from gallery (iOS-safe, no camera shortcut), text
 * input, and a generated response display box. On send, POSTs { text, images }
 * to /api/patients/:id/conversations. After first send, transitions to a
 * compact bar with a [+] menu for adding more photos.
 */
import { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { Camera, Image, Mic, Plus, ArrowRight, Bot, User } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from './components/header';
import { PlusBackground } from './components/plus-background';

interface ConversationEntry {
  id: string;
  role: string;
  timestamp: string;
  text: string;
  images?: string[];
  severity?: string;
  recommendation?: string;
}

export default function MobilePage() {
  const { id } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [hasSent, setHasSent] = useState(false);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchConversations = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/patients/${id}/conversations`);
      if (res.ok) {
        const json = await res.json();
        const sorted = (json.conversations || []).sort((a: any, b: any) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        if (sorted.length > 0) setHasSent(true);
        setConversations(sorted);
        if (sorted.length > 0) {
          const last = sorted[sorted.length - 1];
          if (last.role !== 'user' || last.response) setAwaitingResponse(false);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchConversations();
    const timer = setInterval(fetchConversations, 10000);
    return () => clearInterval(timer);
  }, [id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversations]);

  const handleSend = async () => {
    if (!id || (!inputText.trim() && images.length === 0)) return;
    if (awaitingResponse) return;
    setSending(true);
    setHasSent(true);
    setAwaitingResponse(true);
    try {
      await fetch(`/api/patients/${id}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', text: inputText, images }),
      });
      setInputText('');
      setImages([]);
      await fetchConversations();
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
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden"
        onChange={e => { e.target.files && Array.from(e.target.files).forEach(addImage); setPlusMenuOpen(false); }} />
      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.heif" multiple className="hidden"
        onChange={e => { e.target.files && Array.from(e.target.files).forEach(addImage); setPlusMenuOpen(false); }} />
    </>
  );

  const portraitThumbnail = (
    <AnimatePresence>
      {images.length > 0 && !hasSent && (
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
      {images.length > 0 && !hasSent && (
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
    <div ref={scrollRef} className={`bg-white/60 backdrop-blur-sm rounded-[24px] p-6 overflow-y-auto flex flex-col gap-4 ${cls}`}>
      {conversations.length === 0 ? (
        <p className="text-gray-400 text-center text-sm m-auto">Generated response will appear here</p>
      ) : (
        conversations.map((msg) => {
          const isAI = msg.role === 'ai';
          return (
            <div key={msg.id} className={`flex flex-col max-w-[90%] ${isAI ? 'self-start' : 'self-end'}`}>
              <div className={`p-4 rounded-2xl ${isAI ? 'bg-white rounded-tl-sm text-black shadow-sm' : 'bg-[#7ed957] rounded-tr-sm text-black shadow-sm'}`}>
                <div className="flex items-center gap-2 mb-1 opacity-60">
                  {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  <span className="text-xs font-semibold uppercase">{isAI ? 'AI Assistant' : 'Patient'}</span>
                </div>
                {msg.images && msg.images.length > 0 && (
                  <div className="flex gap-2 flex-wrap mb-2">
                    {msg.images.map((img, i) => (
                      <img key={i} src={img} alt="attached" className="w-24 h-24 object-cover rounded-lg shadow-sm" />
                    ))}
                  </div>
                )}
                {msg.text && <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>}
                {msg.severity && (
                  <div className="mt-2 text-xs font-medium bg-black/5 p-2 rounded">
                    Severity: <span className="uppercase">{msg.severity}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
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
    <button onClick={handleSend} disabled={sending || awaitingResponse}
      className={`shrink-0 bg-[#7ed957] hover:bg-[#6ec847] disabled:opacity-50 text-black rounded-[20px] font-semibold tracking-widest text-sm transition-colors ${cls}`}>
      {awaitingResponse ? '…' : 'SEND'}
    </button>
  );

  const arrowSendBtn = (
    <button onClick={handleSend} disabled={sending || awaitingResponse}
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

          {/* Show image thumbnails in compact bar if any are selected */}
          {images.length > 0 && (
             <div className="flex gap-1 overflow-x-auto max-w-[80px]">
                {images.map((img, i) => (
                  <img key={i} src={img} className="w-8 h-8 rounded shrink-0 object-cover" alt="thumb" />
                ))}
             </div>
          )}

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
          {/* Standard input shown before first upload */}
          {!hasSent && (
            <div className="flex flex-col gap-2 shrink-0">
              {portraitThumbnail}
              <div className="flex gap-3 items-stretch">
                {textInput('flex-1')}
                {sendBtn('px-4 min-w-14 flex items-center justify-center')}
              </div>
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
                {images.length > 0 && (
                   <div className="flex gap-1 overflow-x-auto max-w-[80px]">
                      {images.map((img, i) => (
                        <img key={i} src={img} className="w-8 h-8 rounded shrink-0 object-cover" alt="thumb" />
                      ))}
                   </div>
                )}
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

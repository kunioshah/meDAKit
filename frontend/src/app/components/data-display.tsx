/**
 * @file data-display.tsx
 * @description Main input/output panel for the laptop session page. Displays
 * the AI-generated response in a scrollable output box. Accepts text input and
 * multiple image uploads; on submit, saves the entry to conversations.json via
 * POST /api/patients/:id/conversations with { text, images, response, arduino }.
 * Polls /api/sensor-data every 2s and attaches the latest Arduino readings
 * (heart_rate, spo2, temperature) to each submission as context for the model.
 */
import { useRef, useState, useEffect } from 'react';
import { Image, ArrowRight, X, Bot, User } from 'lucide-react';

interface ConversationEntry {
  id: string;
  role: string;
  timestamp: string;
  text: string;
  images?: string[];
  severity?: string;
  recommendation?: string;
}

interface DataDisplayProps {
  data: {
    text?: string;
    images?: string[];
  };
  patientId?: string;
}

export function DataDisplay({ data, patientId }: DataDisplayProps) {
  const [inputText, setInputText] = useState('');
  const [inputImages, setInputImages] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [sensorData, setSensorData] = useState<{ heart_rate: number | null; spo2: number | null; temperature: number | null }>({
    heart_rate: null, spo2: null, temperature: null,
  });

  useEffect(() => {
    const pollSensor = async () => {
      try {
        const res = await fetch('/api/sensor-data');
        if (res.ok) setSensorData(await res.json());
      } catch {}
    };
    const pollConversations = async () => {
      if (!patientId) return;
      try {
        const res = await fetch(`/api/patients/${patientId}/conversations`);
        if (res.ok) {
          const json = await res.json();
          const sorted = (json.conversations || []).sort((a: any, b: any) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
          setConversations(sorted);
        }
      } catch {}
    };

    pollSensor();
    pollConversations();
    const id1 = setInterval(pollSensor, 2000);
    const id2 = setInterval(pollConversations, 2000);
    return () => {
      clearInterval(id1);
      clearInterval(id2);
    };
  }, [patientId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversations]);

  useEffect(() => {
    if (data.text && !inputText) setInputText(data.text);
  }, [data.text]);

  const addImages = (files: FileList) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const url = e.target?.result as string;
        setInputImages(prev => [...prev, url]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async () => {
    if (!inputText.trim() && inputImages.length === 0) return;
    if (!patientId) return;
    setSending(true);
    try {
      await fetch(`/api/patients/${patientId}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          text: inputText,
          images: inputImages,
          arduino: sensorData,
        }),
      });
      setInputText('');
      setInputImages([]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4">
      {/* Output box (Chat Bubbles) */}
      <div ref={scrollRef} className="bg-white/60 backdrop-blur-sm rounded-[32px] p-6 flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
        {conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-center">
              Enter medical information to receive medical advice
            </p>
          </div>
        ) : (
          conversations.map((msg) => {
            const isAI = msg.role === 'ai';
            return (
              <div key={msg.id} className={`flex flex-col max-w-[80%] ${isAI ? 'self-start' : 'self-end'}`}>
                <div className={`p-4 rounded-2xl ${isAI ? 'bg-white rounded-tl-sm text-black shadow-sm' : 'bg-[#7ed957] rounded-tr-sm text-black shadow-sm'}`}>
                  <div className="flex items-center gap-2 mb-1 opacity-60">
                    {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    <span className="text-xs font-semibold uppercase">{isAI ? 'AI Assistant' : 'Patient'}</span>
                  </div>
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-2">
                      {msg.images.map((img, i) => (
                        <img key={i} src={img} alt="attached" className="w-32 h-32 object-cover rounded-lg shadow-sm" />
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

      {/* Input area */}
      <div className="bg-[#b5b5b5] rounded-[32px] p-4 px-6 flex flex-col gap-3">
        {/* Image thumbnails */}
        {inputImages.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {inputImages.map((img, i) => (
              <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                <img src={img} className="w-full h-full object-cover" alt={`img-${i}`} />
                <button
                  onClick={() => setInputImages(prev => prev.filter((_, j) => j !== i))}
                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Enter additional information..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-black placeholder:text-gray-600 text-lg"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-600/20 transition-colors"
            aria-label="Upload image"
          >
            <Image className="w-5 h-5 text-gray-700" />
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={sending || (!inputText.trim() && inputImages.length === 0)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#7ed957] hover:bg-[#6ec847] disabled:opacity-40 transition-colors"
            aria-label="Send"
          >
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp,.heic,.heif"
        multiple
        className="hidden"
        onChange={e => e.target.files && addImages(e.target.files)}
      />

      <p className="shrink-0 text-[11px] text-gray-400 text-center">
        AI-generated advice only. Not a substitute for professional medical care. Consult a healthcare provider for diagnosis and treatment.
      </p>
    </div>
  );
}
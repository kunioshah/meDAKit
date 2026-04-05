import { useRef, useState } from 'react';
import { Image, ArrowRight, X } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          text: inputText,
          images: inputImages,
          response: '',   // filled in once model is wired
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
      {/* Output box */}
      <div className="bg-white/60 backdrop-blur-sm rounded-[32px] p-8 flex-1 min-h-0 overflow-y-auto">
        {data.text ? (
          <p className="text-black leading-relaxed">{data.text}</p>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-center">
              Enter medical information to receive medical advice
            </p>
          </div>
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

import { Image, Mic } from 'lucide-react';

interface DataDisplayProps {
  data: {
    text?: string;
    images?: string[];
  };
}

export function DataDisplay({ data }: DataDisplayProps) {
  return (
    <div className="space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Text Data Display - Large output box */}
      <div className="bg-white/60 backdrop-blur-sm rounded-[32px] p-8 min-h-[60vh] flex-1 min-h-0 overflow-y-auto">
        {data.text ? (
          <p className="text-black leading-relaxed">
            {data.text}
          </p>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-center">
              Enter medical information to receive medical advice
            </p>
          </div>
        )}
      </div>

      {/* Text Input Area with upload buttons */}
      <div className="bg-[#b5b5b5] rounded-[32px] p-6">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Enter additional information..."
            className="flex-1 bg-transparent border-none outline-none text-black placeholder:text-gray-600 text-lg"
          />
          <button
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-600/20 transition-colors"
            aria-label="Upload image"
          >
            <Image className="w-5 h-5 text-gray-700" />
          </button>
          <button
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-600/20 transition-colors"
            aria-label="Record audio"
          >
            <Mic className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-xl p-2.5">
        <p className="text-xs text-amber-900 text-center">
          AI-generated advice only. Not a substitute for professional medical care. Consult a healthcare provider for diagnosis and treatment.
        </p>
      </div>
    </div>
  );
}
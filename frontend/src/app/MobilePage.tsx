import { useRef } from 'react';
import { Camera, Image, Mic } from 'lucide-react';
import { Header } from './components/header';
import { PlusBackground } from './components/plus-background';

export default function MobilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-screen bg-[#f5f5f5] relative flex flex-col">
      <PlusBackground />

      <div className="relative z-10 flex flex-col flex-1">
        <Header showConnect={false} />

        <main className="flex-1 px-4 py-6 flex flex-col gap-4 max-w-lg mx-auto w-full">
          {/* Top two cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Take photo */}
            <button className="relative bg-white/60 backdrop-blur-sm rounded-[24px] p-6 flex flex-col items-start justify-end aspect-square overflow-hidden hover:bg-white/80 transition-colors text-left">
              <Camera className="absolute right-4 top-4 w-16 h-16 text-gray-200" strokeWidth={1.2} />
              <span className="text-base font-medium text-black z-10">Take photo</span>
            </button>

            {/* Upload image */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative bg-white/60 backdrop-blur-sm rounded-[24px] p-6 flex flex-col items-start justify-end aspect-square overflow-hidden hover:bg-white/80 transition-colors text-left"
            >
              <Image className="absolute right-4 top-4 w-16 h-16 text-gray-200" strokeWidth={1.2} />
              <span className="text-base font-medium text-black z-10">Upload image from device</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
          </div>

          {/* Written info card */}
          <div className="bg-[#b5b5b5] rounded-[24px] p-5 flex items-center gap-3">
            <input
              type="text"
              placeholder="Enter written information..."
              className="flex-1 bg-transparent border-none outline-none text-black placeholder:text-gray-600 text-base"
            />
            <button
              type="button"
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-gray-600/20 transition-colors"
              aria-label="Record audio"
            >
              <Mic className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

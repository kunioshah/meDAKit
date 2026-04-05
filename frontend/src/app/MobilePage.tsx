import { useRef, useState } from 'react';
import { Camera, Image, Mic, ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from './components/header';
import { PlusBackground } from './components/plus-background';

export default function MobilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const prev = () => setCurrentIndex(i => Math.max(0, i - 1));
  const next = () => setCurrentIndex(i => Math.min(images.length - 1, i + 1));

  return (
    <div className="bg-[#f5f5f5] relative flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      <PlusBackground />

      <div className="relative z-10 flex flex-col flex-1 min-h-0">
        <Header showConnect={false} />

        <main className="flex-1 min-h-0 px-4 py-4 flex flex-col gap-3 max-w-lg mx-auto w-full">

          {/* Carousel — only shown when images exist */}
          {images.length > 0 && (
            <div className="flex flex-col gap-2 min-h-0 flex-shrink">
              {/* Main preview */}
              <div className="rounded-[24px] overflow-hidden flex items-center justify-center min-h-0 flex-shrink" style={{ minHeight: '8rem' }}>
                <img src={images[currentIndex]} className="w-full h-full object-contain max-h-48" alt="preview" />
              </div>

              {/* Thumbnail strip */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={prev} disabled={currentIndex === 0} className="p-1 text-gray-500 disabled:opacity-30 flex-shrink-0">
                  <ChevronLeft size={20} />
                </button>
                <div className="flex gap-2 flex-1 overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentIndex(i)}
                      className={`w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-colors ${i === currentIndex ? 'border-[#7ed957]' : 'border-transparent'}`}
                    >
                      <img src={img} className="w-full h-full object-cover" alt={`thumb-${i}`} />
                    </button>
                  ))}
                </div>
                <button onClick={next} disabled={currentIndex === images.length - 1} className="p-1 text-gray-500 disabled:opacity-30 flex-shrink-0">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Action cards */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="relative bg-white/60 backdrop-blur-sm rounded-[24px] p-6 flex flex-col items-start justify-end aspect-square overflow-hidden hover:bg-white/80 transition-colors text-left"
            >
              <Camera className="absolute right-4 top-4 w-16 h-16 text-gray-200" strokeWidth={1.2} />
              <span className="text-base font-medium text-black z-10">Take photo</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative bg-white/60 backdrop-blur-sm rounded-[24px] p-6 flex flex-col items-start justify-end aspect-square overflow-hidden hover:bg-white/80 transition-colors text-left"
            >
              <Image className="absolute right-4 top-4 w-16 h-16 text-gray-200" strokeWidth={1.2} />
              <span className="text-base font-medium text-black z-10">Upload image from device</span>
            </button>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => e.target.files?.[0] && addImage(e.target.files[0])}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && addImage(e.target.files[0])}
            />
          </div>

          {/* Text input + Send */}
          <div className="flex gap-3 items-stretch">
            <div className="flex-1 bg-[#b5b5b5] rounded-[24px] p-5 flex items-end gap-3">
              <textarea
                rows={3}
                placeholder="Enter written information..."
                className="flex-1 bg-transparent border-none outline-none text-black placeholder:text-gray-600 text-base resize-none overflow-y-auto"
              />
              <button
                type="button"
                className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-gray-600/20 transition-colors"
                aria-label="Record audio"
              >
                <Mic className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            <button
              className="bg-[#7ed957] hover:bg-[#6ec847] text-black rounded-[24px] px-4 min-h-36 min-w-14 flex items-center justify-center transition-colors"
              style={{ writingMode: 'vertical-rl' }}
            >
              <span className="font-semibold tracking-widest text-sm">SEND</span>
            </button>
          </div>

        </main>
      </div>
    </div>
  );
}

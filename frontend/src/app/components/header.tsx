import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  onConnectToPhone?: () => void;
  showConnect?: boolean;
}

export function Header({ onConnectToPhone, showConnect = true }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white/80 backdrop-blur-sm px-6 py-6">
      <div className="max-w-[960px] mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-3xl tracking-tight">
            <span className="text-black">ME</span>
            <span className="text-[#7ed957]">DAK</span>
            <span className="text-black">IT</span>
          </h1>
        </div>

        {/* Desktop Nav - centered absolutely */}
        <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          <a href="#" className="text-gray-600 hover:text-black transition-colors">About</a>
          <a href="#" className="text-gray-600 hover:text-black transition-colors">About</a>
          <a href="#" className="text-gray-600 hover:text-black transition-colors">About</a>
        </nav>

        {/* Desktop Connect Button */}
        {showConnect && (
          <button
            onClick={onConnectToPhone}
            className="hidden md:block bg-[#e5e5e5] hover:bg-[#d5d5d5] text-black px-6 py-3 rounded-full transition-colors"
          >
            Connect to phone
          </button>
        )}

        {/* Mobile Hamburger Menu */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 text-black"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {showConnect && (
        <div className={`md:hidden bg-white/90 backdrop-blur-sm border-t border-gray-200 transition-all duration-300 ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
          <div className="max-w-[960px] mx-auto px-6 py-4">
            <button
              onClick={() => { onConnectToPhone?.(); setIsMenuOpen(false); }}
              className="w-full bg-[#e5e5e5] hover:bg-[#d5d5d5] text-black px-6 py-3 rounded-full transition-colors"
            >
              Connect to phone
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

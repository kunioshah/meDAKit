import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  onConnectToPhone?: () => void;
  showConnect?: boolean;
  showHamburger?: boolean;
  compact?: boolean;
  logoOnly?: boolean;
}

export function Header({ onConnectToPhone, showConnect = true, showHamburger = true, compact = false, logoOnly = false }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const logo = (
    <h1 className={`tracking-tight ${compact ? 'text-xl' : 'text-3xl'}`}>
      <span className="text-black">Me</span>
      <span className="text-[#7ed957]">DAK</span>
      <span className="text-black">it</span>
    </h1>
  );

  if (logoOnly) {
    return (
      <header className="bg-white/80 backdrop-blur-sm px-6 py-6 flex items-center justify-center">
        {logo}
      </header>
    );
  }

  return (
    <header className={`bg-white/80 backdrop-blur-sm px-6 ${compact ? 'py-2' : 'py-6'}`}>
      <div className="max-w-[960px] mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">{logo}</div>

        {/* Desktop Nav - centered absolutely */}
        <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          <a href="#" className="text-gray-600 hover:text-black transition-colors">About</a>
          <a href="#" className="text-gray-600 hover:text-black transition-colors">About</a>
          <a href="#" className="text-gray-600 hover:text-black transition-colors">About</a>
        </nav>

        {/* Desktop Connect Button */}
        {showConnect && (
          <button onClick={onConnectToPhone}
            className="hidden md:block bg-[#e5e5e5] hover:bg-[#d5d5d5] text-black px-6 py-3 rounded-full transition-colors">
            Connect to phone
          </button>
        )}

        {/* Mobile Hamburger */}
        {showHamburger && (
          <button onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-black" aria-label="Toggle menu">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}
      </div>

      {/* Mobile Menu */}
      {showConnect && (
        <div className={`md:hidden bg-white/90 backdrop-blur-sm border-t border-gray-200 transition-all duration-300 ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
          <div className="max-w-[960px] mx-auto px-6 py-4">
            <button onClick={() => { onConnectToPhone?.(); setIsMenuOpen(false); }}
              className="w-full bg-[#e5e5e5] hover:bg-[#d5d5d5] text-black px-6 py-3 rounded-full transition-colors">
              Connect to phone
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

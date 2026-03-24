import { Palette } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const themes = [
  { id: 'default', name: 'Warm Creamy', color: '#f97316' },
  { id: 'green', name: 'Clean Green', color: '#16a34a' },
  { id: 'luxury', name: 'Black Luxury', color: '#eab308' },
  { id: 'navy', name: 'Navy Coral', color: '#f43f5e' },
] as const;

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-content-muted hover:text-primary transition-colors rounded-full hover:bg-surface-hover"
        aria-label="Changer le thème"
      >
        <Palette className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 bg-surface rounded-xl shadow-xl border border-subtle py-2 z-50"
          >
            <div className="px-4 py-2 border-b border-subtle mb-2">
              <h3 className="text-sm font-semibold text-content">Thème</h3>
            </div>
            <div className="flex flex-col gap-1 px-2">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id as any);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    theme === t.id
                      ? 'bg-primary-50 text-primary font-medium'
                      : 'text-content-muted hover:bg-surface-hover hover:text-content'
                  }`}
                >
                  <div 
                    className="w-4 h-4 rounded-full shadow-sm" 
                    style={{ backgroundColor: t.color }}
                  />
                  {t.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

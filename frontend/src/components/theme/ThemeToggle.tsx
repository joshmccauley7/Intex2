import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
  showHint?: boolean;
}

export default function ThemeToggle({
  className = '',
  showHint = false,
}: ThemeToggleProps) {
  const { theme, toggleTheme, canPersistTheme } = useTheme();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={toggleTheme}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600/80 bg-white dark:bg-slate-800/90 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/90 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
        aria-label={
          theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
        }
        title={
          canPersistTheme
            ? 'Theme is saved in theme_preference cookie'
            : 'Theme applies for this visit only (enable preference cookies to save)'
        }
      >
        <span className="text-amber-500 dark:text-amber-300">
          {theme === 'dark' ? (
            <Sun size={18} aria-hidden />
          ) : (
            <Moon size={18} aria-hidden />
          )}
        </span>
        <span className="hidden sm:inline">
          {theme === 'dark' ? 'Light' : 'Dark'}
        </span>
      </button>
      {showHint && !canPersistTheme && (
        <span className="text-[10px] text-slate-400 max-w-[140px] leading-tight hidden lg:inline">
          Allow preference cookies to save theme
        </span>
      )}
    </div>
  );
}

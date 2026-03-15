'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon, Code2, PlusCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface NavbarProps {
  /** Show the "Add Problem" button? (default: true) */
  showAdd?: boolean;
  /** Optional right-side extra nodes */
  rightSlot?: React.ReactNode;
}

export function Navbar({ showAdd = true, rightSlot }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  return (
    <nav className="sticky top-0 z-50 h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md flex items-center justify-between px-5 shrink-0">
      {/* Left: Brand */}
      <Link href="/" className="flex items-center gap-2 group">
        <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center shadow-sm group-hover:bg-blue-500 transition-colors">
          <Code2 size={14} className="text-white" />
        </div>
        <span className="font-bold text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
          CoderLab
        </span>
      </Link>

      {/* Right: Slot + Buttons */}
      <div className="flex items-center gap-3">
        {rightSlot}

        {showAdd && (
          <Link href="/add">
            <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors shadow-sm">
              <PlusCircle size={14} />
              Add Problem
            </button>
          </Link>
        )}

        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-8 h-8 flex items-center justify-center rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all"
            title={theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        )}
      </div>
    </nav>
  );
}

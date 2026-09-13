'use client'

import { Menu } from 'lucide-react';
import { useMobileNav } from './MobileNavContext';

export default function MobileMenuButton() {
  const { toggle } = useMobileNav();

  return (
    <button
      onClick={toggle}
      aria-label="メニューを開く"
      className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 -ml-1 shrink-0"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}

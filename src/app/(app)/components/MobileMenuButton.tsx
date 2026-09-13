'use client'

import { Menu } from 'lucide-react';
import { useMobileNav } from './MobileNavContext';

export default function MobileMenuButton() {
  const { toggle, toggleDesktopCollapsed } = useMobileNav();

  const handleClick = () => {
    const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;
    if (isDesktop) {
      toggleDesktopCollapsed();
    } else {
      toggle();
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label="サイドバーの表示切り替え"
      className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 -ml-1 shrink-0"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}

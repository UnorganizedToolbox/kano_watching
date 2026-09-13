'use client'

import type { ReactNode } from 'react';
import { useMobileNav } from './MobileNavContext';

export default function MobileSidebarDrawer({ children }: { children: ReactNode }) {
  const { isOpen, close, isDesktopCollapsed } = useMobileNav();

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-white dark:bg-darkbg-primary shadow-2xl md:shadow-none transition-all duration-200 ease-out w-64 overflow-hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${isDesktopCollapsed ? 'md:w-0 md:border-r-0 md:opacity-0 md:pointer-events-none' : ''}`}
      >
        <div className="w-64 h-full flex flex-col">
          {children}
        </div>
      </aside>
    </>
  );
}

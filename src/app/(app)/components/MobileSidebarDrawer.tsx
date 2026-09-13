'use client'

import type { ReactNode } from 'react';
import { useMobileNav } from './MobileNavContext';

export default function MobileSidebarDrawer({ children }: { children: ReactNode }) {
  const { isOpen, close } = useMobileNav();

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
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-white dark:bg-darkbg-primary shadow-2xl md:shadow-none transition-transform duration-200 ease-out md:transition-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {children}
      </aside>
    </>
  );
}

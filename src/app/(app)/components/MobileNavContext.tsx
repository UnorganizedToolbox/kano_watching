'use client'

import { createContext, useContext, useState, type ReactNode } from 'react';

type MobileNavContextValue = {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <MobileNavContext.Provider
      value={{
        isOpen,
        toggle: () => setIsOpen(v => !v),
        close: () => setIsOpen(false),
      }}
    >
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error('useMobileNav must be used within MobileNavProvider');
  return ctx;
}

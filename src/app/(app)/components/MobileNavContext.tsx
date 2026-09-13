'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type MobileNavContextValue = {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  // PC(md以上)でのサイドバー折り畳み。モバイルのドロワー開閉(isOpen)とは
  // 別概念として扱う(デバイスをまたいで意味が変わらないよう分離)。
  isDesktopCollapsed: boolean;
  toggleDesktopCollapsed: () => void;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

const DESKTOP_COLLAPSE_KEY = 'learnflow_sidebar_collapsed_v1';

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  // 折り畳み状態はPCでリロードしても保持されるようlocalStorageに保存する
  useEffect(() => {
    try {
      setIsDesktopCollapsed(window.localStorage.getItem(DESKTOP_COLLAPSE_KEY) === '1');
    } catch {
      // localStorageが使えない環境では無視する
    }
  }, []);

  const toggleDesktopCollapsed = () => {
    setIsDesktopCollapsed(v => {
      const next = !v;
      try {
        window.localStorage.setItem(DESKTOP_COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <MobileNavContext.Provider
      value={{
        isOpen,
        toggle: () => setIsOpen(v => !v),
        close: () => setIsOpen(false),
        isDesktopCollapsed,
        toggleDesktopCollapsed,
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

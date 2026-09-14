'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type MobileNavContextValue = {
  // モバイル(md未満)のオーバーレイ式ドロワーの開閉
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  // PC(md以上)のアイコンのみレール: ボタンで押して固定展開("ピン留め")
  pinned: boolean;
  togglePinned: () => void;
  // PC: マウスを近づけている間だけ一時的に展開する(ピン留めとは独立)
  hovering: boolean;
  setHovering: (v: boolean) => void;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

const PINNED_KEY = 'learnflow_sidebar_pinned_v1';

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pinned, setPinnedState] = useState(false);
  const [hovering, setHovering] = useState(false);

  // ピン留め状態はPCでリロードしても保持されるようlocalStorageに保存する
  useEffect(() => {
    try {
      setPinnedState(window.localStorage.getItem(PINNED_KEY) === '1');
    } catch {
      // localStorageが使えない環境では無視する
    }
  }, []);

  const togglePinned = () => {
    setPinnedState(v => {
      const next = !v;
      try {
        window.localStorage.setItem(PINNED_KEY, next ? '1' : '0');
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
        pinned,
        togglePinned,
        hovering,
        setHovering,
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

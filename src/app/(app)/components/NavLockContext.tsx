'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// タイマー実行中・CBT問題に取り組み中など、他の画面に移動されると困る状況で
// サイドバー等のナビゲーションを封じるための仕組み。複数の画面が同時に
// ロックを要求してもズレないよう、boolean ではなくカウンタで管理する。
interface NavLockContextValue {
  isLocked: boolean;
  lock: () => void;
  unlock: () => void;
}

const NavLockContext = createContext<NavLockContextValue>({
  isLocked: false,
  lock: () => {},
  unlock: () => {},
});

export function NavLockProvider({ children }: { children: React.ReactNode }) {
  const [lockCount, setLockCount] = useState(0);

  const lock = useCallback(() => setLockCount(c => c + 1), []);
  const unlock = useCallback(() => setLockCount(c => Math.max(0, c - 1)), []);

  const value = useMemo(() => ({ isLocked: lockCount > 0, lock, unlock }), [lockCount, lock, unlock]);

  return <NavLockContext.Provider value={value}>{children}</NavLockContext.Provider>;
}

export function useNavLock() {
  return useContext(NavLockContext);
}

'use client'

import { Menu } from 'lucide-react';
import { useMobileNav } from './MobileNavContext';

// モバイル用(ドロワー開閉)とPC用(ピン留め切り替え)をCSSのブレークポイントで
// 出し分ける。JS側でウィンドウ幅を判定しない(環境によってCSSのmd:判定と
// ズレて、意図しない方の挙動が呼ばれるバグを避けるため)。
export default function MobileMenuButton() {
  const { toggle, togglePinned } = useMobileNav();

  return (
    <>
      <button
        onClick={toggle}
        aria-label="メニューを開く"
        className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 -ml-1 shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>
      <button
        onClick={togglePinned}
        aria-label="サイドバーの固定表示を切り替え"
        className="hidden md:flex w-9 h-9 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 -ml-1 shrink-0"
      >
        <Menu className="w-5 h-5" />
      </button>
    </>
  );
}

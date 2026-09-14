'use client'

import Sidebar from './Sidebar';
import { useMobileNav } from './MobileNavContext';

interface Props {
  role: string;
  level?: number;
  exp?: number;
  gamificationDisabled?: boolean;
}

// モバイルとPCで完全に別のDOM領域として出し分ける(CSSのmd:のみで制御し、
// 同じ要素をfixed/staticで出し分けようとして環境によって崩れる、という
// 問題を避ける)。Sidebarをここで直接レンダリングする(childrenを関数として
// 受け取る形は、layout.tsxがサーバーコンポーネントのためRSCの境界を越えて
// 関数を渡すことになり不可なので採らない)。
export default function MobileSidebarDrawer({ role, level, exp, gamificationDisabled }: Props) {
  const { isOpen, close, pinned, hovering, setHovering } = useMobileNav();
  const expanded = pinned || hovering;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* モバイル: オーバーレイ式ドロワー */}
      <aside
        className={`fixed md:hidden inset-y-0 left-0 z-40 w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-white dark:bg-darkbg-primary shadow-2xl transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar role={role} level={level} exp={exp} gamificationDisabled={gamificationDisabled} iconOnly={false} />
      </aside>

      {/* PC: アイコンのみの常設レール。ピン留め、またはマウスを近づけている間
          だけフル幅に展開する。展開時はabsoluteでオーバーレイし、mainの
          レイアウトを揺らさない(ピン留め時のみ実際に幅を取って押し出す) */}
      <div
        className={`hidden md:block relative shrink-0 border-r border-slate-200 dark:border-slate-800 transition-[width] duration-150 ease-out ${pinned ? 'w-64' : 'w-16'}`}
        onMouseEnter={() => !pinned && setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <div
          className={`h-full bg-white dark:bg-darkbg-primary flex flex-col ${
            !pinned && hovering
              ? 'absolute inset-y-0 left-0 w-64 shadow-2xl z-40 border-r border-slate-200 dark:border-slate-800'
              : 'w-full'
          }`}
        >
          <Sidebar role={role} level={level} exp={exp} gamificationDisabled={gamificationDisabled} iconOnly={!expanded} />
        </div>
      </div>
    </>
  );
}

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
// 問題を避ける)。
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

      {/* モバイル: オーバーレイ式ドロワー(常にフル表示) */}
      <aside
        className={`fixed md:hidden inset-y-0 left-0 z-40 w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-white dark:bg-darkbg-primary shadow-2xl transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar role={role} level={level} exp={exp} gamificationDisabled={gamificationDisabled} expanded />
      </aside>

      {/* PC: 1つの<aside>だけがアイコンレール(w-16)⇔フル幅(w-64)の間を
          widthアニメーションで行き来する(Perplexity.aiのような、アイコンは
          その場に留まりラベルだけが横から現れるイメージ)。ピン留め、または
          マウスを近づけている間はフル幅になる。以前は「アイコンのみレール」
          と「展開オーバーレイ」を別々の要素として同時に描画していたが、
          テーマの半透明背景が重なって二重に見える・要素が2つあること自体が
          分かりにくいという指摘を受け、1要素のアニメーションに統一した。
          幅が変化してもmain側のレイアウトには影響しない(常にabsolute)。 */}
      <div
        className="hidden md:block relative shrink-0 w-16"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <aside
          className={`absolute inset-y-0 left-0 bg-white dark:bg-darkbg-primary border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-[width] duration-200 ease-out ${
            expanded ? 'w-64 shadow-2xl z-40' : 'w-16'
          }`}
        >
          <Sidebar role={role} level={level} exp={exp} gamificationDisabled={gamificationDisabled} expanded={expanded} />
        </aside>
      </div>
    </>
  );
}

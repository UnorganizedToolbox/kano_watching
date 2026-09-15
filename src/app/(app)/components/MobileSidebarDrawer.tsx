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

      {/* PC: 常に幅64pxのアイコンレール(実レイアウトの幅は常に一定で、mainの
          サイズには一切影響しない)。展開時(ピン留め、またはマウスを
          近づけている間)は絶対配置のオーバーレイとして重ねて表示するだけ。
          重要: 以前はピン留め時に実際に幅を広げてmainを押し出していたが、
          内部に固定幅レイアウトを持つページ(設定画面など)がその急な幅変化に
          追従できず、枠はそのままで文字やボタンだけ動くという崩れ方をして
          いた。常にオーバーレイにすることでmain側は一切レイアウトが変わらず
          その種の崩れが起きなくなる。
          中身は<aside>タグにする(<div>ではなく)。テーマのガラス風背景/
          ブラーは`header, aside, .card-glass`をセレクタにしているため、
          <div>のままだとテーマ適用時にタブだけ透明感のない不透明な板に
          見えてしまっていた。 */}
      <div
        className="hidden md:block relative shrink-0 w-16"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <aside className="w-16 h-full bg-white dark:bg-darkbg-primary border-r border-slate-200 dark:border-slate-800 flex flex-col">
          <Sidebar role={role} level={level} exp={exp} gamificationDisabled={gamificationDisabled} iconOnly={true} />
        </aside>

        {expanded && (
          <aside className="absolute inset-y-0 left-0 w-64 bg-white dark:bg-darkbg-primary flex flex-col shadow-2xl z-40 border-r border-slate-200 dark:border-slate-800">
            <Sidebar role={role} level={level} exp={exp} gamificationDisabled={gamificationDisabled} iconOnly={false} />
          </aside>
        )}
      </div>
    </>
  );
}

'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Clock, Users, TriangleAlert, SlidersHorizontal } from "lucide-react";

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();

  const getLinkClass = (href: string) => {
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
    return `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
      isActive 
        ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
    }`;
  };

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden">
      <nav className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
        {role === 'student' ? (
          <>
            <Link href="/" className={getLinkClass('/')}>
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            <Link href="/timer" className={getLinkClass('/timer')}>
              <Clock className="w-5 h-5" />
              <span>Timer & Q&A</span>
            </Link>
            <Link href="/timeline" className={getLinkClass('/timeline')}>
              <i className="fa-solid fa-calendar-week w-5 text-center text-lg"></i>
              <span>Log / Timeline</span>
            </Link>
            <Link href="/progress" className={getLinkClass('/progress')}>
              <i className="fa-solid fa-chart-pie w-5 text-center text-lg"></i>
              <span>Progress</span>
            </Link>
          </>
        ) : (
          <>
            <Link href="/admin" className={getLinkClass('/admin')}>
              <Users className="w-5 h-5" />
              <span>生徒一覧・管理</span>
            </Link>
            <button onClick={() => alert('未実装です')} className="sidebar-tab-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20">
              <i className="fa-solid fa-chalkboard-user text-lg w-5 text-center"></i>
              <span>生徒指導 & 申請承認</span>
            </button>
            <button onClick={() => alert('未実装です')} className="sidebar-tab-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/20">
              <i className="fa-solid fa-plus-minus text-lg w-5 text-center"></i>
              <span>CBT問題作成・配信</span>
            </button>
            <button onClick={() => alert('未実装です')} className="sidebar-tab-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20">
              <i className="fa-solid fa-terminal text-lg w-5 text-center"></i>
              <span>管理者デバッグパネル</span>
            </button>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-1 shrink-0">
        <Link href="/settings" className={`w-full text-left flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
          pathname === '/settings' ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        }`}>
          <SlidersHorizontal className="w-4 h-4" />
          <span>設定 (Settings)</span>
        </Link>
        <button onClick={() => alert('不具合報告モーダルは未実装です')} className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-rose-400 dark:text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors rounded-lg">
          <TriangleAlert className="w-4 h-4" />
          <span>不具合を報告</span>
        </button>
      </div>
    </div>
  );
}

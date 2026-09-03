'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Clock, Users, TriangleAlert, SlidersHorizontal, Gamepad2 } from "lucide-react";

interface SidebarProps {
  role: string;
  level?: number;
  exp?: number;
}

export default function Sidebar({ role, level = 1, exp = 0 }: SidebarProps) {
  const pathname = usePathname();

  const getLinkClass = (href: string) => {
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
    return `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
      isActive 
        ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400' 
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
    }`;
  };

  // 簡易的な必要EXP計算（とりあえず二次関数的に）
  const requiredExp = level * level * 100;
  const progressPercent = Math.min(100, Math.max(0, (exp / requiredExp) * 100));

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden">
      <nav className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
        {role === 'student' ? (
          <>
            <Link href="/game" className="mb-4 block">
              <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800/50 rounded-xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-inner shrink-0">
                  <span className="text-[10px] mr-0.5">Lv.</span>{level}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1.5">
                    <p className="text-xs font-bold text-brand-700 dark:text-brand-300 truncate pr-2">ゲームポータル <Gamepad2 className="inline w-3 h-3 ml-0.5 opacity-70" /></p>
                    <span className="text-[9px] text-brand-600/70 dark:text-brand-400/70 font-mono">{exp}/{requiredExp}</span>
                  </div>
                  <div className="w-full bg-brand-200/60 dark:bg-brand-900/50 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-brand-500 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>
              </div>
            </Link>

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
              <span className="ml-auto text-[8px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">未実装</span>
            </button>
            <button onClick={() => alert('未実装です')} className="sidebar-tab-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20">
              <i className="fa-solid fa-terminal text-lg w-5 text-center"></i>
              <span>管理者デバッグパネル</span>
              <span className="ml-auto text-[8px] bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold">未実装</span>
            </button>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-1 shrink-0">
        <Link href="/settings?tab=general" className={`w-full text-left flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
          pathname === '/settings' ? 'bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        }`}>
          <SlidersHorizontal className="w-4 h-4" />
          <span>設定 (Settings)</span>
        </Link>
        <a href="mailto:support@learnflow.example.com?subject=不具合報告&body=【発生した画面】%0D%0A【不具合の内容】%0D%0A" className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-rose-400 dark:text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors rounded-lg">
          <TriangleAlert className="w-4 h-4" />
          <span>不具合を報告</span>
        </a>
        <div className="px-4 py-2 text-right">
          <span className="text-[10px] text-slate-300 dark:text-slate-700 font-mono font-bold">v0.0.2.0</span>
        </div>
      </div>
    </div>
  );
}

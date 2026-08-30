'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, LayoutDashboard, Clock, Users } from "lucide-react";

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
    <nav className="flex-1 flex flex-col gap-2 p-4">
      {role === 'student' ? (
        <>
          <Link href="/" className={getLinkClass('/')}>
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </Link>
          <Link href="/timeline" className={getLinkClass('/timeline')}>
            <i className="fa-solid fa-timeline w-5 text-center"></i>
            <span>Timeline</span>
          </Link>
          <Link href="/progress" className={getLinkClass('/progress')}>
            <i className="fa-solid fa-chart-line w-5 text-center"></i>
            <span>Progress</span>
          </Link>
          <Link href="/settings" className={getLinkClass('/settings')}>
            <i className="fa-solid fa-sliders w-5 text-center"></i>
            <span>設定 (Settings)</span>
          </Link>
          <Link href="/timer" className={getLinkClass('/timer')}>
            <Clock className="w-5 h-5" />
            <span>Timer & Q&A</span>
          </Link>
        </>
      ) : (
        <>
          <Link href="/admin" className={getLinkClass('/admin')}>
            <Users className="w-5 h-5" />
            <span>生徒一覧・管理</span>
          </Link>
        </>
      )}
    </nav>
  );
}

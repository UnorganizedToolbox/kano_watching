import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { CircleUserRound, TriangleAlert, SlidersHorizontal, LayoutDashboard, Clock, GraduationCap, CalendarDays } from "lucide-react";

export const metadata: Metadata = {
  title: "LearnFlow",
  description: "Math Diagnostic & Learning Tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className={cn(
        "bg-slate-50 text-slate-800 dark:bg-darkbg-primary dark:text-slate-100",
        "transition-colors duration-200 min-h-screen flex flex-col font-sans overflow-hidden theme-glass"
      )}>
        {/* Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-20">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/30">
              L
            </div>
            <h1 className="text-xl font-black tracking-tight font-title text-slate-800 dark:text-white">
              Learn<span className="text-brand-600 dark:text-brand-400">Flow</span>
            </h1>
            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              v1.0.0-next
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-brand-600 transition-colors">
              <i className="fa-solid fa-bell text-lg"></i>
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-white dark:border-darkbg-primary"></span>
            </button>
            <button className="p-2 text-amber-500 hover:text-amber-600 transition-colors" title="不具合を報告">
              <TriangleAlert className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <CircleUserRound className="w-8 h-8 text-slate-400" />
              <div className="hidden md:block text-sm">
                <p className="font-bold leading-none text-slate-700 dark:text-slate-200">タロウ</p>
                <p className="text-[10px] text-slate-500 mt-1">Student</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden relative z-10">
          {/* Sidebar */}
          <aside className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
            <div className="p-4">
              <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800/50 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                  Lv.4
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-700 dark:text-brand-300">駆け出し学習者</p>
                  <div className="w-full bg-brand-200 dark:bg-brand-900/50 rounded-full h-1.5 mt-2">
                    <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                  <p className="text-[9px] text-brand-600/70 dark:text-brand-400/70 mt-1 text-right">NEXT: 10 AP</p>
                </div>
              </div>
            </div>

            <div className="flex-1 px-4 py-2 space-y-2 overflow-y-auto">
              <Link href="/" className="sidebar-tab-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 bg-brand-600 text-white shadow-md shadow-brand-500/20">
                <LayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </Link>
              <Link href="/timer" className="sidebar-tab-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <Clock className="w-5 h-5" />
                <span>Timer & Q&A</span>
              </Link>
              <Link href="/exam" className="sidebar-tab-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <GraduationCap className="w-5 h-5" />
                <span>Exam</span>
              </Link>
              <Link href="/timeline" className="sidebar-tab-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <CalendarDays className="w-5 h-5" />
                <span>Log / Timeline</span>
              </Link>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <Link href="/settings" className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium">
                <SlidersHorizontal className="w-4 h-4" />
                <span>設定 (Settings)</span>
              </Link>
              <button className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs text-rose-400 dark:text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-medium">
                <TriangleAlert className="w-4 h-4" />
                <span>不具合を報告</span>
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto px-20 py-4 h-[calc(100vh-4rem)] flex flex-col pb-16" id="main-content-scroll">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

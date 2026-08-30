export const dynamic = 'force-dynamic';
import { cn } from "@/lib/utils";
import Link from "next/link";
import { CircleUserRound, LayoutDashboard, Clock, Users, MessageSquareWarning } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const name = profile?.name || user.email?.split('@')[0] || 'Unknown';
  const role = profile?.role || 'student';
  const isAdmin = role === 'admin';

  return (
    <>
      <div className="bg-rose-500 text-white text-xs px-2 py-1 text-center font-mono">
        DEBUG: user.id={user.id} | profile.role={profile?.role} | error={error?.message} | isAdmin={isAdmin ? 'true' : 'false'}
      </div>
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-brand-500/30">
            L
          </div>
          <h1 className="text-xl font-black tracking-tight font-title text-slate-800 dark:text-white">
            Learn<span className="text-brand-600 dark:text-brand-400">Flow</span>
            {isAdmin && <span className="ml-2 text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">Admin</span>}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CircleUserRound className="w-8 h-8 text-slate-400" />
            <div className="hidden md:block text-sm">
              <p className="font-bold leading-none text-slate-700 dark:text-slate-200">{name}</p>
              <p className="text-[10px] text-slate-500 mt-1 capitalize">{role}</p>
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button className="text-xs text-rose-500 hover:underline">ログアウト</button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        <aside className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
          {!isAdmin && (
            <div className="p-4">
              <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800/50 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                  Lv.1
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-700 dark:text-brand-300">駆け出し学習者</p>
                  <div className="w-full bg-brand-200 dark:bg-brand-900/50 rounded-full h-1.5 mt-2">
                    <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {!isAdmin ? (
              <>
                <Link href="/" className="sidebar-tab-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <LayoutDashboard className="w-5 h-5" />
                  <span>Dashboard</span>
                </Link>
                <Link href="/timer" className="sidebar-tab-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Clock className="w-5 h-5" />
                  <span>Timer & Q&A</span>
                </Link>
              </>
            ) : (
              <>
                <Link href="/admin" className="sidebar-tab-btn flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <Users className="w-5 h-5" />
                  <span>生徒一覧・管理</span>
                </Link>
              </>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto px-20 py-4 h-[calc(100vh-4rem)] flex flex-col pb-16" id="main-content-scroll">
          {children}
        </main>
      </div>
    </>
  );
}

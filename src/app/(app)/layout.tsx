import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "./components/Sidebar";
import HeaderDropdown from "./components/HeaderDropdown";

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
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const name = profile?.name || user.email?.split('@')[0] || 'Unknown';
  const role = profile?.role || 'student';
  const isAdmin = role === 'admin';

  return (
    <>
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
          <HeaderDropdown name={name} role={role} />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative z-10">
        <aside className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
          <Sidebar role={role} />
        </aside>

        <main className="flex-1 overflow-y-auto px-20 py-4 h-[calc(100vh-4rem)] flex flex-col pb-16" id="main-content-scroll">
          {children}
        </main>
      </div>
    </>
  );
}

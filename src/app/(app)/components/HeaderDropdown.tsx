'use client'

import { useState, useRef, useEffect } from "react";
import { CircleUserRound, ChevronDown, Users, Trophy, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HeaderDropdown({ name, role }: { name: string, role: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-xl transition-colors focus:outline-none"
      >
        <CircleUserRound className="w-8 h-8 text-slate-400" />
        <div className="hidden md:block text-left">
          <p className="font-bold leading-none text-slate-700 dark:text-slate-200 text-sm">{name}</p>
          <p className="text-[10px] text-slate-500 mt-1 capitalize">{role}</p>
        </div>
        <ChevronDown className="w-3 h-3 text-slate-400 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-400 dark:text-slate-500">アカウント種類</p>
            <p className="text-sm font-bold truncate capitalize">{role} アカウント</p>
          </div>
          
          <button 
            onClick={() => { setIsOpen(false); alert('未実装です'); }} 
            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            <Users className="w-4 h-4 text-slate-400" /> フレンド管理
          </button>
          <button 
            onClick={() => { setIsOpen(false); alert('未実装です'); }} 
            className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            <Trophy className="w-4 h-4 text-slate-400" /> アチーブメント一覧
          </button>
          
          <hr className="border-slate-100 dark:border-slate-800 my-1" />
          
          <form action="/auth/signout" method="post" className="w-full">
            <button 
              type="submit"
              className="w-full text-left px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> ログアウト
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

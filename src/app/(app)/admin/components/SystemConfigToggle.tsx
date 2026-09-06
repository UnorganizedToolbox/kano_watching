'use client'
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ShieldAlert } from 'lucide-react';

export default function SystemConfigToggle() {
  const [questionsEnabled, setQuestionsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadConfig() {
      const { data } = await supabase
        .from('student_activity_logs')
        .select('metadata')
        .eq('activity_type', 'SYSTEM_CONFIG')
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (data && data.length > 0 && data[0].metadata) {
        const meta = data[0].metadata as any;
        if (meta.questions_enabled === false) {
          setQuestionsEnabled(false);
        }
      }
      setLoading(false);
    }
    loadConfig();
  }, [supabase]);

  const toggleConfig = async () => {
    setLoading(true);
    const newValue = !questionsEnabled;
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      await supabase.from('student_activity_logs').insert({
        student_id: user.id,
        activity_type: 'SYSTEM_CONFIG',
        metadata: { questions_enabled: newValue }
      });
      setQuestionsEnabled(newValue);
    }
    setLoading(false);
  };

  if (loading) return <div className="text-sm text-slate-500">読み込み中...</div>;

  return (
    <button 
      onClick={toggleConfig}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
        questionsEnabled 
          ? 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700' 
          : 'bg-rose-100 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400'
      }`}
    >
      <ShieldAlert className="w-4 h-4" />
      {questionsEnabled ? '質問受付：許可 (稼働中)' : '質問受付：停止中'}
    </button>
  );
}

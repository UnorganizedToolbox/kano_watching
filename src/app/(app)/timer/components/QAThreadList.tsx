'use client'

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

export default function QAThreadList({ initialQuestions }: { initialQuestions: any[] }) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const supabase = createClient();
  const router = useRouter();

  const handleResolve = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from('questions').update({ status: 'resolved' }).eq('id', id);
    if (!error) {
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, status: 'resolved' } : q));
      router.refresh();
    }
  };

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return;
    const q = questions.find(q => q.id === id);
    if (!q) return;

    const newReply = {
      role: 'student',
      text: replyText,
      created_at: new Date().toISOString()
    };
    
    const updatedReplies = [...(q.replies || []), newReply];

    const { error } = await supabase.from('questions').update({
      replies: updatedReplies,
      status: 'open'
    }).eq('id', id);

    if (!error) {
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, replies: updatedReplies, status: 'open' } : q));
      setReplyText('');
      router.refresh();
    }
  };

  const renderTextWithMath = (text: string) => {
    const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        return <BlockMath key={i} math={part.slice(2, -2)} />;
      } else if (part.startsWith('$') && part.endsWith('$')) {
        return <InlineMath key={i} math={part.slice(1, -1)} />;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {questions.length > 0 ? (
        questions.map(q => (
          <div 
            key={q.id} 
            onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
            className={`border rounded-xl p-4 cursor-pointer transition-all ${
              q.status === 'open' ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' 
              : q.status === 'resolved' ? 'bg-slate-100 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60'
              : 'bg-brand-50/50 dark:bg-brand-900/10 border-brand-100 dark:border-brand-900/50'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className={`text-xs font-bold ${
                q.status === 'open' ? 'text-amber-600 dark:text-amber-400' 
                : q.status === 'resolved' ? 'text-slate-500'
                : 'text-brand-600 dark:text-brand-400'
              }`}>
                {q.status === 'open' ? <><i className="fa-solid fa-hourglass-half mr-1"></i> 先生の回答待ち</> 
                 : q.status === 'resolved' ? <><i className="fa-solid fa-check-double mr-1"></i> 解決済</>
                 : <><i className="fa-solid fa-check mr-1"></i> 回答済み (未解決)</>}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">{new Date(q.created_at).toLocaleDateString()}</span>
                {q.status === 'answered' && (
                  <button onClick={(e) => handleResolve(q.id, e)} className="px-2 py-1 bg-brand-500 hover:bg-brand-600 text-white text-[10px] font-bold rounded shadow-sm">
                    解決済にする
                  </button>
                )}
              </div>
            </div>
            <h5 className="font-bold text-sm mb-1 text-slate-700 dark:text-slate-200">{q.title}</h5>
            <div className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{renderTextWithMath(q.body)}</div>
            
            {q.image_url && (
              <div className="mt-3 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={q.image_url} alt="添付画像" className="max-w-full h-auto max-h-48 object-contain" />
              </div>
            )}
            
            {q.status !== 'open' && !q.answer_body && expandedId !== q.id && (
              <div className="mt-3 text-xs text-brand-600 font-bold">▶ 返信を見る</div>
            )}

            {(expandedId === q.id || q.status === 'answered') && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4" onClick={e => e.stopPropagation()}>
                {q.answer_body && (
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 block mb-1">先生からの回答:</span>
                    <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{renderTextWithMath(q.answer_body)}</div>
                  </div>
                )}
                
                {q.replies?.map((r: any, i: number) => (
                  <div key={i} className={`p-3 rounded-lg border shadow-sm ${
                    r.role === 'student' 
                      ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 ml-4' 
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 mr-4'
                  }`}>
                    <span className={`text-[10px] font-bold block mb-1 ${r.role === 'student' ? 'text-slate-500' : 'text-brand-600 dark:text-brand-400'}`}>
                      {r.role === 'student' ? 'あなた' : '先生'} ({new Date(r.created_at).toLocaleTimeString()}):
                    </span>
                    <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{renderTextWithMath(r.text)}</div>
                  </div>
                ))}

                {q.status !== 'resolved' && (
                  <div className="mt-2 flex gap-2">
                    <input 
                      type="text" 
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="返信する..." 
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      onKeyDown={e => e.key === 'Enter' && handleReply(q.id)}
                    />
                    <button onClick={() => handleReply(q.id)} className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-md hover:bg-slate-900">
                      送信
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-slate-400">
          <p className="text-xs">まだ質問はありません。</p>
        </div>
      )}
    </div>
  );
}

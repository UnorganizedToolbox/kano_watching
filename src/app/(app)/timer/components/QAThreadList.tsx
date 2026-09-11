'use client'

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { replyToQuestion, resolveQuestion, toggleQuestionFavorite } from '../actions';
import { FAVORITE_QUESTION_LIMIT } from '@/lib/qaLimits';
import { Star } from 'lucide-react';

type Reply = {
  role: 'student' | 'admin';
  text: string;
  image_url?: string | null;
  created_at: string;
};

type Question = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  status: 'open' | 'answered' | 'resolved';
  answer_body: string | null;
  replies: Reply[] | null;
  created_at: string;
  is_favorited?: boolean;
};

export default function QAThreadList({ initialQuestions }: { initialQuestions: Question[] }) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleResolve = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    startTransition(async () => {
      try {
        await resolveQuestion(id);
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, status: 'resolved' } : q));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : '更新に失敗しました');
      }
    });
  };

  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    startTransition(async () => {
      try {
        const next = await toggleQuestionFavorite(id);
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, is_favorited: next } : q));
      } catch (err) {
        setError(err instanceof Error ? err.message : '更新に失敗しました');
      }
    });
  };

  const handleReply = (id: string) => {
    if (!replyText.trim() && !replyImage) return;
    setError(null);
    const formData = new FormData();
    formData.set('question_id', id);
    formData.set('text', replyText);
    if (replyImage) formData.set('image', replyImage);

    startTransition(async () => {
      try {
        await replyToQuestion(formData);
        setReplyText('');
        setReplyImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : '返信の送信に失敗しました');
      }
    });
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
      {error && (
        <p className="text-rose-500 text-[11px] font-bold bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-2">{error}</p>
      )}
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
                <button
                  onClick={(e) => handleToggleFavorite(q.id, e)}
                  disabled={isPending}
                  title={q.is_favorited ? 'お気に入りを解除' : `お気に入りに追加(最大${FAVORITE_QUESTION_LIMIT}件)`}
                  className={`p-1 rounded disabled:opacity-50 transition-colors ${q.is_favorited ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'}`}
                >
                  <Star className="w-3.5 h-3.5" fill={q.is_favorited ? 'currentColor' : 'none'} />
                </button>
                {q.status === 'answered' && (
                  <button onClick={(e) => handleResolve(q.id, e)} disabled={isPending} className="px-2 py-1 bg-brand-500 hover:bg-brand-600 text-white text-[10px] font-bold rounded shadow-sm disabled:opacity-50">
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

                {q.replies?.map((r, i) => (
                  <div key={i} className={`p-3 rounded-lg border shadow-sm ${
                    r.role === 'student'
                      ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 ml-4'
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 mr-4'
                  }`}>
                    <span className={`text-[10px] font-bold block mb-1 ${r.role === 'student' ? 'text-slate-500' : 'text-brand-600 dark:text-brand-400'}`}>
                      {r.role === 'student' ? 'あなた' : '先生'} ({new Date(r.created_at).toLocaleTimeString()}):
                    </span>
                    {r.text && <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{renderTextWithMath(r.text)}</div>}
                    {r.image_url && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.image_url} alt="添付画像" className="max-w-full h-auto max-h-48 object-contain" />
                      </div>
                    )}
                  </div>
                ))}

                {q.status !== 'resolved' && (
                  <div className="mt-2 flex flex-col gap-2">
                    {error && <p className="text-rose-500 text-[10px] font-bold">{error}</p>}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="返信する..."
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        onKeyDown={e => e.key === 'Enter' && handleReply(q.id)}
                      />
                      <button onClick={() => handleReply(q.id)} disabled={isPending} className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-md hover:bg-slate-900 disabled:opacity-50">
                        送信
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={e => setReplyImage(e.target.files?.[0] || null)}
                      className="text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/30 dark:file:text-brand-300"
                    />
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

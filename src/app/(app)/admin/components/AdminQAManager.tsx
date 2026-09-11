'use client'

import { useMemo, useRef, useState, useTransition } from 'react';
import { answerQuestion, addAdminReply } from '../actions';

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
  profiles: {
    name: string;
    student_id: string;
  } | null;
};

type FilterTab = 'all' | 'open' | 'answered' | 'resolved';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'open', label: '未回答' },
  { key: 'answered', label: '回答済み(未解決)' },
  { key: 'resolved', label: '解決済み' },
];

const STATUS_STYLE: Record<Question['status'], { label: string; badge: string }> = {
  open: { label: '未回答', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  answered: { label: '回答済み(未解決)', badge: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400' },
  resolved: { label: '解決済み', badge: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
};

export default function AdminQAManager({ questions }: { questions: Question[] }) {
  const [tab, setTab] = useState<FilterTab>('open');
  const [query, setQuery] = useState('');
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isPending, startTransition] = useTransition();
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  const handleSendAnswer = (questionId: string) => {
    if (!answerText.trim()) return;
    const formData = new FormData();
    formData.set('question_id', questionId);
    formData.set('answer_body', answerText);

    startTransition(async () => {
      try {
        await answerQuestion(formData);
        setAnsweringId(null);
        setAnswerText('');
      } catch (e) {
        alert(e instanceof Error ? e.message : '回答の送信に失敗しました');
      }
    });
  };

  const handleSendReply = (questionId: string) => {
    if (!replyText.trim() && !replyImage) return;
    const formData = new FormData();
    formData.set('question_id', questionId);
    formData.set('text', replyText);
    if (replyImage) formData.set('image', replyImage);

    startTransition(async () => {
      try {
        await addAdminReply(formData);
        setReplyText('');
        setReplyImage(null);
        if (replyFileInputRef.current) replyFileInputRef.current.value = '';
        setReplyingId(null);
      } catch (e) {
        alert(e instanceof Error ? e.message : '返信の送信に失敗しました');
      }
    });
  };

  const counts = useMemo(() => ({
    all: questions.length,
    open: questions.filter(q => q.status === 'open').length,
    answered: questions.filter(q => q.status === 'answered').length,
    resolved: questions.filter(q => q.status === 'resolved').length,
  }), [questions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return questions.filter(item => {
      if (tab !== 'all' && item.status !== tab) return false;
      if (!q) return true;
      return (
        item.title?.toLowerCase().includes(q) ||
        item.profiles?.name?.toLowerCase().includes(q) ||
        item.profiles?.student_id?.toLowerCase().includes(q)
      );
    });
  }, [questions, tab, query]);

  return (
    <>
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="生徒名・IDやタイトルで検索..."
          className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                tab === t.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.label} ({counts[t.key]})
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 dark:bg-slate-900/20">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
            <i className="fa-solid fa-mug-hot text-3xl mb-3 text-slate-300 dark:text-slate-600"></i>
            <p className="text-sm font-medium">該当する質問はありません。</p>
          </div>
        ) : (
          filtered.map(q => (
            <div key={q.id} className="bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700/50 rounded-xl p-4 transition-all shadow-sm group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                    {q.profiles?.name?.charAt(0) || 'S'}
                  </div>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{q.profiles?.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${STATUS_STYLE[q.status].badge}`}>
                    {STATUS_STYLE[q.status].label}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">{new Date(q.created_at).toLocaleDateString()}</span>
              </div>
              <h5 className="font-bold text-sm mb-1 text-slate-800 dark:text-slate-100">{q.title}</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{q.body}</p>
              {q.image_url && (
                <div className="mt-3 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={q.image_url} alt="添付画像" className="max-w-full h-auto max-h-64 object-contain" />
                </div>
              )}

              {q.answer_body && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 block mb-1">回答内容:</span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{q.answer_body}</p>
                </div>
              )}

              {q.replies && q.replies.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  {q.replies.map((r, i) => (
                    <div key={i} className={`p-2 rounded-lg border text-xs ${
                      r.role === 'admin'
                        ? 'bg-brand-50 dark:bg-brand-900/10 border-brand-100 dark:border-brand-900/50 mr-4'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 ml-4'
                    }`}>
                      <span className={`text-[10px] font-bold block mb-1 ${r.role === 'admin' ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'}`}>
                        {r.role === 'admin' ? 'あなた' : q.profiles?.name || '生徒'} ({new Date(r.created_at).toLocaleString()}):
                      </span>
                      {r.text && <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">{r.text}</p>}
                      {r.image_url && (
                        <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.image_url} alt="添付画像" className="max-w-full h-auto max-h-48 object-contain" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 一度でも回答済みならスレッド形式の返信を使う(未回答=生徒からの新しい反応待ちに戻っても
                  最初の回答フォームではなく返信フォームを表示する) */}
              {q.status !== 'resolved' && q.answer_body && (
                replyingId === q.id ? (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="返信する..."
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSendReply(q.id)}
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      <button
                        onClick={() => handleSendReply(q.id)}
                        disabled={isPending}
                        className="px-3 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-md hover:bg-brand-700 disabled:opacity-50"
                      >
                        送信
                      </button>
                    </div>
                    <input
                      ref={replyFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => setReplyImage(e.target.files?.[0] || null)}
                      className="text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/30 dark:file:text-brand-300"
                    />
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button onClick={() => { setReplyingId(q.id); setReplyText(''); setReplyImage(null); }} className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                      返信する
                    </button>
                  </div>
                )
              )}

              {q.status !== 'resolved' && !q.answer_body && (
                answeringId === q.id ? (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
                    <textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      rows={3}
                      placeholder="回答を入力してください..."
                      className="w-full px-3 py-2 text-xs text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 dark:bg-slate-900 resize-none"
                      autoFocus
                    ></textarea>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => { setAnsweringId(null); setAnswerText(''); }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        キャンセル
                      </button>
                      <button type="button" onClick={() => handleSendAnswer(q.id)} disabled={isPending} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50">
                        回答を送信
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button onClick={() => { setAnsweringId(q.id); setAnswerText(''); }} className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-3 py-1 rounded-md hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors">
                      回答する
                    </button>
                  </div>
                )
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}

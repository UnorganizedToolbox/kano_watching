'use client'

import { useState, useTransition } from 'react';
import { replyToInquiry } from '../actions';

type Inquiry = {
  id: string;
  title: string;
  body: string;
  status: 'open' | 'answered';
  admin_reply: string | null;
  created_at: string;
  answered_at: string | null;
  profiles: { name: string } | null;
  organizations: { name: string } | null;
};

export default function InquiryList({ inquiries, isAdmin }: { inquiries: Inquiry[]; isAdmin: boolean }) {
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleReply = (id: string) => {
    if (!replyText.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await replyToInquiry(id, replyText);
        setReplyingId(null);
        setReplyText('');
      } catch (e) {
        setError(e instanceof Error ? e.message : '返信の送信に失敗しました');
      }
    });
  };

  if (inquiries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <i className="fa-solid fa-envelope-open text-3xl mb-3 text-slate-300 dark:text-slate-600"></i>
        <p className="text-sm font-medium">問い合わせはまだありません。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {inquiries.map(inq => (
        <div key={inq.id} className="bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              {isAdmin && (
                <span className="text-xs font-bold text-slate-500">
                  {inq.profiles?.name || '不明な教師'}{inq.organizations?.name ? `（${inq.organizations.name}）` : ''}
                </span>
              )}
              <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">{inq.title}</h5>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              inq.status === 'open'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
            }`}>
              {inq.status === 'open' ? '未回答' : '回答済み'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{inq.body}</p>
          <p className="text-[10px] text-slate-400 mt-1">{new Date(inq.created_at).toLocaleString()}</p>

          {inq.admin_reply && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 block mb-1">管理者からの返信:</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{inq.admin_reply}</p>
            </div>
          )}

          {isAdmin && inq.status === 'open' && (
            replyingId === inq.id ? (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="返信を入力..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 outline-none resize-none"
                />
                {error && <p className="text-rose-500 text-[10px] font-bold">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setReplyingId(null); setReplyText(''); }} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                    キャンセル
                  </button>
                  <button onClick={() => handleReply(inq.id)} disabled={isPending} className="px-3 py-1.5 bg-brand-600 text-white text-xs font-bold rounded-md hover:bg-brand-700 disabled:opacity-50">
                    {isPending ? '送信中...' : '返信する'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button onClick={() => { setReplyingId(inq.id); setReplyText(''); }} className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-3 py-1 rounded-md hover:bg-brand-100 dark:hover:bg-brand-900/40">
                  返信する
                </button>
              </div>
            )
          )}
        </div>
      ))}
    </div>
  );
}

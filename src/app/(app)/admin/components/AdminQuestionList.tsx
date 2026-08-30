'use client'

import { useState } from 'react';
import { answerQuestion } from '../actions';

type Question = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  profiles: {
    name: string;
    student_id: string;
  };
};

export default function AdminQuestionList({ questions }: { questions: Question[] }) {
  const [answeringId, setAnsweringId] = useState<string | null>(null);

  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
        <i className="fa-solid fa-mug-hot text-3xl mb-3 text-slate-300 dark:text-slate-600"></i>
        <p className="text-sm font-medium">現在、未回答の質問はありません。</p>
      </div>
    );
  }

  return (
    <>
      {questions.map(q => (
        <div key={q.id} className="bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700/50 rounded-xl p-4 transition-all shadow-sm group">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold">
                {q.profiles?.name?.charAt(0) || 'S'}
              </div>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{q.profiles?.name}</span>
            </div>
            <span className="text-[10px] text-slate-400">{new Date(q.created_at).toLocaleDateString()}</span>
          </div>
          <h5 className="font-bold text-sm mb-1 text-slate-800 dark:text-slate-100">{q.title}</h5>
          <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{q.body}</p>
          
          {answeringId === q.id ? (
            <form action={answerQuestion} className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2">
              <input type="hidden" name="question_id" value={q.id} />
              <textarea 
                required
                name="answer_body" 
                rows={3} 
                placeholder="回答を入力してください..." 
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50 dark:bg-slate-900 resize-none"
                autoFocus
              ></textarea>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setAnsweringId(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  キャンセル
                </button>
                <button type="submit" onClick={() => setTimeout(() => setAnsweringId(null), 100)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 transition-colors">
                  回答を送信
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button onClick={() => setAnsweringId(q.id)} className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-3 py-1 rounded-md hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors">
                回答する
              </button>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

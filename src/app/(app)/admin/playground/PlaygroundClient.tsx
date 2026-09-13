'use client'

import { useRef, useState, useTransition } from 'react';
import { renderPlaygroundSource } from './actions';

const DEFAULT_SOURCE = `#set text(size: 16pt)

次の二次式を展開しなさい。

$ x^2 - 11 x + 30 $

平方根: $ sqrt(2) $ / 分数: $ 3/7 $ / 三角関数: $ sin(pi/2) $

負の値の表示: $ x - (-5) $

正答: $ (x - 5)(x - 6) $
`;

export default function PlaygroundClient() {
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renderMs, setRenderMs] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const imgUrlRef = useRef<string | null>(null);

  const handleRender = () => {
    setError(null);
    const t0 = performance.now();
    startTransition(async () => {
      try {
        const result = await renderPlaygroundSource(source);
        setRenderMs(performance.now() - t0);

        if (imgUrlRef.current) {
          URL.revokeObjectURL(imgUrlRef.current);
          imgUrlRef.current = null;
        }

        if (result.ok) {
          const blob = new Blob([result.svg], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);
          imgUrlRef.current = url;
          setImgUrl(url);
        } else {
          setImgUrl(null);
          setError(result.error);
        }
      } catch (e) {
        setImgUrl(null);
        setError(e instanceof Error ? e.message : 'レンダリングに失敗しました');
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-3">
        <h3 className="font-bold text-slate-800 dark:text-white">Typstソース</h3>
        <textarea
          value={source}
          onChange={e => setSource(e.target.value)}
          rows={16}
          spellCheck={false}
          className="w-full flex-1 px-4 py-3 text-sm font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none resize-none"
        />
        <div className="flex justify-end items-center gap-3">
          {renderMs !== null && <span className="text-xs text-slate-400">前回: {renderMs.toFixed(1)}ms</span>}
          <button
            onClick={handleRender}
            disabled={isPending}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors"
          >
            {isPending ? 'レンダリング中...' : 'レンダリング'}
          </button>
        </div>
      </div>

      <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-3">
        <h3 className="font-bold text-slate-800 dark:text-white">プレビュー</h3>
        <div className="flex-1 min-h-[300px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-center overflow-auto">
          {error ? (
            <pre className="text-xs text-rose-500 whitespace-pre-wrap">{error}</pre>
          ) : imgUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgUrl} alt="Typstレンダリング結果" className="max-w-full bg-white" />
          ) : (
            <p className="text-xs text-slate-400">「レンダリング」を押すと結果が表示されます</p>
          )}
        </div>
      </div>
    </div>
  );
}

'use client'

import { useRef, useState, useTransition } from 'react';
import { askQuestion } from '../actions';
import { processQaImage } from '@/lib/imageProcessing';

export default function AskQuestionForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      return;
    }
    setIsProcessingImage(true);
    const processed = await processQaImage(file);
    setImageFile(processed);
    setIsProcessingImage(false);
  };

  const handleSubmit = (formData: FormData) => {
    setError(null);
    if (imageFile) formData.set('image', imageFile);
    else formData.delete('image');

    startTransition(async () => {
      try {
        await askQuestion(formData);
        formRef.current?.reset();
        setImageFile(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : '質問の送信に失敗しました');
      }
    });
  };

  return (
    <form ref={formRef} action={handleSubmit} className="flex flex-col gap-2">
      <input required type="text" name="title" placeholder="質問のタイトル (例: 青チャートP45について)" className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-900" />
      <textarea required name="body" rows={3} placeholder="質問内容を詳しく書いてください..." className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-900 resize-none"></textarea>

      <div className="flex items-center gap-2 mb-1">
        <input type="file" name="image" accept="image/*" onChange={handleImageChange} className="text-xs text-slate-500 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/30 dark:file:text-brand-300 w-full" />
        {isProcessingImage && <i className="fa-solid fa-circle-notch fa-spin text-slate-400 text-xs"></i>}
      </div>
      {imageFile && !isProcessingImage && (
        <p className="text-[10px] text-slate-400 -mt-1">画像を圧縮・白黒化しました({Math.round(imageFile.size / 1024)}KB)</p>
      )}

      {error && (
        <p className="text-rose-500 text-[11px] font-bold bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        disabled={isPending || isProcessingImage}
        type="submit"
        className="w-full py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <><i className="fa-solid fa-circle-notch fa-spin"></i> 送信中...</>
        ) : (
          <><i className="fa-solid fa-paper-plane"></i> 質問を送信する</>
        )}
      </button>
    </form>
  );
}

'use client'
import { useFormStatus } from 'react-dom'

export function SubmitQuestionButton() {
  const { pending } = useFormStatus()
  
  return (
    <button 
      disabled={pending}
      type="submit" 
      className="w-full py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? (
        <><i className="fa-solid fa-circle-notch fa-spin"></i> 送信中...</>
      ) : (
        <><i className="fa-solid fa-paper-plane"></i> 質問を送信する</>
      )}
    </button>
  )
}

'use client'
import { useFormStatus } from 'react-dom'

export function SubmitButton() {
  const { pending } = useFormStatus()
  
  return (
    <button 
      disabled={pending}
      type="submit" 
      className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold mt-2 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
    >
      {pending ? (
        <><i className="fa-solid fa-circle-notch fa-spin"></i> ログイン中...</>
      ) : (
        'ログイン'
      )}
    </button>
  )
}

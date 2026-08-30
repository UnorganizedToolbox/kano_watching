import { signup } from './actions'

export default function SignupPage() {
  return (
    <div className="flex-1 flex justify-center items-center h-screen bg-slate-50 dark:bg-darkbg-primary">
      <div className="card-glass bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <h1 className="text-2xl font-black font-title mb-6 text-center text-slate-800 dark:text-white">LearnFlow 新規登録</h1>
        <form className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="student_id">表示用ID (例: std_001)</label>
            <input className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white/60 dark:bg-darkbg-secondary/60 text-slate-900 dark:text-white" id="student_id" name="student_id" type="text" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="name">氏名 / ニックネーム</label>
            <input className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white/60 dark:bg-darkbg-secondary/60 text-slate-900 dark:text-white" id="name" name="name" type="text" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="email">Email</label>
            <input className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white/60 dark:bg-darkbg-secondary/60 text-slate-900 dark:text-white" id="email" name="email" type="email" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="password">Password</label>
            <input className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white/60 dark:bg-darkbg-secondary/60 text-slate-900 dark:text-white" id="password" name="password" type="password" required />
          </div>
          <button formAction={signup} className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold mt-2 shadow-md transition-all active:scale-95">
            アカウント作成
          </button>
        </form>
        <div className="mt-4 text-center">
          <a href="/login" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">ログインはこちら</a>
        </div>
      </div>
    </div>
  )
}

import { login } from './actions'

// Note: Next.js page components can accept searchParams as a prop
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  
  return (
    <div className="flex-1 flex justify-center items-center h-screen bg-slate-50 dark:bg-slate-950">
      <div className="card-glass bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <h1 className="text-2xl font-black font-title mb-6 text-center text-slate-800 dark:text-white">LearnFlow ログイン</h1>
        
        {params.error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/50 text-rose-600 dark:text-rose-400 text-sm font-bold rounded-lg">
            {params.error}
          </div>
        )}

        <form className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="email">Email</label>
            <input className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white/60 dark:bg-slate-800/60 text-slate-900 dark:text-white" id="email" name="email" type="email" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="password">Password</label>
            <input className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white/60 dark:bg-slate-800/60 text-slate-900 dark:text-white" id="password" name="password" type="password" required />
          </div>
          <button formAction={login} className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold mt-2 shadow-md transition-all active:scale-95">
            ログイン
          </button>
        </form>

        

        <div className="mt-8 text-center text-xs text-slate-500">
          ログインすることで、<br />
          <a href="/terms" className="underline hover:text-brand-500">利用規約</a> および <a href="/privacy" className="underline hover:text-brand-500">プライバシーポリシー</a> に同意したものとみなされます。
        </div>
      </div>
    </div>
  )
}

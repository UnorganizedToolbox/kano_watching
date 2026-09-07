import { signup } from './actions'
import { FormSubmitButton } from '@/components/FormSubmitButton'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const error = params?.error as string | undefined;

  return (
    <div className="flex-1 flex justify-center items-center h-screen bg-slate-50 dark:bg-darkbg-primary py-8">
      <div className="card-glass bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <h1 className="text-2xl font-black font-title mb-2 text-center text-slate-800 dark:text-white">新規登録申請</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6">
          登録にはメールアドレスの確認と管理者による承認が必要です。承認されるまでログインできません。
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold">
            {error}
          </div>
        )}

        <form action={signup} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="name">表示名（ニックネーム）</label>
            <input className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white/60 dark:bg-darkbg-secondary/60 text-slate-900 dark:text-white" id="name" name="name" type="text" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="birthdate">誕生日</label>
            <input className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white/60 dark:bg-darkbg-secondary/60 text-slate-900 dark:text-white" id="birthdate" name="birthdate" type="date" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="affiliation">所属団体（個人の場合は空欄でOK）</label>
            <input className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white/60 dark:bg-darkbg-secondary/60 text-slate-900 dark:text-white" id="affiliation" name="affiliation" type="text" placeholder="例: ○○塾" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="email">Email</label>
            <input className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white/60 dark:bg-darkbg-secondary/60 text-slate-900 dark:text-white" id="email" name="email" type="email" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1" htmlFor="password">Password</label>
            <input className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white/60 dark:bg-darkbg-secondary/60 text-slate-900 dark:text-white" id="password" name="password" type="password" required minLength={6} />
          </div>
          <FormSubmitButton
            label="登録を申請する"
            pendingLabel="送信中..."
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold mt-2 shadow-md transition-all active:scale-95"
          />
        </form>
        <div className="mt-4 text-center">
          <a href="/login" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">ログインはこちら</a>
        </div>
      </div>
    </div>
  )
}

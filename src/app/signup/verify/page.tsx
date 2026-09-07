import { resendSignupEmail } from '../actions'

export default async function VerifySignupPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const email = (params?.email as string) || '';
  const error = params?.error as string | undefined;
  const resent = params?.resent === '1';

  return (
    <div className="flex-1 flex justify-center items-center h-screen bg-slate-50 dark:bg-darkbg-primary">
      <div className="card-glass bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
          <i className="fa-solid fa-envelope text-brand-600 dark:text-brand-400 text-xl"></i>
        </div>
        <h1 className="text-xl font-black font-title mb-2 text-slate-800 dark:text-white">メールアドレスの確認</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          <span className="font-bold">{email}</span> 宛に確認メールを送信しました。メール内のリンクをクリックして登録を続けてください。
        </p>

        {error && (
          <div className="mb-4 p-3 bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold">
            {error}
          </div>
        )}
        {resent && (
          <div className="mb-4 p-3 bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold">
            確認メールを再送信しました。
          </div>
        )}

        <form action={resendSignupEmail.bind(null, email)}>
          <button type="submit" className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
            メールが届かない場合は再送信する
          </button>
        </form>
      </div>
    </div>
  )
}

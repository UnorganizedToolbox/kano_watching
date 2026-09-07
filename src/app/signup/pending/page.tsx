export default function SignupPendingPage() {
  return (
    <div className="flex-1 flex justify-center items-center h-screen bg-slate-50 dark:bg-darkbg-primary">
      <div className="card-glass bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <i className="fa-solid fa-hourglass-half text-amber-600 dark:text-amber-400 text-xl"></i>
        </div>
        <h1 className="text-xl font-black font-title mb-2 text-slate-800 dark:text-white">登録申請を受け付けました</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          メールアドレスの確認が完了しました。あとは管理者の承認をお待ちください。承認されるとログインできるようになります。
        </p>
        <a href="/login" className="inline-block px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95">
          ログイン画面へ戻る
        </a>
      </div>
    </div>
  )
}

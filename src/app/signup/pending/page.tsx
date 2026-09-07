export default function SignupPendingPage() {
  return (
    <div className="flex-1 flex justify-center items-center h-screen bg-slate-50 dark:bg-darkbg-primary">
      <div className="card-glass bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <i className="fa-solid fa-check text-emerald-600 dark:text-emerald-400 text-xl"></i>
        </div>
        <h1 className="text-xl font-black font-title mb-2 text-slate-800 dark:text-white">確認完了しました</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          メールアドレスの確認が完了しました。このタブは閉じて構いません。あとは管理者の承認をお待ちください。承認されるとログインできるようになります。
        </p>
      </div>
    </div>
  )
}

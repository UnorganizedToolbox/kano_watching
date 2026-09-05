export default function TermsPage() {
  return (
    <div className="h-screen overflow-y-auto px-4 py-8 flex flex-col">
      <div className="mb-4 max-w-4xl mx-auto w-full"><a href="/" className="text-brand-500 hover:underline font-bold">← トップへ戻る</a></div>
      <div className="max-w-4xl mx-auto card-glass bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-8 md:p-12 rounded-3xl shadow-xl text-slate-800 dark:text-slate-200">
        <h1 className="text-3xl font-black mb-8 text-slate-900 dark:text-white border-b-2 border-brand-500 pb-4 inline-block">利用規約</h1>
        
        <div className="space-y-8 leading-relaxed">
        <p>この利用規約（以下「本規約」）は、UnorganizedToolbox（以下「当方」）が提供するサービス「LearnFlow」（以下「本サービス」）の利用条件を定めるものです。ユーザーの皆様は、本規約に従って本サービスをご利用いただきます。</p>

        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">第1条（未成年者の利用）</h2>
          <p>ユーザーが未成年者の場合、本サービスの基本的な利用（アカウントの作成や学習記録など）については事前の同意を必須としませんが、**本サービス内での課金（有償機能の利用等）を行う場合に限り、必ず親権者等の法定代理人の同意を得るものとします。**</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">第2条（アカウント情報の管理）</h2>
          <ol className="list-decimal pl-6 mt-2 space-y-1">
            <li>ユーザーは、本サービスの登録にあたり、ユーザー名（ニックネーム等）を登録するものとし、本名の登録は要求されません。</li>
            <li>ユーザーは、自己の責任において、本サービスのアカウント情報を適切に管理するものとします。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">第3条（禁止事項）</h2>
          <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>法令または公序良俗に違反する行為</li>
            <li>当方、他のユーザー、または第三者のサーバーやネットワークの機能を破壊したり、妨害したりする行為</li>
            <li>その他、当方が不適切と判断する行為</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">第4条（免責事項・カレンダー連携について）</h2>
          <ol className="list-decimal pl-6 mt-2 space-y-1">
            <li>本サービスはGoogleカレンダーAPIを利用してスケジュールの読み取りおよび書き込みを行います。ただし、アプリの動作を通じて学習成果を意図的にカレンダーへ同期することはありません。</li>
            <li>**通信エラー、バグ、その他の要因によってGoogleカレンダー上の予定データが消失・変更・重複した場合でも、当方は一切の損害賠償責任を負いません。** カレンダーのバックアップ等はユーザー自身の責任で行うものとします。</li>
            <li>当方は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます）がないことを明示的にも黙示的にも保証しておりません。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">第5条（オープンソースライセンス）</h2>
          <p>本サービスはオープンソースソフトウェアとして <strong>MITライセンス</strong> のもとで公開されています。ユーザーはGitHubページからいつでもソースコードを閲覧・利用することが可能です。詳細な利用条件はGitHubリポジトリ内のLICENSEファイルに従うものとします。</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">第6条（サービス内容の変更等）</h2>
          <p>当方は、ユーザーに通知することなく、本サービスの内容を変更しまたは本サービスの提供を中止することができるものとし、これによってユーザーに生じた損害について一切の責任を負いません。</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">第7条（準拠法・裁判管轄）</h2>
          <p>本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当方の所在地を管轄する裁判所を専属的合意管轄とします。</p>
        </section>

        <p className="text-right text-sm text-slate-500 mt-12">制定日：2026年9月4日</p>
      </div>
      </div>
      <footer className="mt-auto pt-16 pb-8 text-center text-xs text-slate-500 dark:text-slate-400">
        <p className="mb-2">お問い合わせ: <a href="mailto:unorganizedtoolbox@gmail.com" className="hover:text-slate-700 dark:hover:text-slate-300">unorganizedtoolbox@gmail.com</a></p>
        <p>&copy; 2026 UnorganizedToolbox. Released under the MIT License.</p>
      </footer>
    </div>
  )
}

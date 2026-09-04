export default function PrivacyPage() {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-8">
      <div className="max-w-4xl mx-auto card-glass bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-8 md:p-12 rounded-3xl shadow-xl text-slate-800 dark:text-slate-200">
        <h1 className="text-3xl font-black mb-8 text-slate-900 dark:text-white border-b-2 border-brand-500 pb-4 inline-block">プライバシーポリシー</h1>
        
        <div className="space-y-8 leading-relaxed">
        <p>UnorganizedToolbox（以下「当方」）は、本サービス（LearnFlow）におけるユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシーを定めます。</p>

        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">第1条（収集する情報）</h2>
          <p>当方は、本サービスにおいて以下の情報を収集します。</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>ユーザー名（ニックネーム）、メールアドレス、パスワード等の認証情報</li>
            <li>Googleアカウント連携により取得する情報（Googleカレンダーの予定データ、OAuthトークン等）</li>
            <li>本サービス内での学習履歴（ポモドーロタイマーの記録、学習メモ等）</li>
          </ul>
          <p className="mt-2 text-sm text-slate-500">※本サービスでは、ユーザーの本名の登録を必須としておりません。</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">第2条（利用目的）</h2>
          <p>収集した情報は、以下の目的で利用します。</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>本サービスの提供・運営（学習スケジュールの自動作成、タイムラインの表示）</li>
            <li>ユーザーからのお問い合わせ対応</li>
            <li>利用規約に違反する利用の防止</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">第3条（Google APIデータの取り扱いについて）</h2>
          <p>本サービスは、ユーザーの同意のもと、GoogleカレンダーAPIを利用してスケジュールの「読み取り」および「書き込み」を行います。</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>取得したカレンダーの情報は、本アプリ内のタイムライン（予定表）への表示、および空き時間の計算等、本サービスのコア機能を提供するためだけに使用します。</li>
            <li>意図的に学習成果（実績等）をカレンダーへ同期（書き込み）することはありません。</li>
            <li>取得したデータを第三者に提供したり、広告目的で使用したりすることはありません。</li>
            <li>本サービスにおけるGoogle APIから受け取った情報の使用および他のアプリへの転送は、<a href="https://developers.google.com/terms/api-services-user-data-policy#limited-use" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:underline">Google API Services User Data Policy</a>の「Limited Use（限定的使用）」要件に準拠します。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">第4条（第三者提供）</h2>
          <p>当方は、法令に定めがある場合を除き、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">第5条（お問い合わせ窓口）</h2>
          <p>本ポリシーに関するお問い合わせは、下記の窓口までお願いいたします。</p>
          <p className="mt-2 font-mono bg-slate-100 dark:bg-slate-800 p-2 rounded inline-block">unorganizedtoolbox@gmail.com</p>
        </section>

        <p className="text-right text-sm text-slate-500 mt-12">制定日：2026年9月4日</p>
      </div>
    </div>
      </div>
    </div>
  )
}

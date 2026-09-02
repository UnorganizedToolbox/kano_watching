const fs = require('fs');

const tsxContent = `
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h3 className="text-xl font-bold border-b border-slate-100 dark:border-slate-800 pb-2 text-brand-600 dark:text-brand-400">プロフィール設定</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">他のユーザーから見えるあなたのプロフィール情報を変更します。</p>
              </div>

              {/* Avatar Gacha Section - Full Width */}
              <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                  
                  {/* Current Avatar */}
                  <div className="flex flex-col items-center gap-4 shrink-0">
                    <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-4 border-brand-200 shadow-lg overflow-hidden relative">
                      <ProceduralAvatar seed={avatarSeed} />
                    </div>
                    <span className="text-xs font-bold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-full border border-brand-200">現在のアイコン</span>
                  </div>

                  {/* Gacha & Collection */}
                  <div className="flex-1 w-full space-y-6">
                    <div>
                      <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1">プロフィール画像 (ジェネレーティブ・アート)</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                        アイコンは数学的アルゴリズムによって完全にランダムで生成されるユニークなデザインです。<br/>
                        無償石を消費して新しいデザインを引き直すことができます。
                      </p>
                    </div>

                    {!pendingAvatar ? (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-sm font-bold text-amber-700 dark:text-amber-500 mb-1">🎲 アバター生成ガチャ</p>
                          <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">新しいデザインを生成してコレクションに追加します。</p>
                        </div>
                        <button 
                          onClick={() => {
                            const newSeed = Math.random().toString(36).substring(7);
                            setPendingAvatar(newSeed);
                          }} 
                          className="px-6 py-3 bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 active:scale-95"
                        >
                          <i className="fa-solid fa-gem text-amber-400"></i> 無償石 50個 で引く
                        </button>
                      </div>
                    ) : (
                      <div className="p-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800/50 rounded-xl animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-16 h-16 rounded-full border-2 border-brand-500 overflow-hidden shrink-0 bg-white">
                            <ProceduralAvatar seed={pendingAvatar} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-brand-700 dark:text-brand-300 mb-1">✨ 新しいアイコンが出現しました！</p>
                            {savedAvatars.length >= 5 ? (
                              <p className="text-xs text-brand-600/80 dark:text-brand-400/80">コレクションがいっぱいです。下のリストから入れ替えるアイコンを選んでください。</p>
                            ) : (
                              <p className="text-xs text-brand-600/80 dark:text-brand-400/80">コレクションに追加しますか？</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {savedAvatars.length < 5 && (
                            <button 
                              onClick={() => {
                                setSavedAvatars([...savedAvatars, pendingAvatar]);
                                setAvatarSeed(pendingAvatar);
                                setPendingAvatar(null);
                              }}
                              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                              コレクションに追加して使用
                            </button>
                          )}
                          <button 
                            onClick={() => setPendingAvatar(null)}
                            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-colors"
                          >
                            破棄する (石は戻りません)
                          </button>
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <p className="text-xs font-bold text-slate-500">保存済みコレクション ({savedAvatars.length}/5)</p>
                        {pendingAvatar && savedAvatars.length >= 5 && (
                          <span className="text-[10px] font-bold text-rose-500 animate-pulse">入れ替えるアイコンをクリック！</span>
                        )}
                      </div>
                      
                      <div className="flex gap-3">
                        {savedAvatars.map((seed, i) => (
                          <div 
                            key={i} 
                            onClick={() => {
                              if (pendingAvatar && savedAvatars.length >= 5) {
                                const newArr = [...savedAvatars];
                                newArr[i] = pendingAvatar;
                                setSavedAvatars(newArr);
                                setAvatarSeed(pendingAvatar);
                                setPendingAvatar(null);
                              } else {
                                setAvatarSeed(seed);
                              }
                            }} 
                            className={\`w-14 h-14 rounded-full border-2 overflow-hidden transition-transform hover:scale-110 cursor-pointer \${
                              pendingAvatar && savedAvatars.length >= 5 
                                ? 'border-rose-400 hover:border-rose-600 animate-pulse' 
                                : (seed === avatarSeed ? 'border-brand-500 shadow-md shadow-brand-500/30' : 'border-transparent hover:border-slate-300')
                            }\`}
                          >
                            <ProceduralAvatar seed={seed} />
                          </div>
                        ))}
                        {Array.from({ length: 5 - savedAvatars.length }).map((_, i) => (
                          <div key={'empty-'+i} className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-300 cursor-not-allowed">
                            <i className="fa-solid fa-plus text-sm"></i>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Basic Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">ニックネーム</label>
                  <input type="text" defaultValue="Student" className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-darkbg-secondary focus:ring-2 focus:ring-brand-500 outline-none" />
                  <p className="text-[10px] text-slate-400 mt-2">他のユーザーに公開される名前です。</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 p-6">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">称号 (実績から選択)</label>
                  <select className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-darkbg-secondary focus:ring-2 focus:ring-brand-500 outline-none font-bold text-brand-700 dark:text-brand-400">
                    <option value="">(称号なし)</option>
                    <option value="1">継続の達人</option>
                    <option value="2">ポモドーロマスター</option>
                    <option value="3" disabled>完全無欠の解答者 (未獲得)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-2">アンロックした実績の中から好きなものを称号として設定し、自慢できます。</p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button className="px-8 py-4 bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg flex items-center gap-2">
                  <i className="fa-solid fa-check"></i> 変更を保存
                </button>
              </div>

            </div>
          )}
`;

let currentContent = fs.readFileSync('src/app/(app)/settings/SettingsClient.tsx', 'utf8');

// I need to replace the entire profile tab block. 
// I will use regex or string split to find the block.
const parts = currentContent.split(/{activeTab === 'profile' && \(/);
const prefix = parts[0];
const remaining = parts[1];
const suffixParts = remaining.split(/{activeTab === 'gamification' && \(/);
const suffix = '{activeTab === \'gamification\' && (' + suffixParts.slice(1).join('{activeTab === \'gamification\' && (');

// Also I need to add state `const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);`
let newPrefix = prefix;
if (!newPrefix.includes('pendingAvatar')) {
    newPrefix = newPrefix.replace(/const \[avatarSeed, setAvatarSeed\] = useState\('LearnFlowUser123'\);/, 
    "const [avatarSeed, setAvatarSeed] = useState('LearnFlowUser123');\n  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);");
}

fs.writeFileSync('src/app/(app)/settings/SettingsClient.tsx', newPrefix + tsxContent + suffix);


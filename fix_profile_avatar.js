const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/settings/SettingsClient.tsx', 'utf8');

const avatarSection = `
                  <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">プロフィール画像 (自動生成アバター)</label>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-4">
                      アイコンは完全にランダムで生成されるあなただけのユニークなデザインです。<br/>
                      無償石を消費して新しいデザインを引き直すことができます。
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl font-bold border-4 border-brand-200 shadow-sm overflow-hidden relative group">
                          {/* ダミーのDiceBearアバター画像 */}
                          <img src="https://api.dicebear.com/7.x/bottts/svg?seed=LearnFlow123" alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-full border border-brand-200">現在のアイコン</span>
                      </div>
                      
                      <div className="flex-1 w-full space-y-4">
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-500 mb-2">🎲 アバター生成ガチャ</p>
                          <button className="w-full py-2 bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center justify-center gap-2">
                            <i className="fa-solid fa-gem text-amber-400"></i> 無償石 50個 で新しく生成
                          </button>
                        </div>
                        
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 mb-2">保存済みコレクション (1/5)</p>
                          <div className="flex gap-2">
                            <div className="w-10 h-10 rounded-full border-2 border-brand-500 cursor-pointer overflow-hidden">
                              <img src="https://api.dicebear.com/7.x/bottts/svg?seed=LearnFlow123" alt="Saved 1" className="w-full h-full" />
                            </div>
                            <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-300 cursor-not-allowed">
                              <i className="fa-solid fa-plus text-xs"></i>
                            </div>
                            <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-300 cursor-not-allowed">
                              <i className="fa-solid fa-plus text-xs"></i>
                            </div>
                            <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-300 cursor-not-allowed">
                              <i className="fa-solid fa-plus text-xs"></i>
                            </div>
                            <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-300 cursor-not-allowed">
                              <i className="fa-solid fa-plus text-xs"></i>
                            </div>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1">※5個を超えると、どれか1つを削除して入れ替える必要があります。</p>
                        </div>
                      </div>
                    </div>
                  </div>
`;

content = content.replace(/<div>\s*<label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">プロフィール画像[\s\S]*?<\/button>\s*<\/div>\s*<\/div>/, avatarSection);

fs.writeFileSync('src/app/(app)/settings/SettingsClient.tsx', content);

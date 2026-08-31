'use client'

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import ProceduralAvatar from '../components/ProceduralAvatar';
import { Lock, Settings2, User, Gamepad2, Palette, CreditCard, Sparkles, AlertTriangle } from 'lucide-react';

type Tab = 'general' | 'profile' | 'gamification' | 'theme' | 'billing' | 'ai';

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const initialTab = (searchParams.get('tab') as Tab) || 'general';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [showAdvancedAI, setShowAdvancedAI] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [avatarSeed, setAvatarSeed] = useState('LearnFlowUser123');
  const [savedAvatars, setSavedAvatars] = useState<string[]>(['LearnFlowUser123']);

  useEffect(() => {
    const tab = searchParams.get('tab') as Tab;
    if (tab && ['general', 'profile', 'gamification', 'theme', 'billing', 'ai'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    router.push(`/settings?tab=${tab}`);
  };

  const tabs = [
    { id: 'general', label: '全般', icon: <Settings2 className="w-4 h-4" /> },
    { id: 'profile', label: 'プロフィール', icon: <User className="w-4 h-4" /> },
    { id: 'gamification', label: 'ゲーミフィケーション', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'theme', label: 'テーマ', icon: <Palette className="w-4 h-4" /> },
    { id: 'ai', label: 'AI設定', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'billing', label: '購入とサブスクリプション', icon: <CreditCard className="w-4 h-4" /> },
  ];

  return (
    <section className="flex-1 flex gap-6 max-w-[1200px] mx-auto w-full px-6 pt-4 pb-6 h-[calc(100vh-5rem)]">
      
      {/* Sidebar for vertical tabs */}
      <div className="w-64 shrink-0 flex flex-col gap-2">
        <h2 className="text-xl font-black font-title text-slate-800 dark:text-white mb-4 px-2">設定</h2>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id as Tab)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 text-left",
              activeTab === t.id
                ? "bg-brand-500 text-white shadow-md shadow-brand-500/20 translate-x-1"
                : "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:translate-x-1"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm min-h-full">
          
          {activeTab === 'general' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-xl font-bold border-b border-slate-100 dark:border-slate-800 pb-2">全般 (General)</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">言語設定</label>
                  <select className="w-full max-w-sm px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none">
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">音量設定</label>
                  <input type="range" min="0" max="100" defaultValue="50" className="w-full max-w-sm accent-brand-500" />
                </div>
                
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">通知設定</label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" defaultChecked className="rounded text-brand-500 focus:ring-brand-500 bg-slate-100 border-slate-300 w-4 h-4" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">プッシュ通知を有効にする</span>
                    </label>
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl max-w-lg">
                      <p className="text-xs text-amber-700 dark:text-amber-500 font-bold flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4" /> 視覚効果の低減 (光過敏性症候群への配慮)
                      </p>
                      <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80 mb-2">光過敏性発作のリスクを減らすため、激しい点滅やレベルアップ時の強いエフェクトをオフにします。軽度の方でも設定を推奨します。</p>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" className="rounded text-amber-500 focus:ring-amber-500 bg-slate-100 border-slate-300 w-4 h-4" />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">エフェクトを低減する</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-xl font-bold border-b border-slate-100 dark:border-slate-800 pb-2 text-brand-600 dark:text-brand-400">プロフィール設定</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 -mt-6">他のユーザーから見えるあなたのプロフィール情報を変更します。</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  
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
                          <ProceduralAvatar seed={avatarSeed} />
                        </div>
                        <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded-full border border-brand-200">現在のアイコン</span>
                      </div>
                      
                      <div className="flex-1 w-full space-y-4">
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                          <p className="text-xs font-bold text-amber-700 dark:text-amber-500 mb-2">🎲 アバター生成ガチャ</p>
                          <button onClick={() => {
                              const newSeed = Math.random().toString(36).substring(7);
                              setAvatarSeed(newSeed);
                              if (savedAvatars.length < 5 && !savedAvatars.includes(newSeed)) {
                                setSavedAvatars([...savedAvatars, newSeed]);
                              } else if (!savedAvatars.includes(newSeed)) {
                                // If full, just replace the last one for the mockup
                                const newArr = [...savedAvatars];
                                newArr[4] = newSeed;
                                setSavedAvatars(newArr);
                              }
                            }} className="w-full py-2 bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center justify-center gap-2 active:scale-95">
                            <i className="fa-solid fa-gem text-amber-400"></i> 無償石 50個 で新しく生成
                          </button>
                        </div>
                        
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 mb-2">保存済みコレクション ({savedAvatars.length}/5)</p>
                          <div className="flex gap-2">
                            {savedAvatars.map((seed, i) => (
                              <div key={i} onClick={() => setAvatarSeed(seed)} className="w-10 h-10 rounded-full border-2 border-brand-500 cursor-pointer overflow-hidden transition-transform hover:scale-110">
                                <ProceduralAvatar seed={seed} />
                              </div>
                            ))}
                            {Array.from({ length: 5 - savedAvatars.length }).map((_, i) => (
                              <div key={'empty-'+i} className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-300 cursor-not-allowed">
                                <i className="fa-solid fa-plus text-xs"></i>
                              </div>
                            ))}
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1">※5個を超えると、どれか1つを削除して入れ替える必要があります。</p>
                        </div>
                      </div>
                    </div>
                  </div>


                  <div>
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">ニックネーム</label>
                    <div className="flex gap-2">
                      <input type="text" defaultValue="Student" className="flex-1 px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-brand-500 outline-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">称号 (実績から選択)</label>
                    <select className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-darkbg-secondary focus:ring-2 focus:ring-brand-500 outline-none font-bold text-brand-700 dark:text-brand-400">
                      <option value="">(称号なし)</option>
                      <option value="1">継続の達人</option>
                      <option value="2">ポモドーロマスター</option>
                      <option value="3" disabled>完全無欠の解答者 (未獲得)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 mt-2">アンロックした実績の中から好きなものを称号として設定し、自慢できます。</p>
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <button className="px-6 py-3 bg-slate-800 hover:bg-slate-900 dark:bg-slate-200 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-md">
                      変更を保存
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gamification' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-xl font-bold border-b border-slate-100 dark:border-slate-800 pb-2">ゲーミフィケーション</h3>
              
              <div className="space-y-4 max-w-lg">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200">ゲーム機能 (EXP・実績など)</p>
                    <p className="text-xs text-slate-500">オフにすると純粋な学習ツールとして機能します</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-brand-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-xl font-bold border-b border-slate-100 dark:border-slate-800 pb-2">テーマ・環境設定</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">デザインスキン</label>
                  <select defaultValue="glass" className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none">
                    <option value="glass">Glassmorphism (透過ガラス)</option>
                    <option value="brutalist">Neo-Brutalism</option>
                    <option value="lofi">Cozy Lo-Fi</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-2">カラーモード</label>
                  <div className="flex gap-2 text-sm">
                    <button className="flex-1 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900 font-bold">自動</button>
                    <button className="flex-1 py-2 border border-brand-500 bg-brand-50 text-brand-700 font-bold rounded-lg">ライト</button>
                    <button className="flex-1 py-2 border rounded-lg bg-slate-800 text-slate-200 font-bold">ダーク</button>
                  </div>
                </div>

                <div className="md:col-span-2 mt-4">
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2">学習背景設定</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-xl border-2 border-brand-500 flex items-center justify-center font-bold text-slate-500 cursor-pointer">
                      設定なし
                    </div>
                    <div className="aspect-video bg-gradient-to-tr from-indigo-900 to-purple-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-white/50 cursor-pointer relative overflow-hidden">
                      <span className="absolute inset-0 bg-black/20 flex items-center justify-center"><Lock className="w-4 h-4 mr-1"/> Lv.2</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 text-center py-10">
              <div className="w-20 h-20 mx-auto bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mb-6">
                <Sparkles className="w-10 h-10" />
              </div>
              <h3 className="text-3xl font-black font-title text-slate-800 dark:text-white mb-2">購入とサブスクリプション</h3>
              <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                現在、このアプリケーションのすべての機能は<br/><span className="text-brand-500 font-bold">完全無料！</span> でご利用いただけます。
              </p>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
              <h3 className="text-xl font-bold border-b border-slate-100 dark:border-slate-800 pb-2">AI設定</h3>
              
              <div className="space-y-6 max-w-lg">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200">AI分析</p>
                    <p className="text-xs text-slate-500">学習データの自動分析とフィードバックを有効にします</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-brand-500"></div>
                  </label>
                </div>

                <div className="p-5 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-indigo-500 mb-1">残りAIクレジット</p>
                    <p className="text-2xl font-black font-mono text-indigo-700 dark:text-indigo-400">--- / ---</p>
                  </div>
                  <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm">
                    購入
                  </button>
                </div>
                
                <hr className="border-slate-100 dark:border-slate-800" />
                
                <div>
                  <button 
                    onClick={() => setShowAdvancedAI(!showAdvancedAI)}
                    className="text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                  >
                    高度なオプション {showAdvancedAI ? '▲' : '▼'}
                  </button>
                  
                  {showAdvancedAI && (
                    <div className="mt-4 p-5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4 animate-in fade-in zoom-in-95">
                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">APIキーの入力 (Bring Your Own Key)</label>
                        <input 
                          type="password" 
                          placeholder="sk-..." 
                          onChange={(e) => setHasApiKey(e.target.value.length > 0)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-darkbg-primary focus:ring-2 focus:ring-brand-500 outline-none" 
                        />
                        <p className="text-[10px] text-slate-400 mt-1">ご自身のAPIキーを使用することで、クレジットを消費せずにAI機能を利用できます。</p>
                      </div>
                      
                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">言語モデル選択</label>
                        <select 
                          disabled={!hasApiKey}
                          className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-darkbg-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="gpt4o">GPT-4o (おすすめ)</option>
                          <option value="claude35">Claude 3.5 Sonnet</option>
                          <option value="gemini15">Gemini 1.5 Pro</option>
                        </select>
                        {!hasApiKey && <p className="text-[10px] text-rose-500 mt-1">APIキーを入力するとモデルを選択できるようになります。</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}

export default function SettingsClientWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}

'use client'

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveDeck, deleteDeck, listTemplatesForPicker, listDecksForPicker, type DeckInput, type DeckItemForm } from './actions';
import type { DeckChildKind } from '@/lib/cbt/deck';
import { DECK_MAX_QUESTIONS } from '@/lib/cbt/deck';
import { Trash2, Plus, Info } from 'lucide-react';

const EMPTY_ITEM: DeckItemForm = { childKind: 'template', childId: '', weight: 1 };

export default function DeckForm({
  deckId,
  initialTitle = '',
  initialItems = [],
  organizations,
  isAdmin,
  initialOrganizationId,
}: {
  deckId?: string;
  initialTitle?: string;
  initialItems?: DeckItemForm[];
  organizations: { id: string; name: string }[];
  isAdmin: boolean;
  initialOrganizationId?: string | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [organizationId, setOrganizationId] = useState(initialOrganizationId || organizations[0]?.id || '');
  const [items, setItems] = useState<DeckItemForm[]>(initialItems.length > 0 ? initialItems : [{ ...EMPTY_ITEM }]);

  const [templates, setTemplates] = useState<{ id: string; title: string }[]>([]);
  const [decks, setDecks] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (!organizationId) return;
    listTemplatesForPicker(organizationId).then(setTemplates);
    listDecksForPicker(organizationId, deckId).then(setDecks);
  }, [organizationId, deckId]);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const updateItem = (idx: number, field: keyof DeckItemForm, value: string) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      if (field === 'weight') return { ...it, weight: Number(value) || 0 };
      if (field === 'childKind') return { ...it, childKind: value as DeckChildKind, childId: '' };
      return { ...it, [field]: value };
    }));
  };
  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const weightSum = items.reduce((s, i) => s + (Number(i.weight) || 0), 0);
  const overCap = weightSum > DECK_MAX_QUESTIONS;

  const buildInput = (): DeckInput => ({
    id: deckId,
    organizationId: isAdmin ? organizationId : undefined,
    title,
    items,
  });

  const handleSave = () => {
    setSaveError(null);
    setSaveOk(false);
    startSaveTransition(async () => {
      try {
        const result = await saveDeck(buildInput());
        if (result.ok) {
          setSaveOk(true);
          if (!deckId && result.id) {
            router.push(`/admin/decks/${result.id}/edit`);
          } else if (deckId) {
            // 既存デッキの編集を保存したら一覧に戻る
            router.push('/admin/decks');
          }
        } else {
          setSaveError(result.error || '保存に失敗しました');
        }
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : '保存に失敗しました');
      }
    });
  };

  const handleDelete = () => {
    if (!deckId) return;
    if (!confirm('このデッキを削除しますか?この操作は取り消せません。')) return;
    startDeleteTransition(async () => {
      try {
        await deleteDeck(deckId);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : '削除に失敗しました');
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-[700px]">
      <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-1">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="例: 中学一年生一学期中間対策"
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none"
          />
        </div>

        {isAdmin && (
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-1">団体</label>
            <select
              value={organizationId}
              onChange={e => setOrganizationId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none"
            >
              {organizations.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-2.5 items-start bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/50 rounded-2xl p-4 text-xs text-sky-800 dark:text-sky-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          <span className="font-bold">使い分けの目安:</span> 直後の演習用には同じ単元のテンプレートだけを
          集めた「単一単元デッキ」で構いませんが、定期テスト対策や復習用のデッキは、複数の単元・解法
          パターンを意図的に混ぜた「インターリーブ(交差)デッキ」にすると、まとめて同じ単元を解き続ける
          より長期的な定着に効果が高いことが研究で示されています。上の構成欄に単元の異なる複数の
          テンプレート/サブデッキを追加すると、そのままインターリーブ用デッキになります。
        </p>
      </div>

      <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-slate-800 dark:text-white">構成(サブデッキ・問題テンプレート)</h3>
          <span className={`text-xs font-bold ${overCap ? 'text-rose-500' : 'text-slate-400'}`}>
            出題数 {weightSum} / {DECK_MAX_QUESTIONS}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          各行の数値は「そのテンプレート/サブデッキから何問出題するか」を表す確定した問題数です(抽選の確率ではありません)。サブデッキを追加した場合は、その内部比率を保ったまま指定した数に按分されます。数値の合計がそのままこのデッキを使ったときの出題数になります。
        </p>

        <div className="space-y-2">
          {items.map((item, idx) => {
            const options = item.childKind === 'deck' ? decks : templates;
            return (
              <div key={idx} className="grid grid-cols-[6rem_minmax(0,1fr)_5rem_auto] gap-2 items-center">
                <select
                  value={item.childKind}
                  onChange={e => updateItem(idx, 'childKind', e.target.value)}
                  className="w-full min-w-0 px-1 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none"
                >
                  <option value="template">問題</option>
                  <option value="deck">サブデッキ</option>
                </select>
                <select
                  value={item.childId}
                  onChange={e => updateItem(idx, 'childId', e.target.value)}
                  className="w-full min-w-0 px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none"
                >
                  <option value="">選択してください</option>
                  {options.map(o => (
                    <option key={o.id} value={o.id}>{'title' in o ? o.title : ''}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={item.weight}
                  onChange={e => updateItem(idx, 'weight', e.target.value)}
                  className="w-full min-w-0 px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none"
                  title="出題数(確定した問題数)"
                />
                <button onClick={() => removeItem(idx)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
        <button onClick={addItem} className="mt-3 flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-3 py-1.5 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors">
          <Plus className="w-3.5 h-3.5" /> 追加
        </button>
      </div>

      <div className="flex justify-between items-center">
        {deckId ? (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {isDeleting ? '削除中...' : 'このデッキを削除'}
          </button>
        ) : <span />}

        <div className="flex items-center gap-3">
          {saveError && <span className="text-rose-500 text-xs font-bold max-w-md">{saveError}</span>}
          {saveOk && <span className="text-brand-600 text-xs font-bold">保存しました</span>}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors"
          >
            {isSaving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  );
}

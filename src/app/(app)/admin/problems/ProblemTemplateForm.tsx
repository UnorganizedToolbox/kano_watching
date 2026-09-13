'use client'

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveTemplate, previewTemplate, deleteTemplate, type TemplateInput } from './actions';
import type { VariableDef, VarType } from '@/lib/cbt/types';
import { Trash2, Plus, RotateCcw } from 'lucide-react';

interface ToolbarSnippet {
  label: string;
  insert: string;
  cursorOffsetFromEnd: number;
}

const TOOLBAR_SNIPPETS: ToolbarSnippet[] = [
  { label: '√', insert: 'sqrt()', cursorOffsetFromEnd: 1 },
  { label: 'π', insert: 'pi', cursorOffsetFromEnd: 0 },
  { label: 'a/b', insert: '()/()', cursorOffsetFromEnd: 4 },
  { label: 'x²', insert: '^2', cursorOffsetFromEnd: 0 },
  { label: 'sin', insert: 'sin()', cursorOffsetFromEnd: 1 },
  { label: '≤', insert: '<=', cursorOffsetFromEnd: 0 },
  { label: '≠', insert: '!=', cursorOffsetFromEnd: 0 },
  { label: 'αβγ', insert: 'alpha', cursorOffsetFromEnd: 0 },
  { label: '{{}}', insert: '{{}}', cursorOffsetFromEnd: 2 },
];

function insertAtCursor(
  textarea: HTMLTextAreaElement | null,
  current: string,
  snippet: ToolbarSnippet,
  setValue: (v: string) => void,
) {
  if (!textarea) {
    setValue(current + snippet.insert);
    return;
  }
  const start = textarea.selectionStart ?? current.length;
  const end = textarea.selectionEnd ?? current.length;
  const next = current.slice(0, start) + snippet.insert + current.slice(end);
  setValue(next);
  const caret = start + snippet.insert.length - snippet.cursorOffsetFromEnd;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(caret, caret);
  });
}

const VAR_TYPE_OPTIONS: { value: VarType; label: string }[] = [
  { value: 'integer', label: '整数' },
  { value: 'real', label: '実数' },
];

const EMPTY_VARIABLE: VariableDef = { name: '', type: 'integer', min: '', max: '' };

export default function ProblemTemplateForm({
  templateId,
  initialTitle = '',
  initialVariables = [EMPTY_VARIABLE],
  initialConstraints = [],
  initialProblemTemplate = '',
  initialAnswerTemplate = '',
  organizations,
  isAdmin,
  initialOrganizationId,
}: {
  templateId?: string;
  initialTitle?: string;
  initialVariables?: VariableDef[];
  initialConstraints?: string[];
  initialProblemTemplate?: string;
  initialAnswerTemplate?: string;
  organizations: { id: string; name: string }[];
  isAdmin: boolean;
  initialOrganizationId?: string | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [organizationId, setOrganizationId] = useState(initialOrganizationId || organizations[0]?.id || '');
  const [variables, setVariables] = useState<VariableDef[]>(initialVariables);
  const [constraints, setConstraints] = useState<string[]>(initialConstraints);
  const [problemTemplate, setProblemTemplate] = useState(initialProblemTemplate);
  const [answerTemplate, setAnswerTemplate] = useState(initialAnswerTemplate);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();

  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewImgUrl, setPreviewImgUrl] = useState<string | null>(null);
  const [previewValues, setPreviewValues] = useState<Record<string, number> | null>(null);
  const [isPreviewing, startPreviewTransition] = useTransition();

  const [isDeleting, startDeleteTransition] = useTransition();

  const problemTextareaRef = useRef<HTMLTextAreaElement>(null);

  const updateVariable = (idx: number, field: keyof VariableDef, value: string) => {
    setVariables(prev => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  };

  const addVariable = () => setVariables(prev => [...prev, { ...EMPTY_VARIABLE }]);
  const removeVariable = (idx: number) => setVariables(prev => prev.filter((_, i) => i !== idx));

  const updateConstraint = (idx: number, value: string) => {
    setConstraints(prev => prev.map((c, i) => (i === idx ? value : c)));
  };
  const addConstraint = () => setConstraints(prev => [...prev, '']);
  const removeConstraint = (idx: number) => setConstraints(prev => prev.filter((_, i) => i !== idx));

  const buildInput = (): TemplateInput => ({
    id: templateId,
    organizationId: isAdmin ? organizationId : undefined,
    title,
    variables,
    constraints,
    problemTemplate,
    answerTemplate,
  });

  const handleSave = () => {
    setSaveError(null);
    setSaveOk(false);
    startSaveTransition(async () => {
      const result = await saveTemplate(buildInput());
      if (result.ok) {
        setSaveOk(true);
        if (!templateId && result.id) {
          router.push(`/admin/problems/${result.id}/edit`);
        }
      } else {
        setSaveError(result.error || '保存に失敗しました');
      }
    });
  };

  const handlePreview = () => {
    setPreviewError(null);
    startPreviewTransition(async () => {
      const result = await previewTemplate({ variables, constraints, problemTemplate, answerTemplate });
      if (result.ok) {
        const blob = new Blob([result.svg], { type: 'image/svg+xml' });
        setPreviewImgUrl(URL.createObjectURL(blob));
        setPreviewValues(result.values);
      } else {
        setPreviewImgUrl(null);
        setPreviewValues(null);
        setPreviewError(result.error);
      }
    });
  };

  const handleDelete = () => {
    if (!templateId) return;
    if (!confirm('このテンプレートを削除しますか?この操作は取り消せません。')) return;
    startDeleteTransition(async () => {
      try {
        await deleteTemplate(templateId);
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : '削除に失敗しました');
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 左パネル */}
      <div className="flex flex-col gap-6">
        <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mb-1">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="例: 2次式の展開"
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

        <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-white mb-1">① 変数と範囲</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">最小値・最大値には数式(他の変数を含む式)や <code>inf</code> / <code>-inf</code> を指定できます。変数名は英字のみ。</p>

          <div className="space-y-2">
            {variables.map((v, idx) => (
              <div key={idx} className="grid grid-cols-[3rem_5rem_1fr_1fr_auto] gap-2 items-center">
                <input
                  value={v.name}
                  onChange={e => updateVariable(idx, 'name', e.target.value)}
                  placeholder="A"
                  className="px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none font-mono"
                />
                <select
                  value={v.type}
                  onChange={e => updateVariable(idx, 'type', e.target.value)}
                  className="px-1 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none"
                >
                  {VAR_TYPE_OPTIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input
                  value={v.min}
                  onChange={e => updateVariable(idx, 'min', e.target.value)}
                  placeholder="最小値"
                  className="px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none font-mono"
                />
                <input
                  value={v.max}
                  onChange={e => updateVariable(idx, 'max', e.target.value)}
                  placeholder="最大値"
                  className="px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none font-mono"
                />
                <button onClick={() => removeVariable(idx)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addVariable} className="mt-3 flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-3 py-1.5 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors">
            <Plus className="w-3.5 h-3.5" /> 変数を追加
          </button>
        </div>

        <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-white mb-1">② 制約条件</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">四則演算を含む比較式。例: <code>A != B</code>、<code>A/B != 1/2</code>、<code>forall(A) A*A != B</code></p>

          <div className="space-y-2">
            {constraints.map((c, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  value={c}
                  onChange={e => updateConstraint(idx, e.target.value)}
                  placeholder="A < B"
                  className="flex-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none font-mono"
                />
                <button onClick={() => removeConstraint(idx)} className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addConstraint} className="mt-3 flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-3 py-1.5 rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors">
            <Plus className="w-3.5 h-3.5" /> 制約を追加
          </button>
        </div>
      </div>

      {/* 右パネル */}
      <div className="flex flex-col gap-6">
        <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 dark:text-white mb-1">③ 問題文エディタ (Typst構文)</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2"><code>{'{{変数名}}'}</code> または <code>{'{{式}}'}</code>(例: <code>{'{{A+B}}'}</code>)で値を埋め込みます。</p>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {TOOLBAR_SNIPPETS.map(s => (
              <button
                key={s.label}
                type="button"
                onClick={() => insertAtCursor(problemTextareaRef.current, problemTemplate, s, setProblemTemplate)}
                className="px-2.5 py-1 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>

          <textarea
            ref={problemTextareaRef}
            value={problemTemplate}
            onChange={e => setProblemTemplate(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder={'次の二次式を展開しなさい。\n$ x^2 - {{A+B}} x + {{A*B}} $'}
            className="w-full px-3 py-2 text-sm font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none resize-none"
          />

          <label className="text-sm font-bold text-slate-700 dark:text-slate-200 block mt-4 mb-1">正答・解説テンプレート</label>
          <textarea
            value={answerTemplate}
            onChange={e => setAnswerTemplate(e.target.value)}
            rows={3}
            spellCheck={false}
            placeholder={'(x - {{A}})(x - {{B}})'}
            className="w-full px-3 py-2 text-sm font-mono border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 outline-none resize-none"
          />
        </div>

        <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 dark:text-white">④ プレビュー(サンプル生成 × 1)</h3>
            <button
              onClick={handlePreview}
              disabled={isPreviewing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border border-brand-300 text-brand-600 dark:text-brand-400 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" /> {isPreviewing ? '生成中...' : '再生成'}
            </button>
          </div>
          <div className="min-h-[160px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center justify-center overflow-auto">
            {previewError ? (
              <pre className="text-xs text-rose-500 whitespace-pre-wrap">{previewError}</pre>
            ) : previewImgUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewImgUrl} alt="プレビュー" className="max-w-full bg-white" />
            ) : (
              <p className="text-xs text-slate-400">「再生成」を押すとプレビューが表示されます</p>
            )}
          </div>
          {previewValues && (
            <p className="text-[10px] text-slate-400 font-mono">生成値: {Object.entries(previewValues).map(([k, v]) => `${k}=${v}`).join(', ')}</p>
          )}
        </div>

        <div className="flex justify-between items-center">
          {templateId ? (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors disabled:opacity-50"
            >
              {isDeleting ? '削除中...' : 'このテンプレートを削除'}
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
              {isSaving ? '保存中(検証中)...' : '保存する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

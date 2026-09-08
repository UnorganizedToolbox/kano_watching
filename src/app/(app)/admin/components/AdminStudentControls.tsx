'use client'

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Unlock, ShieldOff, ShieldCheck, Trash2, GraduationCap } from 'lucide-react';
import { setStudentNickname, setStudentStatus, deleteStudent, promoteToTeacher } from '../actions';

type Organization = { id: string; name: string };

export default function AdminStudentControls({
  studentId,
  initialName,
  initialLocked,
  initialStatus,
  initialRole,
  organizations,
}: {
  studentId: string;
  initialName: string;
  initialLocked: boolean;
  initialStatus: string;
  initialRole: string;
  organizations: Organization[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [locked, setLocked] = useState(initialLocked);
  const [status, setStatus] = useState(initialStatus);
  const [role, setRole] = useState(initialRole);
  const [organizationId, setOrganizationId] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSaveNickname = () => {
    setMessage('');
    startTransition(async () => {
      try {
        await setStudentNickname(studentId, name, locked);
        setMessage('保存しました。');
        setTimeout(() => setMessage(''), 3000);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : '更新に失敗しました');
      }
    });
  };

  const handleToggleStatus = () => {
    const nextStatus = status === 'disabled' ? 'active' : 'disabled';
    if (nextStatus === 'disabled' && !confirm('このアカウントを無効化しますか？次回ログイン時にアクセスできなくなります。')) {
      return;
    }
    startTransition(async () => {
      try {
        await setStudentStatus(studentId, nextStatus);
        setStatus(nextStatus);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : '更新に失敗しました');
      }
    });
  };

  const handleApprove = () => {
    startTransition(async () => {
      try {
        await setStudentStatus(studentId, 'active');
        setStatus('active');
      } catch (e) {
        setMessage(e instanceof Error ? e.message : '更新に失敗しました');
      }
    });
  };

  const handlePromote = () => {
    if (!confirm(`${name} を教師に昇格させますか？`)) return;
    startTransition(async () => {
      try {
        await promoteToTeacher(studentId, organizationId || null);
        setRole('teacher');
        setMessage('教師に昇格しました。');
        setTimeout(() => setMessage(''), 3000);
      } catch (e) {
        setMessage(e instanceof Error ? e.message : '昇格に失敗しました');
      }
    });
  };

  const handleDelete = async () => {
    const typed = prompt(
      `${name} のアカウントを完全に削除します。学習記録・質問・実績などすべてのデータが復元不可能になります。\n続行するには「削除」と入力してください。`
    );
    if (typed !== '削除') return;

    setIsDeleting(true);
    try {
      await deleteStudent(studentId);
      router.push('/admin');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '削除に失敗しました');
      setIsDeleting(false);
    }
  };

  return (
    <div className="card-glass bg-white dark:bg-darkbg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">アカウント管理</h3>

      <div className="mb-4 pb-4 border-b border-slate-100 dark:border-slate-800 space-y-1.5">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500 dark:text-slate-400">アカウント状態</span>
          <span className={`font-bold ${
            status === 'pending' ? 'text-amber-600 dark:text-amber-400'
            : status === 'disabled' ? 'text-rose-600 dark:text-rose-400'
            : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {status === 'pending' ? '承認待ち' : status === 'disabled' ? '停止中' : '有効'}
          </span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-500 dark:text-slate-400">ニックネーム固定</span>
          <span className={`font-bold ${locked ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
            {locked ? 'あり' : 'なし'}
          </span>
        </div>
      </div>

      <label className="text-xs font-bold text-slate-500 block mb-1">ニックネーム</label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
        />
        <button
          onClick={() => setLocked(l => !l)}
          title={locked ? '固定を解除する' : '固定する(本人は変更不可になります)'}
          className={`px-3 rounded-lg border text-xs font-bold flex items-center gap-1 transition-colors ${
            locked
              ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'
              : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-700'
          }`}
        >
          {locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          {locked ? '固定中' : '未固定'}
        </button>
      </div>
      <button
        onClick={handleSaveNickname}
        disabled={isPending}
        className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 mb-4"
      >
        ニックネーム設定を保存
      </button>

      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <label className="text-xs font-bold text-slate-500 block mb-2">アカウント操作</label>
        {status === 'pending' ? (
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
          >
            <ShieldCheck className="w-4 h-4" />
            登録を承認する
          </button>
        ) : (
          <button
            onClick={handleToggleStatus}
            disabled={isPending}
            className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${
              status === 'disabled'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
            }`}
          >
            {status === 'disabled' ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
            {status === 'disabled' ? 'アカウントを有効化する' : 'アカウントを無効化する'}
          </button>
        )}
      </div>

      {role === 'student' ? (
        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-bold text-slate-500 block mb-2">教師への昇格</label>
          <div className="flex gap-2">
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
            >
              <option value="">担当団体なし</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handlePromote}
            disabled={isPending}
            className="w-full mt-2 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400"
          >
            <GraduationCap className="w-4 h-4" />
            教師に昇格させる
          </button>
        </div>
      ) : (
        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-sm">
          <span className="text-slate-500 dark:text-slate-400">役割: </span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">教師</span>
        </div>
      )}

      <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
        <label className="text-xs font-bold text-rose-500 block mb-2">危険な操作</label>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40"
        >
          <Trash2 className="w-4 h-4" />
          {isDeleting ? '削除中...' : 'アカウントを完全に削除する'}
        </button>
        <p className="text-[10px] text-slate-400 mt-1">学習記録・質問・実績を含め、すべてのデータが復元不可能になります。</p>
      </div>

      {message && <p className="text-xs text-slate-500 mt-3">{message}</p>}
    </div>
  );
}

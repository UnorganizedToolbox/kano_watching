'use server'

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { RULE_DEFS, type RuleMap } from "@/lib/rules";

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ログインしていません');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('権限がありません');

  return supabase;
}

async function verifyAdminOrTeacher() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ログインしていません');

  const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') throw new Error('権限がありません');

  return {
    supabase,
    callerRole: profile.role as 'admin' | 'teacher',
    callerOrgId: profile.organization_id as string | null,
  };
}

// 団体の人数上限(-1 は無制限)をチェックする。上限に達している場合は例外を投げる。
async function checkOrgCapacity(supabase: SupabaseClient, organizationId: string) {
  const { data: org } = await supabase.from('organizations').select('member_limit').eq('id', organizationId).single();
  if (!org || org.member_limit === -1) return;

  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .in('role', ['student', 'teacher']);

  if ((count || 0) >= org.member_limit) {
    throw new Error(`この団体は人数の上限(${org.member_limit}人)に達しています`);
  }
}

export async function setStudentStatus(studentId: string, status: 'active' | 'disabled') {
  const supabase = await verifyAdmin();

  const { error } = await supabase.from('profiles').update({ status }).eq('id', studentId).eq('role', 'student');

  if (error) {
    console.error('Failed to update student status', error);
    throw new Error('生徒のステータス更新に失敗しました');
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/student/${studentId}`);
}

export async function deleteStudent(studentId: string) {
  const supabase = await verifyAdmin();

  const { data: target } = await supabase.from('profiles').select('role').eq('id', studentId).single();
  if (!target || target.role !== 'student') throw new Error('削除対象が正しくありません');

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(studentId);

  if (error) {
    console.error('Failed to delete student', error);
    throw new Error('生徒の削除に失敗しました');
  }

  revalidatePath('/admin');
}

// 承認待ち(pending)のアカウントを承認する。
// 教師は自分の団体に所属する申請のみ承認可能。管理者は任意の団体を指定して承認できる
// (organizationId を省略した場合は申請時に入力された団体のまま)。
export async function approveMember(memberId: string, organizationId?: string | null) {
  const { supabase, callerRole, callerOrgId } = await verifyAdminOrTeacher();

  const { data: target } = await supabase.from('profiles').select('status, organization_id').eq('id', memberId).single();
  if (!target) throw new Error('対象が見つかりません');
  if (target.status !== 'pending') throw new Error('承認待ちのアカウントではありません');

  let resolvedOrgId: string | null;
  if (callerRole === 'teacher') {
    if (!callerOrgId) throw new Error('あなたは団体に所属していません');
    if (target.organization_id !== callerOrgId) throw new Error('自分の団体に所属する申請のみ承認できます');
    resolvedOrgId = callerOrgId;
  } else {
    resolvedOrgId = organizationId !== undefined ? organizationId : target.organization_id;
  }

  if (resolvedOrgId) {
    await checkOrgCapacity(supabase, resolvedOrgId);
  }

  const { error } = await supabase.from('profiles').update({
    status: 'active',
    organization_id: resolvedOrgId,
  }).eq('id', memberId);

  if (error) {
    console.error('Failed to approve member', error);
    throw new Error('承認に失敗しました');
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/student/${memberId}`);
}

// 教師は自分の団体に所属する生徒のみ、自団体の教師として昇格させられる。
// 管理者は任意の生徒を、任意の団体を指定して昇格させられる。
export async function promoteToTeacher(userId: string, organizationId?: string | null) {
  const { supabase, callerRole, callerOrgId } = await verifyAdminOrTeacher();

  const { data: target } = await supabase.from('profiles').select('role, organization_id').eq('id', userId).single();
  if (!target || target.role !== 'student') throw new Error('対象は生徒アカウントではありません');

  let resolvedOrgId: string | null;
  if (callerRole === 'teacher') {
    if (!callerOrgId) throw new Error('あなたは団体に所属していません');
    if (target.organization_id !== callerOrgId) throw new Error('自分の団体に所属する生徒のみ昇格させられます');
    resolvedOrgId = callerOrgId;
  } else {
    resolvedOrgId = organizationId !== undefined ? organizationId : target.organization_id;
  }

  const { error } = await supabase.from('profiles').update({
    role: 'teacher',
    organization_id: resolvedOrgId,
  }).eq('id', userId);

  if (error) {
    console.error('Failed to promote to teacher', error);
    throw new Error('教師への昇格に失敗しました');
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/student/${userId}`);
}

// 管理者が任意のユーザーの所属団体を直接変更する
export async function setMemberOrganization(memberId: string, organizationId: string | null) {
  const supabase = await verifyAdmin();

  const { error } = await supabase.from('profiles').update({ organization_id: organizationId }).eq('id', memberId);

  if (error) {
    console.error('Failed to set member organization', error);
    throw new Error('所属団体の変更に失敗しました');
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/student/${memberId}`);
}

export async function createOrganization(formData: FormData) {
  const supabase = await verifyAdmin();

  const name = (formData.get('name') as string)?.trim();
  if (!name) throw new Error('団体名を入力してください');

  const memberLimitRaw = (formData.get('member_limit') as string)?.trim();
  const memberLimit = memberLimitRaw ? parseInt(memberLimitRaw, 10) : -1;
  if (Number.isNaN(memberLimit) || memberLimit < -1) throw new Error('人数上限は -1(無制限)以上の整数で入力してください');

  const { error } = await supabase.from('organizations').insert({ name, member_limit: memberLimit });

  if (error) {
    console.error('Failed to create organization', error);
    throw new Error('団体の作成に失敗しました。同名の団体が既に存在する可能性があります。');
  }

  revalidatePath('/admin/organizations');
}

export async function deleteOrganization(organizationId: string) {
  const supabase = await verifyAdmin();

  const { error } = await supabase.from('organizations').delete().eq('id', organizationId);

  if (error) {
    console.error('Failed to delete organization', error);
    throw new Error('団体の削除に失敗しました');
  }

  revalidatePath('/admin/organizations');
}

export async function setStudentNickname(studentId: string, name: string, locked: boolean) {
  const supabase = await verifyAdmin();

  const trimmed = name.trim();
  if (!trimmed) throw new Error('ニックネームを入力してください');

  const { error } = await supabase.from('profiles').update({ name: trimmed, nickname_locked: locked }).eq('id', studentId).eq('role', 'student');

  if (error) {
    console.error('Failed to update student nickname', error);
    throw new Error('ニックネームの更新に失敗しました');
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/student/${studentId}`);
}

export async function addAdminReply(questionId: string, text: string) {
  const { supabase } = await verifyAdminOrTeacher();

  const trimmed = text.trim();
  if (!trimmed) throw new Error('返信内容を入力してください');

  const { data: question, error: fetchError } = await supabase
    .from('questions')
    .select('replies')
    .eq('id', questionId)
    .single();

  if (fetchError || !question) {
    console.error('Failed to fetch question for reply', fetchError);
    throw new Error('質問が見つかりませんでした');
  }

  const updatedReplies = [...(question.replies || []), {
    role: 'admin',
    text: trimmed,
    created_at: new Date().toISOString(),
  }];

  const { error } = await supabase.from('questions').update({
    replies: updatedReplies,
    status: 'answered',
  }).eq('id', questionId);

  if (error) {
    console.error('Failed to add admin reply', error);
    throw new Error('返信の送信に失敗しました');
  }

  revalidatePath('/admin');
  revalidatePath('/timer');
}

export async function answerQuestion(formData: FormData) {
  const question_id = formData.get('question_id') as string;
  const answer_body = formData.get('answer_body') as string;

  if (!question_id || !answer_body) throw new Error('必要なデータがありません');

  const { supabase } = await verifyAdminOrTeacher();

  const { error } = await supabase.from('questions').update({
    status: 'answered',
    answer_body,
    answered_at: new Date().toISOString()
  }).eq('id', question_id);

  if (error) {
    console.error('Failed to answer question', error);
    throw new Error('回答の送信に失敗しました');
  }

  revalidatePath('/admin');
  revalidatePath('/timer');
  return;
}

function sanitizeRuleMap(input: unknown): RuleMap {
  const out: RuleMap = {};
  if (!input || typeof input !== 'object') return out;
  const knownKeys = RULE_DEFS.map(r => r.key);
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const match = knownKeys.find(k => k === key);
    if (match && typeof value === 'boolean') {
      out[match] = value;
    }
  }
  return out;
}

// 一括管理: 団体単位のルールを設定する。
// 教師は自分の団体のみ。管理者は任意の団体を指定できる。
export async function setOrganizationRules(organizationId: string | undefined, rules: RuleMap) {
  const { supabase, callerRole, callerOrgId } = await verifyAdminOrTeacher();

  let targetOrgId: string;
  if (callerRole === 'teacher') {
    if (!callerOrgId) throw new Error('あなたは団体に所属していません');
    targetOrgId = callerOrgId;
  } else {
    if (!organizationId) throw new Error('団体を指定してください');
    targetOrgId = organizationId;
  }

  const { error } = await supabase.from('organizations').update({ rules: sanitizeRuleMap(rules) }).eq('id', targetOrgId);

  if (error) {
    console.error('Failed to update organization rules', error);
    throw new Error('団体ルールの更新に失敗しました');
  }

  revalidatePath('/admin/rules');
  revalidatePath('/admin');
}

// 個別管理: 生徒単位でルールを上書きする(団体のルールより優先)。
// 教師は自団体の生徒のみ。管理者は任意の生徒を指定できる。
export async function setStudentRuleOverrides(studentId: string, overrides: RuleMap) {
  const { supabase, callerRole, callerOrgId } = await verifyAdminOrTeacher();

  const { data: target } = await supabase.from('profiles').select('organization_id').eq('id', studentId).single();
  if (!target) throw new Error('対象が見つかりません');

  if (callerRole === 'teacher') {
    if (!callerOrgId || target.organization_id !== callerOrgId) {
      throw new Error('自分の団体に所属するユーザーのみ設定できます');
    }
  }

  const { error } = await supabase.from('profiles').update({ rule_overrides: sanitizeRuleMap(overrides) }).eq('id', studentId);

  if (error) {
    console.error('Failed to update student rule overrides', error);
    throw new Error('個別ルールの更新に失敗しました');
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/student/${studentId}`);
}

// 問い合わせ: 教師 -> 管理者
export async function submitTeacherInquiry(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('ログインしていません');

  const { data: profile } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single();
  if (profile?.role !== 'teacher') throw new Error('権限がありません');

  const title = (formData.get('title') as string)?.trim();
  const body = (formData.get('body') as string)?.trim();
  if (!title || !body) throw new Error('タイトルと内容を入力してください');

  const { error } = await supabase.from('teacher_inquiries').insert({
    teacher_id: user.id,
    organization_id: profile.organization_id,
    title,
    body,
  });

  if (error) {
    console.error('Failed to submit teacher inquiry', error);
    throw new Error('問い合わせの送信に失敗しました');
  }

  revalidatePath('/admin/inquiries');
}

export async function replyToInquiry(inquiryId: string, text: string) {
  const supabase = await verifyAdmin();

  const trimmed = text.trim();
  if (!trimmed) throw new Error('返信内容を入力してください');

  const { error } = await supabase.from('teacher_inquiries').update({
    admin_reply: trimmed,
    status: 'answered',
    answered_at: new Date().toISOString(),
  }).eq('id', inquiryId);

  if (error) {
    console.error('Failed to reply to inquiry', error);
    throw new Error('返信の送信に失敗しました');
  }

  revalidatePath('/admin/inquiries');
}

// 成績登録: 教師/管理者が生徒の診断結果(得点・弱点・所見)を手動登録する。
export async function registerGrade(formData: FormData) {
  const { supabase, callerRole, callerOrgId } = await verifyAdminOrTeacher();

  const studentId = formData.get('student_id') as string;
  const scoreRaw = (formData.get('total_score') as string)?.trim();
  const weaknesses = (formData.get('weaknesses') as string)?.trim();
  const recommendation = (formData.get('recommendation') as string)?.trim();

  if (!studentId || !scoreRaw) throw new Error('生徒と得点は必須です');

  const totalScore = parseInt(scoreRaw, 10);
  if (Number.isNaN(totalScore) || totalScore < 0 || totalScore > 100) throw new Error('得点は0〜100の整数で入力してください');

  const { data: target } = await supabase.from('profiles').select('organization_id, role').eq('id', studentId).single();
  if (!target || target.role !== 'student') throw new Error('対象が見つかりません');

  if (callerRole === 'teacher') {
    if (!callerOrgId || target.organization_id !== callerOrgId) {
      throw new Error('自分の団体に所属する生徒のみ登録できます');
    }
  }

  const { error } = await supabase.from('diagnostic_results').insert({
    student_uuid: studentId,
    total_score: totalScore,
    weaknesses: weaknesses || null,
    recommendation: recommendation || null,
    answers_json: { manual_entry: true, registered_by: callerRole },
  });

  if (error) {
    console.error('Failed to register grade', error);
    throw new Error('成績の登録に失敗しました');
  }

  revalidatePath(`/admin/student/${studentId}`);
  revalidatePath('/');
}

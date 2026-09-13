'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

export type TargetType = 'organization' | 'students';
export type DeliveryMode = 'deadline' | 'no_deadline' | 'permanent';
export type GradingMode = 'manual' | 'auto_exact';

export interface AssignmentInput {
  templateId: string;
  targetType: TargetType;
  targetStudentIds: string[];
  deliveryMode: DeliveryMode;
  dueAt: string | null;
  gradingMode: GradingMode;
}

export interface CreateAssignmentResult {
  ok: boolean;
  error?: string;
  id?: string;
}

export async function createAssignment(input: AssignmentInput): Promise<CreateAssignmentResult> {
  try {
    const { supabase, callerRole, callerOrgId } = await verifyAdminOrTeacher();

    const { data: template } = await supabase
      .from('problem_templates')
      .select('id, organization_id')
      .eq('id', input.templateId)
      .single();

    if (!template) return { ok: false, error: 'テンプレートが見つかりません' };

    if (callerRole === 'teacher') {
      if (!callerOrgId || template.organization_id !== callerOrgId) {
        return { ok: false, error: '自分の団体のテンプレートのみ配信できます' };
      }
    }

    if (input.targetType === 'students' && input.targetStudentIds.length === 0) {
      return { ok: false, error: '配信先の生徒を1人以上選択してください' };
    }
    if (input.deliveryMode === 'deadline' && !input.dueAt) {
      return { ok: false, error: '締切日時を入力してください' };
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase.from('problem_assignments').insert({
      template_id: input.templateId,
      teacher_id: user?.id,
      organization_id: template.organization_id,
      target_type: input.targetType,
      target_student_ids: input.targetType === 'students' ? input.targetStudentIds : [],
      delivery_mode: input.deliveryMode,
      due_at: input.deliveryMode === 'deadline' ? input.dueAt : null,
      grading_mode: input.gradingMode,
    }).select('id').single();

    if (error) {
      console.error('Failed to create assignment', error);
      return { ok: false, error: `配信の作成に失敗しました: ${error.message}` };
    }

    revalidatePath('/admin/assignments');
    return { ok: true, id: data.id };
  } catch (e) {
    console.error('Unexpected error in createAssignment', e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteAssignment(id: string) {
  const { supabase } = await verifyAdminOrTeacher();

  const { error } = await supabase.from('problem_assignments').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete assignment', error);
    throw new Error(`配信の削除に失敗しました: ${error.message}`);
  }

  revalidatePath('/admin/assignments');
  redirect('/admin/assignments');
}

export async function listOrganizationStudents(organizationId: string): Promise<{ id: string; name: string; student_id: string }[]> {
  const { supabase } = await verifyAdminOrTeacher();

  const { data } = await supabase
    .from('profiles')
    .select('id, name, student_id')
    .eq('organization_id', organizationId)
    .eq('role', 'student')
    .eq('status', 'active')
    .order('name');

  return data || [];
}

export const dynamic = "force-dynamic";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProblemTemplateForm from "../../ProblemTemplateForm";
import type { VariableDef } from "@/lib/cbt/types";

export default async function EditProblemTemplatePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single();
  if (profile?.role !== 'admin' && profile?.role !== 'teacher') redirect('/');

  const isAdmin = profile.role === 'admin';

  const { data: template, error } = await supabase
    .from('problem_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !template) {
    return (
      <div className="p-8 text-center text-slate-500">
        テンプレートが見つかりませんでした。<br />
        <Link href="/admin/problems" className="text-brand-600 hover:underline mt-4 inline-block">戻る</Link>
      </div>
    );
  }

  const { data: organizations } = isAdmin
    ? await supabase.from('organizations').select('id, name').order('name')
    : { data: [] };

  return (
    <section className="flex-1 flex flex-col gap-6 max-w-[1200px] mx-auto w-full px-6 pt-2 pb-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/problems" className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-brand-600 hover:border-brand-300 transition-all shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-black font-title text-slate-800 dark:text-white">テンプレート編集</h2>
        </div>
      </div>

      <ProblemTemplateForm
        templateId={template.id}
        initialTitle={template.title}
        initialVariables={(template.variables as VariableDef[]) || []}
        initialConstraints={(template.constraints as string[]) || []}
        initialProblemTemplate={template.problem_template}
        initialAnswerTemplate={template.answer_template}
        initialOrganizationId={template.organization_id}
        organizations={organizations || []}
        isAdmin={isAdmin}
      />
    </section>
  );
}

-- CBT問題作成・配信機能 フェーズ2: 問題テンプレートの保存先。
-- 実装イメージ文書(v4) 6章のスキーマ案のうち problem_templates のみを、
-- このフェーズで実際に作成する(problem_assignments / problem_attempts は
-- フェーズ3の配信機能で追加する)。

CREATE TABLE public.problem_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  constraints jsonb NOT NULL DEFAULT '[]'::jsonb,
  problem_template text NOT NULL,
  answer_template text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.problem_templates ENABLE ROW LEVEL SECURITY;

-- 教師は自団体のテンプレートのみ操作可能
CREATE POLICY "Teachers can view own organization templates" ON public.problem_templates
  FOR SELECT USING (public.is_teacher_of(organization_id));

CREATE POLICY "Teachers can insert own organization templates" ON public.problem_templates
  FOR INSERT WITH CHECK (public.is_teacher_of(organization_id) AND teacher_id = auth.uid());

CREATE POLICY "Teachers can update own organization templates" ON public.problem_templates
  FOR UPDATE USING (public.is_teacher_of(organization_id));

CREATE POLICY "Teachers can delete own organization templates" ON public.problem_templates
  FOR DELETE USING (public.is_teacher_of(organization_id));

-- 管理者は任意の団体のテンプレートを操作可能
CREATE POLICY "Admins can view all templates" ON public.problem_templates
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can insert all templates" ON public.problem_templates
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update all templates" ON public.problem_templates
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete all templates" ON public.problem_templates
  FOR DELETE USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.problem_templates TO anon, authenticated;

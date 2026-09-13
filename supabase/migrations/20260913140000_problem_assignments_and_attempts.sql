-- CBT問題作成・配信機能 フェーズ3: 配信(assignments)と挑戦(attempts)。
-- 実装イメージ文書(v4) 6章のスキーマ案の残り2テーブル。

CREATE TABLE public.problem_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES public.problem_templates(id) ON DELETE CASCADE NOT NULL,
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('organization', 'students')),
  target_student_ids uuid[] NOT NULL DEFAULT '{}',
  delivery_mode text NOT NULL CHECK (delivery_mode IN ('deadline', 'no_deadline', 'permanent')),
  due_at timestamptz,
  grading_mode text NOT NULL DEFAULT 'manual' CHECK (grading_mode IN ('manual', 'auto_exact')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.problem_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES public.problem_assignments(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  attempt_number integer NOT NULL DEFAULT 1,
  -- これと problem_templates(テンプレートID経由)だけで問題文・正答を再現できる
  resolved_variables jsonb NOT NULL,
  submitted_work text,
  submitted_final_answer text,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
  is_correct boolean,
  score numeric,
  exp_awarded numeric, -- フェーズ4(EXP付与)で使用。今回は書き込まない
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  graded_at timestamptz
);

ALTER TABLE public.problem_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_attempts ENABLE ROW LEVEL SECURITY;

-- 教師は自団体の配信のみ操作可能
CREATE POLICY "Teachers can view own organization assignments" ON public.problem_assignments
  FOR SELECT USING (public.is_teacher_of(organization_id));
CREATE POLICY "Teachers can insert own organization assignments" ON public.problem_assignments
  FOR INSERT WITH CHECK (public.is_teacher_of(organization_id) AND teacher_id = auth.uid());
CREATE POLICY "Teachers can update own organization assignments" ON public.problem_assignments
  FOR UPDATE USING (public.is_teacher_of(organization_id));
CREATE POLICY "Teachers can delete own organization assignments" ON public.problem_assignments
  FOR DELETE USING (public.is_teacher_of(organization_id));

-- 管理者は任意の団体の配信を操作可能
CREATE POLICY "Admins can view all assignments" ON public.problem_assignments FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert all assignments" ON public.problem_assignments FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update all assignments" ON public.problem_assignments FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete all assignments" ON public.problem_assignments FOR DELETE USING (public.is_admin());

-- 生徒は自分に配信された(団体全体 or 個別指定)ものだけ閲覧可能
CREATE POLICY "Students can view targeted assignments" ON public.problem_assignments
  FOR SELECT USING (
    (target_type = 'organization' AND public.is_student_of(organization_id))
    OR (target_type = 'students' AND auth.uid() = ANY(target_student_ids))
  );

-- 生徒は自分の挑戦のみ作成・閲覧・更新可能
CREATE POLICY "Students can view own attempts" ON public.problem_attempts
  FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students can insert own attempts" ON public.problem_attempts
  FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own attempts" ON public.problem_attempts
  FOR UPDATE USING (auth.uid() = student_id);

-- 教師は自団体生徒の挑戦を閲覧可能(将来の採点画面用)
CREATE POLICY "Teachers can view own organization attempts" ON public.problem_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles s
      WHERE s.id = problem_attempts.student_id AND public.is_teacher_of(s.organization_id)
    )
  );

CREATE POLICY "Admins can view all attempts" ON public.problem_attempts FOR SELECT USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.problem_assignments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.problem_attempts TO anon, authenticated;

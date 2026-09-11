-- 教師用画面の残りタスク(質問回答のスコープ化、一括/個別管理、問い合わせ、成績登録)のための
-- スキーマ拡張。

-- ========== 質問回答: 教師は自団体生徒の質問を閲覧・回答できるようにする ==========
CREATE POLICY "Teachers can view own organization questions" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles s
      WHERE s.id = questions.student_uuid AND public.is_teacher_of(s.organization_id)
    )
  );

CREATE POLICY "Teachers can update own organization questions" ON public.questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles s
      WHERE s.id = questions.student_uuid AND public.is_teacher_of(s.organization_id)
    )
  );

-- ========== 成績登録: 教師は自団体生徒の診断結果を閲覧・登録できるようにする ==========
CREATE POLICY "Teachers can view own organization results" ON public.diagnostic_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles s
      WHERE s.id = diagnostic_results.student_uuid AND public.is_teacher_of(s.organization_id)
    )
  );

CREATE POLICY "Teachers can insert own organization results" ON public.diagnostic_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles s
      WHERE s.id = diagnostic_results.student_uuid AND public.is_teacher_of(s.organization_id)
    )
  );

-- ========== 一括管理(団体単位) / 個別管理(生徒単位) のルール設定 ==========
-- true のキーはその制限が「有効(=禁止)」であることを表す。
-- profiles.rule_overrides は null/キー欠落の場合、団体のルールを継承する。
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS rules jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rule_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ========== 問い合わせ: 教師 -> 管理者 ==========
CREATE TABLE IF NOT EXISTS public.teacher_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered')),
  admin_reply text,
  created_at timestamptz DEFAULT now(),
  answered_at timestamptz
);

ALTER TABLE public.teacher_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own inquiries" ON public.teacher_inquiries
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert own inquiries" ON public.teacher_inquiries
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Admins can view all inquiries" ON public.teacher_inquiries
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update all inquiries" ON public.teacher_inquiries
  FOR UPDATE USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_inquiries TO anon, authenticated;

-- 生徒が自分の団体の教師の大まかな学習ログ(ポモドーロ回数・時間・集中度)を
-- 閲覧できるようにする。教師側の pomodoro_events(詳細な操作ログ)は公開せず、
-- 集計に使う pomodoro_logs / student_activity_logs / profiles(total_study_minutes)
-- のみを対象とする。

CREATE OR REPLACE FUNCTION public.is_student_of(target_org_id uuid)
RETURNS boolean AS $$
DECLARE
  caller_role text;
  caller_org uuid;
BEGIN
  SELECT role, organization_id INTO caller_role, caller_org FROM public.profiles WHERE id = auth.uid();
  RETURN caller_role = 'student' AND caller_org IS NOT NULL AND target_org_id IS NOT NULL AND caller_org = target_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE POLICY "Students can view own organization teacher profiles" ON public.profiles
  FOR SELECT USING (role = 'teacher' AND public.is_student_of(organization_id));

CREATE POLICY "Students can view own organization teacher pomodoro logs" ON public.pomodoro_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles target
      WHERE target.id = pomodoro_logs.student_uuid
      AND target.role = 'teacher'
      AND public.is_student_of(target.organization_id)
    )
  );

CREATE POLICY "Students can view own organization teacher activity logs" ON public.student_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles target
      WHERE target.id = student_activity_logs.student_id
      AND target.role = 'teacher'
      AND public.is_student_of(target.organization_id)
    )
  );

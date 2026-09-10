-- 教師が自分の団体に所属する生徒のポモドーロ活動(概要ログ・詳細イベントログ)を
-- 閲覧できるようにする。student_uuid から対象生徒の所属団体を辿って判定する。
CREATE POLICY "Teachers can view own organization pomodoro logs" ON public.pomodoro_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles target
      WHERE target.id = pomodoro_logs.student_uuid
      AND public.is_teacher_of(target.organization_id)
    )
  );

CREATE POLICY "Teachers can view own organization pomodoro events" ON public.pomodoro_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles target
      WHERE target.id = pomodoro_events.student_uuid
      AND public.is_teacher_of(target.organization_id)
    )
  );

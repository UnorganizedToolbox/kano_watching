-- ポモドーロの詳細な操作ログ(開始/一時停止/中止/完了/残り時間確認/自己評価/終了/放置検出)。
-- 既存の pomodoro_logs は「完了したセッションのサマリ」として引き続き使う(ダッシュボード等の
-- 件数表示が壊れないよう、粒度の異なるイベントはここでは混ぜない)。
-- session_id で同一セッション内の一連のイベントをグルーピングし、
-- 「Complete から次のアクションまでの反応時間」等を後から集計できるようにする。
CREATE TABLE public.pomodoro_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_uuid uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  mode text NOT NULL CHECK (mode IN ('WORK', 'BREAK', 'LONG_BREAK')),
  event_type text NOT NULL CHECK (event_type IN (
    'START', 'PAUSE', 'STOP', 'COMPLETE',
    'CHECK_REMAINING_TIME', 'RATING_SUBMITTED', 'QUIT', 'ABANDONED'
  )),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.pomodoro_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own pomodoro events" ON public.pomodoro_events
  FOR SELECT USING (auth.uid() = student_uuid);
CREATE POLICY "Students can insert own pomodoro events" ON public.pomodoro_events
  FOR INSERT WITH CHECK (auth.uid() = student_uuid);
CREATE POLICY "Admins can view all pomodoro events" ON public.pomodoro_events
  FOR SELECT USING (public.is_admin());

CREATE INDEX idx_pomodoro_events_session ON public.pomodoro_events(session_id);
CREATE INDEX idx_pomodoro_events_student ON public.pomodoro_events(student_uuid, created_at);

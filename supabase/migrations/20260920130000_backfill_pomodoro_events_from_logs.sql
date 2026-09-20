-- pomodoro_logs(単純な完了サマリ)とpomodoro_events(詳細な操作ログ)の2テーブルを
-- 完了記録の記録先として使い分けていたことが、画面ごとに完了回数・学習時間が食い違う
-- 原因になっていた(例: タイマーが0になった直後にタブを閉じて集中度評価をしなかった場合、
-- pomodoro_eventsにはCOMPLETEが記録されるがpomodoro_logsには記録されない、等)。
-- アプリコード側は2026-09-20以降pomodoro_eventsに一本化し、pomodoro_logsへの新規書き込みは
-- 廃止した(pomodoro_logsテーブル自体は当面残すが、以後アプリからは読み書きしない)。
--
-- このままではpomodoro_eventsテーブルが存在する前(2026-09-06より前)の完了実績が、
-- 一本化後の画面(ダッシュボード・分析パネル・管理画面等)から見えなくなってしまうため、
-- 該当期間のpomodoro_logsを、開始(START)・完了(COMPLETE)のペアとしてpomodoro_eventsへ
-- 取り込む(バックフィル)。
--
-- 対象を「pomodoro_eventsテーブル作成(2026-09-06)より厳密に前の行」だけに絞っているのは、
-- それ以降の行はアプリが両方のテーブルに書き込んでいた期間と重なりうり、対応するイベントが
-- 既にpomodoro_events側に存在する可能性があるため(バックフィルすると二重カウントになる)。
-- 1つのpomodoro_logs行につき新しいsession_idを1つ発行し、START/COMPLETEの両方に使う
-- (MATERIALIZEDでCTEを1回だけ評価させ、2つのINSERT元で同じsession_idを共有させている)。
INSERT INTO public.pomodoro_events (student_uuid, session_id, mode, event_type, metadata, created_at)
WITH backfill AS MATERIALIZED (
  SELECT
    student_uuid,
    gen_random_uuid() AS session_id,
    subject,
    COALESCE(duration_seconds, 1500) AS duration_seconds,
    created_at AS completed_at
  FROM public.pomodoro_logs
  WHERE event_type = 'complete'
    AND created_at < '2026-09-06T00:00:00+00'::timestamptz
)
SELECT
  student_uuid, session_id, 'WORK', 'START',
  jsonb_build_object('subject', subject, 'backfilled_from', 'pomodoro_logs'),
  completed_at - make_interval(secs => duration_seconds)
FROM backfill
UNION ALL
SELECT
  student_uuid, session_id, 'WORK', 'COMPLETE',
  jsonb_build_object('backfilled_from', 'pomodoro_logs'),
  completed_at
FROM backfill;

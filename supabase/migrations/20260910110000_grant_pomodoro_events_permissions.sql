-- organizations と全く同じ見落とし: pomodoro_events もRLSポリシーはあるが
-- GRANT忘れで anon/authenticated から INSERT できず、詳細ログが一切
-- 記録されていなかった(fire-and-forget呼び出しのためUIにはエラーが出ず、
-- console.error のみで気づけない状態だった)。
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pomodoro_events TO anon, authenticated;

-- bug_reports も同様にGRANT漏れだった(現状コードから未使用のため実害は
-- 出ていないが、将来使う際に同じ問題が再発しないよう先に直しておく)。
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bug_reports TO anon, authenticated;

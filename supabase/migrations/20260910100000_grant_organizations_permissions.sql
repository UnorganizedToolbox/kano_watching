-- organizations テーブル作成時に GRANT を付け忘れていた(0005で他テーブルには
-- GRANT していたのと同じパターンが必要)。RLSポリシーはあってもPostgresの
-- 基本テーブル権限が無いと "permission denied for table organizations" になり、
-- 団体管理ページがクラッシュしていた(React error #441 の原因)。
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_teacher_of(uuid) TO anon, authenticated;

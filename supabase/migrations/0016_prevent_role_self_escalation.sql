-- profiles.role の自己昇格を防ぐ。
-- 0010_allow_profile_update.sql の UPDATE ポリシーは USING (auth.uid() = id) のみで
-- カラム単位の制限がなく、ログインユーザーが自分の role を 'admin' に書き換えられてしまっていた
-- (実際に SettingsClient.tsx の「管理者権限を強制取得する」ボタンから悪用可能だった)。
-- ダッシュボードの SQL Editor や service_role キー経由の更新は current_user が
-- 'postgres' または 'service_role' になるため、管理者昇格はそちらからのみ許可する。
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'role カラムはこの経路からは変更できません';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- 管理者が生徒のニックネームを固定できるようにする。
-- ロックされている間は生徒本人による name の変更を拒否する。
-- 0004_fix_rls_recursion.sql の "Admins can update all profiles" ポリシーにより
-- admin は元々 profiles を自由に UPDATE できるため、admin 経由の変更(is_admin() = true)は許可する。
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname_locked boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.prevent_locked_nickname_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.nickname_locked = true
     AND NEW.name IS DISTINCT FROM OLD.name
     AND current_user NOT IN ('postgres', 'service_role')
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'ニックネームは管理者によって固定されています';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_locked_nickname_change ON public.profiles;
CREATE TRIGGER trg_prevent_locked_nickname_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_locked_nickname_change();

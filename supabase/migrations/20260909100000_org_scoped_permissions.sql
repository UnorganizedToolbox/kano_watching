-- 団体ごとの人数上限(拡張性のため。-1 は無制限)
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS member_limit integer NOT NULL DEFAULT -1;

-- 「呼び出し元が指定した団体の教師かどうか」を安全に判定するヘルパー。
-- is_admin() と同様、profiles への直接参照による無限再帰を避けるため SECURITY DEFINER にする。
CREATE OR REPLACE FUNCTION public.is_teacher_of(target_org_id uuid)
RETURNS boolean AS $$
DECLARE
  caller_role text;
  caller_org uuid;
BEGIN
  SELECT role, organization_id INTO caller_role, caller_org FROM public.profiles WHERE id = auth.uid();
  RETURN caller_role = 'teacher' AND caller_org IS NOT NULL AND target_org_id IS NOT NULL AND caller_org = target_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 教師が自分の団体に所属するプロフィールを閲覧・更新できるようにする
-- (承認・教師への昇格・生徒一覧の閲覧に必要)
CREATE POLICY "Teachers can view own organization profiles" ON public.profiles
  FOR SELECT USING (public.is_teacher_of(organization_id));

CREATE POLICY "Teachers can update own organization profiles" ON public.profiles
  FOR UPDATE USING (public.is_teacher_of(organization_id));

-- role 自己昇格防止トリガーを、教師が自分の団体内で student<->teacher を
-- 付け替えられるよう緩和する。ただし teacher からは admin へは絶対に到達できない
-- (caller が admin のときのみ任意のroleへの変更を許可)。
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER AS $$
DECLARE
  caller_role text;
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND current_user NOT IN ('postgres', 'service_role') THEN
    SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

    IF caller_role = 'admin' THEN
      -- 管理者は任意の role へ変更可能
      NULL;
    ELSIF caller_role = 'teacher' AND NEW.role IN ('student', 'teacher') THEN
      -- 教師は student <-> teacher の付け替えのみ許可(admin には到達できない)
      NULL;
    ELSE
      RAISE EXCEPTION 'role カラムはこの経路からは変更できません';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

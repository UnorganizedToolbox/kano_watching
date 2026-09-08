-- 教師用画面の土台: teacher ロールの有効化、団体(organizations)テーブルの新設。
-- サインアップの「所属団体」はこれまで自由記述の affiliation 文字列だったが、
-- 団体IDとの整合を取るため organizations への参照(organization_id)に置き換える。

ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'admin', 'teacher', 'tester'));

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 団体名は個人情報ではないため、サインアップ画面(未ログイン)からも選択肢として見えるようにする
CREATE POLICY "Anyone can view organizations" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Admins can insert organizations" ON public.organizations FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update organizations" ON public.organizations FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete organizations" ON public.organizations FOR DELETE USING (public.is_admin());

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);
ALTER TABLE public.profiles DROP COLUMN IF EXISTS affiliation;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, student_id, name, email, role, status, birthdate, organization_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'student_id', 'std_' || substr(new.id::text, 1, 6)),
    COALESCE(new.raw_user_meta_data->>'name', 'Unknown'),
    new.email,
    'student',
    'pending',
    NULLIF(new.raw_user_meta_data->>'birthdate', '')::date,
    NULLIF(new.raw_user_meta_data->>'organization_id', '')::uuid
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- role の自己昇格防止トリガーは、正規の管理者操作(admin による teacher 昇格など)を
-- 塞いでしまっていたため、is_admin() の場合は許可するよう緩和する。
-- (悪用経路だった「生徒が自分のroleをadminに書き換える」は is_admin()=false のため引き続き禁止)
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND current_user NOT IN ('postgres', 'service_role')
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'role カラムはこの経路からは変更できません';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

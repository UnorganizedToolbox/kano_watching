-- 新規登録を承認制にする。
-- 誕生日・所属(団体名や個人の場合は空)を profiles に追加し、
-- 新規サインアップ時のプロフィール自動生成トリガーを status='pending' で
-- 作成するよう変更する。既存ユーザーは既に 'active' で作成済みのため
-- このトリガー変更による影響は受けない(承認済み扱いのまま)。

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthdate date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS affiliation text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, student_id, name, email, role, status, birthdate, affiliation)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'student_id', 'std_' || substr(new.id::text, 1, 6)),
    COALESCE(new.raw_user_meta_data->>'name', 'Unknown'),
    new.email,
    'student',
    'pending',
    NULLIF(new.raw_user_meta_data->>'birthdate', '')::date,
    NULLIF(new.raw_user_meta_data->>'affiliation', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

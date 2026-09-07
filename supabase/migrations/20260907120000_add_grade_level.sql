-- 生徒の学年区分。ポモドーロの学習科目リストを学年に応じて絞り込むために使う。
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS grade_level text
  CHECK (grade_level IN ('elementary', 'junior_high', 'high_school'));

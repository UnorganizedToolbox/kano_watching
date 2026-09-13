-- 正答を複数登録できるようにする((x-1)(x-2) と (x-2)(x-1) のような表記違いの
-- 別解や、積分の別解パターンなどをすべて正答として扱えるようにするため)。
-- answer_template(text, 単一)を answer_templates(jsonb, 配列)に置き換える。

ALTER TABLE public.problem_templates ADD COLUMN IF NOT EXISTS answer_templates jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.problem_templates
SET answer_templates = jsonb_build_array(answer_template)
WHERE answer_template IS NOT NULL AND answer_templates = '[]'::jsonb;

ALTER TABLE public.problem_templates DROP COLUMN IF EXISTS answer_template;

-- CBT問題作成・配信機能 拡張: 出題種別(kind)と大問(小問)対応。
--
-- 1. kind: 'variable'(従来の変数抽選型) | 'pair_choice'(単問形式。question/answerの
--    組を1つランダムに選んで完答判定する丸暗記型。英単語対応などに使う)
-- 2. answer_templates(単一の正答セット)を廃止し、sub_questions(小問の配列。
--    各小問が label・配点(points)・正答テンプレート配列(別解可)を持つ)に統合する。
--    要素が1個なら今まで通りの単問、複数なら大問として扱う。
-- 3. pairs: kind='pair_choice'のときのみ使用する question/answer の組の配列。

ALTER TABLE public.problem_templates ADD COLUMN kind text NOT NULL DEFAULT 'variable' CHECK (kind IN ('variable', 'pair_choice'));

ALTER TABLE public.problem_templates ADD COLUMN sub_questions jsonb;

UPDATE public.problem_templates
SET sub_questions = jsonb_build_array(
  jsonb_build_object('label', '', 'points', 1, 'answerTemplates', answer_templates)
)
WHERE sub_questions IS NULL;

ALTER TABLE public.problem_templates ALTER COLUMN sub_questions SET NOT NULL;
ALTER TABLE public.problem_templates ALTER COLUMN sub_questions SET DEFAULT '[]'::jsonb;

ALTER TABLE public.problem_templates ADD COLUMN pairs jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.problem_templates DROP COLUMN answer_templates;

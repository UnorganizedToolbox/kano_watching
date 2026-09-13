-- 挑戦(problem_attempts)を「複数の問題インスタンスを持つ」形に統一する
-- (デッキ配信では1回の挑戦の中に複数の問題が含まれるため)。
--
-- questions: [{ templateId, resolvedVariables }, ...] (単体配信でも要素数1の配列になる)
-- submitted_answers / sub_results も「問題ごとの配列」を要素に持つ配列に変える
-- (例: submitted_answers[問題index][小問index])。

ALTER TABLE public.problem_attempts ADD COLUMN questions jsonb;

-- 既存行(1テンプレートのみ)をquestions配列に包む。直前の移行で、既存の
-- assignmentのdeck_idは必ず「そのテンプレートだけを含むimplicitデッキ」を
-- 指しているため、deck_items経由でtemplate_idを復元できる。
UPDATE public.problem_attempts pat
SET questions = jsonb_build_array(
  jsonb_build_object('templateId', di.child_template_id, 'resolvedVariables', pat.resolved_variables)
)
FROM public.problem_assignments pa
JOIN public.deck_items di ON di.parent_deck_id = pa.deck_id
WHERE pa.id = pat.assignment_id;

ALTER TABLE public.problem_attempts ALTER COLUMN questions SET NOT NULL;
ALTER TABLE public.problem_attempts DROP COLUMN resolved_variables;

ALTER TABLE public.problem_attempts ADD COLUMN submitted_answers_v2 jsonb;
UPDATE public.problem_attempts SET submitted_answers_v2 = CASE WHEN submitted_answers IS NOT NULL THEN jsonb_build_array(submitted_answers) ELSE NULL END;
ALTER TABLE public.problem_attempts DROP COLUMN submitted_answers;
ALTER TABLE public.problem_attempts RENAME COLUMN submitted_answers_v2 TO submitted_answers;

ALTER TABLE public.problem_attempts ADD COLUMN sub_results_v2 jsonb;
UPDATE public.problem_attempts SET sub_results_v2 = CASE WHEN sub_results IS NOT NULL THEN jsonb_build_array(sub_results) ELSE NULL END;
ALTER TABLE public.problem_attempts DROP COLUMN sub_results;
ALTER TABLE public.problem_attempts RENAME COLUMN sub_results_v2 TO sub_results;

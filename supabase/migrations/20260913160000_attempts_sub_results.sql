-- 大問(小問)対応: 1つの提出が複数の小問の解答を持てるようにする。
-- is_correct(単一の正誤)は廃止し、部分点方式のscore(0-100の%)を主指標にする。
-- 小問ごとの内訳(正誤・獲得点・提出内容)はsub_resultsに保存する。

-- submitted_answers: 採点方式に関わらず、生徒が入力した小問ごとの解答をそのまま保存する
-- (手動採点の場合、教師がこれを見て採点する。将来の採点画面用)。
-- sub_results: auto_exactのときだけ、小問ごとの正誤・獲得点を含む採点結果を保存する。
ALTER TABLE public.problem_attempts ADD COLUMN submitted_answers jsonb;
ALTER TABLE public.problem_attempts ADD COLUMN sub_results jsonb;
ALTER TABLE public.problem_attempts DROP COLUMN submitted_final_answer;
ALTER TABLE public.problem_attempts DROP COLUMN is_correct;

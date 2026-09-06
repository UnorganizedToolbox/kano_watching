-- questions.status の CHECK 制約が ('open', 'answered') のみで 'resolved' を許可しておらず、
-- QAThreadList.tsx の「解決済みにする」操作が常に制約違反で失敗していた(エラーは握りつぶされ、
-- 生徒からは何も起きていないように見えていた)。'resolved' を許可するよう修正する。
ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_status_check;
ALTER TABLE public.questions ADD CONSTRAINT questions_status_check CHECK (status IN ('open', 'answered', 'resolved'));

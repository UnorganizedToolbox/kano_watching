-- 質問のお気に入り機能。お気に入りにした質問は自動削除(保持件数上限)の対象から除外する。
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS is_favorited boolean NOT NULL DEFAULT false;

-- 生徒が自分の質問(questions)に対して、返信の追加や解決済みへの変更を
-- サーバーアクション経由で行えるようにする(これまでUPDATEポリシーが無く、
-- 生徒からの返信・解決済み操作が常にRLSで無言のまま失敗していた)。
CREATE POLICY "Students can update own questions" ON public.questions
  FOR UPDATE USING (auth.uid() = student_uuid);

-- organizations.rules は 'off' | 'on' | 'forced' の3値文字列で運用する
-- (過去の boolean 値はアプリ側で互換読み込みする)。スキーマ上の変更は不要。

-- ① 管理者のみ、団体を問わず全生徒に配信できる target_type='all' を追加。
-- ② バグ修正: 生徒からproblem_decks/deck_items/problem_templatesがRLSで
--    読めておらず(教師・管理者向けポリシーしか存在しなかった)、配信された
--    課題のタイトルが「タイトル未設定」になり、開始すると「問題が登録されて
--    いません」と表示されていた。
-- ③ 団体全体配信(target_type='organization' かつ delivery_mode='deadline')は、
--    締切後に団体に加入した生徒には表示しないようにする(間に合わなかった
--    課題を見せるのは酷なため)。

ALTER TABLE public.problem_assignments DROP CONSTRAINT IF EXISTS problem_assignments_target_type_check;
ALTER TABLE public.problem_assignments ADD CONSTRAINT problem_assignments_target_type_check
  CHECK (target_type IN ('organization', 'students', 'all'));

DROP POLICY IF EXISTS "Students can view targeted assignments" ON public.problem_assignments;
CREATE POLICY "Students can view targeted assignments" ON public.problem_assignments
  FOR SELECT USING (
    (
      target_type = 'organization'
      AND public.is_student_of(organization_id)
      AND (
        delivery_mode != 'deadline'
        OR due_at IS NULL
        OR (SELECT p.created_at FROM public.profiles p WHERE p.id = auth.uid()) <= due_at
      )
    )
    OR (target_type = 'students' AND auth.uid() = ANY(target_student_ids))
    OR target_type = 'all'
  );

-- 生徒が閲覧できる配信(上と同じ条件)から、デッキのツリーを再帰的に辿って
-- 到達可能な全デッキidの集合を返す。problem_decks/deck_items/problem_templates
-- の生徒向けSELECTポリシーはすべてこれを土台にする。
CREATE OR REPLACE FUNCTION public.student_reachable_deck_ids()
RETURNS TABLE(deck_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH RECURSIVE reachable(deck_id) AS (
    SELECT pa.deck_id
    FROM public.problem_assignments pa
    WHERE
      (
        pa.target_type = 'organization'
        AND public.is_student_of(pa.organization_id)
        AND (
          pa.delivery_mode != 'deadline'
          OR pa.due_at IS NULL
          OR (SELECT p.created_at FROM public.profiles p WHERE p.id = auth.uid()) <= pa.due_at
        )
      )
      OR (pa.target_type = 'students' AND auth.uid() = ANY(pa.target_student_ids))
      OR pa.target_type = 'all'
    UNION
    SELECT di.child_deck_id
    FROM public.deck_items di
    JOIN reachable r ON di.parent_deck_id = r.deck_id
    WHERE di.child_kind = 'deck' AND di.child_deck_id IS NOT NULL
  )
  SELECT deck_id FROM reachable;
$$;

CREATE POLICY "Students can view reachable decks" ON public.problem_decks
  FOR SELECT USING (id IN (SELECT deck_id FROM public.student_reachable_deck_ids()));

CREATE POLICY "Students can view reachable deck items" ON public.deck_items
  FOR SELECT USING (parent_deck_id IN (SELECT deck_id FROM public.student_reachable_deck_ids()));

CREATE POLICY "Students can view reachable templates" ON public.problem_templates
  FOR SELECT USING (
    id IN (
      SELECT di.child_template_id FROM public.deck_items di
      WHERE di.child_kind = 'template' AND di.parent_deck_id IN (SELECT deck_id FROM public.student_reachable_deck_ids())
    )
  );

-- 配信(problem_assignments)の対象をテンプレート単体からデッキに統一する。
-- 単一テンプレートを配信する既存のUIはそのまま使えるが、内部的にはそのテンプレート
-- 1つだけを含む「非表示のデッキ(is_implicit=true)」を自動生成して配信するように
-- なる。これによりデッキ配信と単体配信のコードパスが完全に統一される。
--
-- 既存のassignments(template_id前提)は、そのテンプレートだけを含むimplicit
-- デッキを作成した上でdeck_idに置き換える(データを保持する)。

ALTER TABLE public.problem_decks ADD COLUMN is_implicit boolean NOT NULL DEFAULT false;

ALTER TABLE public.problem_assignments ADD COLUMN deck_id uuid REFERENCES public.problem_decks(id) ON DELETE CASCADE;

DO $$
DECLARE
  r RECORD;
  new_deck_id uuid;
BEGIN
  FOR r IN
    SELECT pa.id AS assignment_id, pa.template_id, pa.organization_id, pa.teacher_id, pt.title
    FROM public.problem_assignments pa
    JOIN public.problem_templates pt ON pt.id = pa.template_id
  LOOP
    INSERT INTO public.problem_decks (teacher_id, organization_id, title, is_implicit)
    VALUES (r.teacher_id, r.organization_id, r.title, true)
    RETURNING id INTO new_deck_id;

    INSERT INTO public.deck_items (parent_deck_id, position, child_kind, child_template_id, weight)
    VALUES (new_deck_id, 0, 'template', r.template_id, 1);

    UPDATE public.problem_assignments SET deck_id = new_deck_id WHERE id = r.assignment_id;
  END LOOP;
END $$;

ALTER TABLE public.problem_assignments ALTER COLUMN deck_id SET NOT NULL;
ALTER TABLE public.problem_assignments DROP COLUMN template_id;

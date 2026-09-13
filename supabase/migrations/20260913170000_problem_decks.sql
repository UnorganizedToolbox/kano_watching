-- CBT問題作成・配信機能 フェーズ4-2: デッキ機能。
-- デッキは自己参照ツリーで、子として「サブデッキ」または「問題テンプレート」を
-- 好きなだけ持てる。各子には weight(重み)を設定し、そのデッキが使われる際に
-- weight比率に応じて重み付きランダム抽選で問題インスタンスを生成する
-- (ネストしたデッキは、自身の内部weight比率を保ったまま親の指定weightに
-- 正規化して展開される。詳細は src/lib/cbt/deck.ts を参照)。

CREATE TABLE public.problem_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.deck_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_deck_id uuid REFERENCES public.problem_decks(id) ON DELETE CASCADE NOT NULL,
  position integer NOT NULL DEFAULT 0,
  child_kind text NOT NULL CHECK (child_kind IN ('deck', 'template')),
  child_deck_id uuid REFERENCES public.problem_decks(id) ON DELETE CASCADE,
  child_template_id uuid REFERENCES public.problem_templates(id) ON DELETE CASCADE,
  weight integer NOT NULL CHECK (weight > 0),
  CHECK (
    (child_kind = 'deck' AND child_deck_id IS NOT NULL AND child_template_id IS NULL)
    OR (child_kind = 'template' AND child_template_id IS NOT NULL AND child_deck_id IS NULL)
  )
);

ALTER TABLE public.problem_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view own organization decks" ON public.problem_decks
  FOR SELECT USING (public.is_teacher_of(organization_id));
CREATE POLICY "Teachers can insert own organization decks" ON public.problem_decks
  FOR INSERT WITH CHECK (public.is_teacher_of(organization_id) AND teacher_id = auth.uid());
CREATE POLICY "Teachers can update own organization decks" ON public.problem_decks
  FOR UPDATE USING (public.is_teacher_of(organization_id));
CREATE POLICY "Teachers can delete own organization decks" ON public.problem_decks
  FOR DELETE USING (public.is_teacher_of(organization_id));

CREATE POLICY "Admins can view all decks" ON public.problem_decks FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert all decks" ON public.problem_decks FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update all decks" ON public.problem_decks FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete all decks" ON public.problem_decks FOR DELETE USING (public.is_admin());

-- deck_itemsはorganization_idを持たないので、親デッキ経由で権限判定する
CREATE POLICY "Teachers can view own organization deck items" ON public.deck_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.problem_decks d WHERE d.id = deck_items.parent_deck_id AND public.is_teacher_of(d.organization_id)
  ));
CREATE POLICY "Teachers can insert own organization deck items" ON public.deck_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.problem_decks d WHERE d.id = deck_items.parent_deck_id AND public.is_teacher_of(d.organization_id)
  ));
CREATE POLICY "Teachers can update own organization deck items" ON public.deck_items
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.problem_decks d WHERE d.id = deck_items.parent_deck_id AND public.is_teacher_of(d.organization_id)
  ));
CREATE POLICY "Teachers can delete own organization deck items" ON public.deck_items
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.problem_decks d WHERE d.id = deck_items.parent_deck_id AND public.is_teacher_of(d.organization_id)
  ));

CREATE POLICY "Admins can view all deck items" ON public.deck_items FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert all deck items" ON public.deck_items FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update all deck items" ON public.deck_items FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete all deck items" ON public.deck_items FOR DELETE USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.problem_decks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deck_items TO anon, authenticated;

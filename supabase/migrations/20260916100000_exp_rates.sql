-- CBT問題作成・配信機能 フェーズ4: 採点・EXP付与。
-- 実装イメージ文書(v4) 8.2節のexp_ratesテーブル。今回投入するのは本機能が実際に
-- 消費するsingle.*/assignment.*の4項目のみ(締切倍率の3項目は既にscoreAdjustment.ts
-- に実装・テスト済みのためここでは重複投入しない。詳細はCLAUDE.local.mdに記録)。

CREATE TABLE public.exp_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value numeric NOT NULL,
  category text NOT NULL DEFAULT 'base_level', -- 'base_level' | 'atk' | 'luck' | 'free' 等(将来拡張用)
  description text,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.exp_rates (key, value, category, description) VALUES
  ('single.base_exp', 5, 'base_level', '単問(恒常配信)1回あたりの基礎EXP'),
  ('single.streak_bonus_per_day', 0.5, 'base_level', '連続日数×この値を基礎EXPに加算'),
  ('single.streak_bonus_cap_days', 10, 'base_level', '連続日数ボーナスは何日分まで累積するか(上限)'),
  ('assignment.base_exp', 20, 'base_level', '課題1件の基礎EXP(期限付き・期限なし共通)');

ALTER TABLE public.exp_rates ENABLE ROW LEVEL SECURITY;

-- EXP計算はクライアント/サーバーどちらからも参照されうるため全員に読み取りを許可し、
-- 書き込みは管理者のみに限定する。
CREATE POLICY "Anyone can view exp_rates" ON public.exp_rates FOR SELECT USING (true);
CREATE POLICY "Admins can manage exp_rates" ON public.exp_rates FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.exp_rates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exp_rates TO authenticated;

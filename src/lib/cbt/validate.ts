// 保存前検証: テンプレートが実際に生成可能かどうかを、複数回試行して確認する。
// 実装イメージ文書 2章 / 4章を参照。
//
// resolveVariables() 自体が内部で「試行全体のやり直し」(既定50回)を行うため、
// 1回の呼び出しだけでもかなり強力な検証になっている。そのため外側のループ回数は
// 少なめ(既定5回)にして、無駄な計算量の掛け算(外側 x 内側restart x 変数ごとの
// 再抽選)を避けている。

import { resolveVariables, resolvePairChoice } from './resolve';
import type { ProblemTemplateDef } from './types';

export interface ValidateResult {
  ok: boolean;
  error?: string;
  triesRun: number;
}

export function validateTemplate(
  template: Pick<ProblemTemplateDef, 'kind' | 'variables' | 'constraints' | 'pairs'>,
  tries = 5,
): ValidateResult {
  if (template.kind === 'pair_choice') {
    const result = resolvePairChoice(template.pairs ?? []);
    return result.ok ? { ok: true, triesRun: 1 } : { ok: false, error: result.error, triesRun: 1 };
  }

  for (let i = 0; i < tries; i++) {
    const result = resolveVariables(template);
    if (!result.ok) {
      return { ok: false, error: result.error, triesRun: i + 1 };
    }
  }
  return { ok: true, triesRun: tries };
}

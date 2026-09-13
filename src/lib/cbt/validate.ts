// 保存前検証: テンプレートが実際に生成可能かどうかを、複数回試行して確認する。
// 実装イメージ文書 2章 / 4章を参照。生成そのものに失敗した場合はそのエラーを
// そのまま返す。「たまたま運悪く失敗した」ケースと区別しないシンプルな実装。

import { resolveVariables } from './resolve';
import type { ProblemTemplateDef } from './types';

export interface ValidateResult {
  ok: boolean;
  error?: string;
  triesRun: number;
}

export function validateTemplate(
  template: Pick<ProblemTemplateDef, 'variables' | 'constraints'>,
  tries = 100,
): ValidateResult {
  for (let i = 0; i < tries; i++) {
    const result = resolveVariables(template);
    if (!result.ok) {
      return { ok: false, error: result.error, triesRun: i + 1 };
    }
  }
  return { ok: true, triesRun: tries };
}

// 変数解決エンジン本体。実装イメージ文書 4章のアルゴリズムをそのまま実装する。
//
// 手順:
//   1. 依存関係グラフを構築しトポロジカルソート(循環参照はエラー)
//   2. 解決順に、各変数の min/max を既に確定した値で評価し、乱数を1つ生成
//   3. その変数が関わる制約(forallを含む)のうち今チェック可能なものを判定
//      満たさなければその変数だけ再抽選(上限回数まで)
//   4. 全変数確定で完了

import { parseExpr, evaluate, isInfLiteral } from './expression';
import { buildResolutionOrder } from './dependencyGraph';
import { parseConstraint, constraintDependencies, evaluateConstraint, type VariableBounds } from './constraints';
import {
  type VariableDef,
  type ProblemTemplateDef,
  type ResolveResult,
  type ResolveOptions,
  type ResolvedVariables,
  PRACTICAL_BOUND,
  DEFAULT_MAX_RETRIES,
} from './types';

function resolveBound(field: string, type: VariableDef['type'], scope: Record<string, number>): number {
  const infKind = isInfLiteral(field);
  if (infKind === 'pos') return PRACTICAL_BOUND[type];
  if (infKind === 'neg') return -PRACTICAL_BOUND[type];
  const expr = parseExpr(field);
  return evaluate(expr, scope);
}

function drawRandom(type: VariableDef['type'], min: number, max: number, random: () => number): number {
  if (type === 'integer') {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    return lo + Math.floor(random() * (hi - lo + 1));
  }
  return min + random() * (max - min);
}

export function resolveVariables(template: Pick<ProblemTemplateDef, 'variables' | 'constraints'>, options: ResolveOptions = {}): ResolveResult {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const random = options.random ?? Math.random;

  const varByName = new Map(template.variables.map(v => [v.name, v]));

  let order: string[];
  try {
    order = buildResolutionOrder(template.variables).order;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  let constraints;
  try {
    constraints = template.constraints.map(parseConstraint);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const constraintDeps = constraints.map(c => constraintDependencies(c));

  const resolved: ResolvedVariables = {};
  const bounds: Record<string, VariableBounds> = {};
  const checkedConstraintIndexes = new Set<number>();

  for (const name of order) {
    const varDef = varByName.get(name)!;
    let attempts = 0;

    for (;;) {
      let minVal: number;
      let maxVal: number;
      try {
        minVal = resolveBound(varDef.min, varDef.type, resolved);
        maxVal = resolveBound(varDef.max, varDef.type, resolved);
      } catch (e) {
        return { ok: false, error: `変数 "${name}" の範囲式の評価に失敗しました: ${e instanceof Error ? e.message : String(e)}` };
      }

      if (minVal > maxVal) {
        return { ok: false, error: `変数 "${name}" の範囲が不正です(最小値 ${minVal} > 最大値 ${maxVal})` };
      }

      bounds[name] = { type: varDef.type, min: minVal, max: maxVal };
      resolved[name] = drawRandom(varDef.type, minVal, maxVal, random);

      // 今回のドローで新たにチェック可能になった制約を確認する
      const resolvedNames = new Set(Object.keys(resolved));
      let violated: { index: number; source: string } | null = null;

      for (let i = 0; i < constraints.length; i++) {
        if (checkedConstraintIndexes.has(i)) continue;
        const deps = constraintDeps[i];
        const isReady = [...deps].every(d => resolvedNames.has(d));
        if (!isReady) continue;

        let ok: boolean;
        try {
          ok = evaluateConstraint(constraints[i], resolved, bounds);
        } catch (e) {
          return { ok: false, error: `制約 "${constraints[i].source}" の評価に失敗しました: ${e instanceof Error ? e.message : String(e)}` };
        }

        if (!ok) {
          violated = { index: i, source: constraints[i].source };
          break;
        }
      }

      if (!violated) {
        // 新たにチェック可能になった制約はすべて満たされたので確定とする
        for (let i = 0; i < constraints.length; i++) {
          if (checkedConstraintIndexes.has(i)) continue;
          const deps = constraintDeps[i];
          if ([...deps].every(d => resolvedNames.has(d))) {
            checkedConstraintIndexes.add(i);
          }
        }
        break; // この変数の解決は完了、次の変数へ
      }

      attempts++;
      if (attempts > maxRetries) {
        return {
          ok: false,
          error: `制約 "${violated.source}" を満たす値が見つかりませんでした(${maxRetries}回試行)`,
        };
      }
      // ループを継続して同じ変数を再抽選する
    }
  }

  return { ok: true, values: resolved };
}

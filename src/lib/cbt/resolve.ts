// 変数解決エンジン本体。実装イメージ文書 4章のアルゴリズムをそのまま実装する。
//
// 手順:
//   1. 依存関係グラフを構築しトポロジカルソート(循環参照はエラー)
//   2. 解決順に、各変数の min/max を既に確定した値で評価し、乱数を1つ生成
//   3. その変数が関わる制約(forallを含む)のうち今チェック可能なものを判定
//      満たさなければその変数だけ再抽選(上限回数まで)
//   4. 全変数確定で完了
//
// 注意(重要なバグ修正): ある変数の再抽選が上限に達しても、それは必ずしも
// テンプレートが破綻しているとは限らない。例えば A,B∈[0,100], 制約 "A<B" は
// 大半のAの値では簡単に満たせるが、たまたまA=100を引いた場合はBをどれだけ
// 再抽選しても絶対に満たせない(構造的な袋小路)。このケースを「テンプレート
// 全体が生成不能」と誤判定しないよう、1変数の再抽選上限に達した場合は
// "この試行全体を最初からやり直す"(全変数を再抽選する)方式にしている。
// これにより A が別の値になり、大抵は次の試行で解決する。

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
  DEFAULT_MAX_RESTARTS,
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

// 1回分の試行(全変数を解決順に確定させる)。1変数の再抽選上限に達したら
// { retryExhausted: true } を返し、呼び出し側で試行全体をやり直させる。
type AttemptResult =
  | { kind: 'success'; values: ResolvedVariables }
  | { kind: 'retryExhausted'; constraintSource: string }
  | { kind: 'fatal'; error: string };

function attemptResolve(
  order: string[],
  varByName: Map<string, VariableDef>,
  constraints: ReturnType<typeof parseConstraint>[],
  constraintDeps: Set<string>[],
  maxRetries: number,
  random: () => number,
): AttemptResult {
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
        return { kind: 'fatal', error: `変数 "${name}" の範囲式の評価に失敗しました: ${e instanceof Error ? e.message : String(e)}` };
      }

      if (minVal > maxVal) {
        return { kind: 'fatal', error: `変数 "${name}" の範囲が不正です(最小値 ${minVal} > 最大値 ${maxVal})` };
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
          return { kind: 'fatal', error: `制約 "${constraints[i].source}" の評価に失敗しました: ${e instanceof Error ? e.message : String(e)}` };
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
        return { kind: 'retryExhausted', constraintSource: violated.source };
      }
      // ループを継続して同じ変数を再抽選する
    }
  }

  return { kind: 'success', values: resolved };
}

export function resolveVariables(template: Pick<ProblemTemplateDef, 'variables' | 'constraints'>, options: ResolveOptions = {}): ResolveResult {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const maxRestarts = options.maxRestarts ?? DEFAULT_MAX_RESTARTS;
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

  let lastRetryExhaustedSource: string | null = null;

  for (let restart = 0; restart <= maxRestarts; restart++) {
    const result = attemptResolve(order, varByName, constraints, constraintDeps, maxRetries, random);

    if (result.kind === 'success') {
      return { ok: true, values: result.values };
    }
    if (result.kind === 'fatal') {
      return { ok: false, error: result.error };
    }
    // retryExhausted: 試行全体を最初からやり直す(次のループへ)
    lastRetryExhaustedSource = result.constraintSource;
  }

  return {
    ok: false,
    error: `制約 "${lastRetryExhaustedSource}" を満たす値の組み合わせが見つかりませんでした(${maxRestarts + 1}回試行、各${maxRetries}回再抽選)`,
  };
}

// 変数のmin/max式から依存関係グラフを構築し、トポロジカルソートで
// 解決順序を決定する。循環参照が検出された場合はエラーを投げる。

import { parseExpr, collectVariableNames, isInfLiteral } from './expression';
import type { VariableDef } from './types';

export interface DependencyGraphResult {
  order: string[]; // 解決順序(依存先が先)
}

export function buildResolutionOrder(variables: VariableDef[]): DependencyGraphResult {
  const names = new Set(variables.map(v => v.name));
  const deps = new Map<string, Set<string>>();

  for (const v of variables) {
    const varDeps = new Set<string>();
    for (const field of [v.min, v.max] as const) {
      if (isInfLiteral(field)) continue;
      let expr;
      try {
        expr = parseExpr(field);
      } catch (e) {
        throw new Error(`変数 "${v.name}" の範囲式を解析できません: ${e instanceof Error ? e.message : String(e)}`);
      }
      for (const ref of collectVariableNames(expr)) {
        if (!names.has(ref)) {
          throw new Error(`変数 "${v.name}" の範囲式が未宣言の変数 "${ref}" を参照しています`);
        }
        varDeps.add(ref); // 自己参照もそのまま加える(循環参照として検出させるため)
      }
    }
    deps.set(v.name, varDeps);
  }

  // Kahn's algorithm によるトポロジカルソート。
  // 各変数の入次数 = その変数が依存している(先に解決されるべき)変数の数。
  const inDegree = new Map<string, number>();
  for (const [name, varDeps] of deps) {
    inDegree.set(name, varDeps.size);
  }

  const queue: string[] = [];
  for (const name of names) {
    if ((inDegree.get(name) || 0) === 0) queue.push(name);
  }
  queue.sort(); // 決定的な順序にするため

  const order: string[] = [];
  // 「name に依存している他の変数」の逆引きマップ
  const dependents = new Map<string, string[]>();
  for (const name of names) dependents.set(name, []);
  for (const [name, varDeps] of deps) {
    for (const d of varDeps) {
      dependents.get(d)!.push(name);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    const nexts = [...(dependents.get(current) || [])].sort();
    for (const next of nexts) {
      const remaining = (inDegree.get(next) || 0) - 1;
      inDegree.set(next, remaining);
      if (remaining === 0) queue.push(next);
    }
    queue.sort();
  }

  if (order.length !== names.size) {
    const unresolved = [...names].filter(n => !order.includes(n));
    throw new Error(`循環参照が検出されました: ${unresolved.join(', ')}`);
  }

  return { order };
}

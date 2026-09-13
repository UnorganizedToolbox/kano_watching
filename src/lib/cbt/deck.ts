// デッキ(自己参照ツリー)の平坦化・重みに基づく決定的な出題数の割り当て。
// デッキ機能設計メモ:
//   - 各子(サブデッキ or テンプレート)は weight(重み)を持つ。weightは確率
//     ではなく「その葉から何問出題するか」を表す個数。1つのテンプレートに
//     weight=5を付ければ、そのテンプレートから常に必ず5問出題される
//     (抽選で期待値5になるだけではない)。
//   - サブデッキを子に持つ場合、そのサブデッキ自身の内部weight比率を保ったまま、
//     親が指定したweightに正規化して展開する(例: 子デッキの内部weightが
//     10,5,50(計65)で、親からweight=45で参照されていれば、45*10/65,
//     45*5/65,45*50/65 に比例配分され、端数は剰余法で調整される)。
//   - デッキ全体の総weight(=そのデッキを使ったときに生成される問題数)は、
//     再帰的に正規化されるため、常にトップレベルの子のweight合計と一致する。

export const DECK_MAX_QUESTIONS = 100;

export type DeckChildKind = 'deck' | 'template';

export interface DeckItemInput {
  childKind: DeckChildKind;
  childId: string; // childKind==='deck'ならデッキid、'template'ならテンプレートid
  weight: number;
}

export interface DeckLeaf {
  templateId: string;
  weight: number;
}

export function flattenDeck(
  deckId: string,
  itemsByDeck: Map<string, DeckItemInput[]>,
  visited: Set<string> = new Set(),
): DeckLeaf[] {
  if (visited.has(deckId)) {
    throw new Error('デッキの循環参照が検出されました');
  }
  const nextVisited = new Set(visited);
  nextVisited.add(deckId);

  const items = itemsByDeck.get(deckId) ?? [];
  const leaves: DeckLeaf[] = [];

  for (const item of items) {
    if (!(item.weight > 0)) continue;

    if (item.childKind === 'template') {
      leaves.push({ templateId: item.childId, weight: item.weight });
      continue;
    }

    const childLeaves = flattenDeck(item.childId, itemsByDeck, nextVisited);
    const childTotal = childLeaves.reduce((sum, l) => sum + l.weight, 0);
    if (childTotal <= 0) continue;

    const scale = item.weight / childTotal;
    for (const l of childLeaves) {
      leaves.push({ templateId: l.templateId, weight: l.weight * scale });
    }
  }

  return leaves;
}

export function totalDeckWeight(leaves: DeckLeaf[]): number {
  return leaves.reduce((sum, l) => sum + l.weight, 0);
}

// leaves(重み付きの葉テンプレート一覧)を、weight比率に応じて「決定的に」
// outputCount個へ按分する。weightは確率ではなく「何問出題するか」の個数を
// 表す(例: 1つのテンプレートにweight=5を付ければ、常に必ず5問出題される。
// 期待値が5になるだけの抽選ではない)。端数は剰余法(largest remainder
// method)で配分し、合計が必ずoutputCountと一致するようにする。
// 得られた列はシャッフルして返す(同じテンプレートが固まって連続しないように。
// 各インスタンスの変数は呼び出し側で毎回独立に解決するため、シャッフル自体は
// 出題内容には影響しない、順序だけの変更)。
export function drawDeckTemplateIds(leaves: DeckLeaf[], outputCount: number, random: () => number = Math.random): string[] {
  const total = totalDeckWeight(leaves);
  if (total <= 0) throw new Error('デッキに問題が登録されていません');

  const raw = leaves.map(l => (l.weight / total) * outputCount);
  const counts = raw.map(Math.floor);
  let assigned = counts.reduce((a, b) => a + b, 0);

  const remainders = raw
    .map((r, i) => ({ i, frac: r - counts[i] }))
    .sort((a, b) => b.frac - a.frac);

  let idx = 0;
  while (assigned < outputCount && idx < remainders.length) {
    counts[remainders[idx].i]++;
    assigned++;
    idx++;
  }

  const result: string[] = [];
  leaves.forEach((leaf, i) => {
    for (let n = 0; n < counts[i]; n++) result.push(leaf.templateId);
  });

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

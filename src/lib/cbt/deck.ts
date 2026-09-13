// デッキ(自己参照ツリー)の平坦化・重み付き抽選。
// デッキ機能設計メモ:
//   - 各子(サブデッキ or テンプレート)は weight(重み)を持つ。
//   - サブデッキを子に持つ場合、そのサブデッキ自身の内部weight比率を保ったまま、
//     親が指定したweightに正規化して展開する(例: 子デッキの内部weightが
//     10,5,50(計65)で、親からweight=45で参照されていれば、45*10/65,
//     45*5/65,45*50/65 に比例配分される)。
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

// leaves(重み付きの葉テンプレート一覧)からcount個、重み比率に応じて独立に
// 重み付きランダム抽選する(復元抽出。同じテンプレートが複数回選ばれてもよい。
// 実際の変数解決はテンプレートごとに毎回独立に行うため問題ない)。
export function drawDeckTemplateIds(leaves: DeckLeaf[], count: number, random: () => number = Math.random): string[] {
  const total = totalDeckWeight(leaves);
  if (total <= 0) throw new Error('デッキに問題が登録されていません');

  const drawn: string[] = [];
  for (let i = 0; i < count; i++) {
    let r = random() * total;
    let chosen = leaves[leaves.length - 1].templateId;
    for (const leaf of leaves) {
      if (r < leaf.weight) {
        chosen = leaf.templateId;
        break;
      }
      r -= leaf.weight;
    }
    drawn.push(chosen);
  }
  return drawn;
}

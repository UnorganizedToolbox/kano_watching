import { describe, it, expect } from 'vitest';
import { flattenDeck, totalDeckWeight, drawDeckTemplateIds, type DeckItemInput } from './deck';

describe('flattenDeck', () => {
  it('flattens a deck with only direct template children', () => {
    const itemsByDeck = new Map<string, DeckItemInput[]>([
      ['root', [
        { childKind: 'template', childId: 't1', weight: 25 },
        { childKind: 'template', childId: 't2', weight: 45 },
      ]],
    ]);
    const leaves = flattenDeck('root', itemsByDeck);
    expect(leaves).toEqual([
      { templateId: 't1', weight: 25 },
      { templateId: 't2', weight: 45 },
    ]);
    expect(totalDeckWeight(leaves)).toBe(70);
  });

  it('normalizes a nested deck\'s internal weights to the weight it is referenced with', () => {
    // 「一次方程式」デッキは内部で 係数(10) / 分類(5) / 解(50) = 計65
    // 親からweight=45で参照されるので、45*10/65, 45*5/65, 45*50/65 に比例配分される
    const itemsByDeck = new Map<string, DeckItemInput[]>([
      ['linear-eq', [
        { childKind: 'template', childId: 'coefficient', weight: 10 },
        { childKind: 'template', childId: 'classification', weight: 5 },
        { childKind: 'template', childId: 'solve', weight: 50 },
      ]],
      ['root', [
        { childKind: 'template', childId: 'negative-numbers', weight: 25 },
        { childKind: 'deck', childId: 'linear-eq', weight: 45 },
      ]],
    ]);

    const leaves = flattenDeck('root', itemsByDeck);
    expect(leaves).toHaveLength(4);

    const byId = Object.fromEntries(leaves.map(l => [l.templateId, l.weight]));
    expect(byId['negative-numbers']).toBe(25);
    expect(byId['coefficient']).toBeCloseTo((45 * 10) / 65, 6);
    expect(byId['classification']).toBeCloseTo((45 * 5) / 65, 6);
    expect(byId['solve']).toBeCloseTo((45 * 50) / 65, 6);

    // 正規化により、展開後の合計は常にトップレベルのweight合計(25+45=70)と一致する
    expect(totalDeckWeight(leaves)).toBeCloseTo(70, 6);
  });

  it('throws on a self-referencing cycle', () => {
    const itemsByDeck = new Map<string, DeckItemInput[]>([
      ['a', [{ childKind: 'deck', childId: 'a', weight: 10 }]],
    ]);
    expect(() => flattenDeck('a', itemsByDeck)).toThrow(/循環参照/);
  });

  it('throws on an indirect cycle (a -> b -> a)', () => {
    const itemsByDeck = new Map<string, DeckItemInput[]>([
      ['a', [{ childKind: 'deck', childId: 'b', weight: 10 }]],
      ['b', [{ childKind: 'deck', childId: 'a', weight: 10 }]],
    ]);
    expect(() => flattenDeck('a', itemsByDeck)).toThrow(/循環参照/);
  });

  it('allows the same deck to appear twice as a sibling (not a cycle)', () => {
    const itemsByDeck = new Map<string, DeckItemInput[]>([
      ['shared', [{ childKind: 'template', childId: 't1', weight: 1 }]],
      ['root', [
        { childKind: 'deck', childId: 'shared', weight: 10 },
        { childKind: 'deck', childId: 'shared', weight: 20 },
      ]],
    ]);
    const leaves = flattenDeck('root', itemsByDeck);
    expect(leaves).toEqual([
      { templateId: 't1', weight: 10 },
      { templateId: 't1', weight: 20 },
    ]);
  });

  it('returns an empty array for a deck with no items', () => {
    expect(flattenDeck('empty', new Map())).toEqual([]);
  });
});

describe('drawDeckTemplateIds', () => {
  function sequenceRandom(values: number[]): () => number {
    let i = 0;
    return () => values[i++ % values.length];
  }

  it('draws templates proportionally to their weight using the injected random source', () => {
    const leaves = [
      { templateId: 'a', weight: 30 },
      { templateId: 'b', weight: 70 },
    ];
    // total=100。r=29.9 -> a(0..30), r=30.1 -> b(30..100)
    const drawn = drawDeckTemplateIds(leaves, 2, sequenceRandom([0.299, 0.301]));
    expect(drawn).toEqual(['a', 'b']);
  });

  it('draws the requested number of instances', () => {
    const leaves = [{ templateId: 'only', weight: 1 }];
    const drawn = drawDeckTemplateIds(leaves, 5, () => 0.5);
    expect(drawn).toHaveLength(5);
    expect(drawn.every(id => id === 'only')).toBe(true);
  });

  it('throws when the deck has no weight at all', () => {
    expect(() => drawDeckTemplateIds([], 1)).toThrow();
  });
});

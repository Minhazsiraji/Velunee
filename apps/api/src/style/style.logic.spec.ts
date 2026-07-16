import { suggestOutfit, warmthBand, type StyleItem } from './style.logic';

let idSeq = 0;
function item(overrides: Partial<StyleItem>): StyleItem {
  idSeq += 1;
  return {
    id: `00000000-0000-4000-8000-${String(idSeq).padStart(12, '0')}`,
    name: 'Item',
    category: 'top',
    color: 'neutral',
    warmth: 'medium',
    formality: 'casual',
    timesWorn: 0,
    ...overrides,
  };
}

const basicWardrobe: StyleItem[] = [
  item({
    name: 'White tee',
    category: 'top',
    color: 'white',
    formality: 'casual',
    warmth: 'light',
  }),
  item({
    name: 'Navy trousers',
    category: 'bottom',
    color: 'navy',
    formality: 'smart',
    warmth: 'medium',
  }),
  item({
    name: 'Sneakers',
    category: 'shoes',
    color: 'white',
    formality: 'casual',
    warmth: 'light',
  }),
  item({
    name: 'Denim jacket',
    category: 'outerwear',
    color: 'denim',
    formality: 'casual',
    warmth: 'warm',
  }),
];

describe('warmthBand', () => {
  it('requires a layer only when it is cold', () => {
    expect(warmthBand(32).needsOuter).toBe(false);
    expect(warmthBand(22).needsOuter).toBe(false);
    expect(warmthBand(12).needsOuter).toBe(true);
    expect(warmthBand(undefined).needsOuter).toBe(false);
  });
});

describe('suggestOutfit', () => {
  it('assembles a top, bottom and shoes for a casual day', () => {
    const result = suggestOutfit({ items: basicWardrobe, occasion: 'casual', temperatureC: 24 });
    expect(result.ok).toBe(true);
    const categories = result.pieces.map((p) => p.category);
    expect(categories).toContain('top');
    expect(categories).toContain('bottom');
    expect(categories).toContain('shoes');
  });

  it('adds outerwear when it is cold, or tips to get one when missing', () => {
    const cold = suggestOutfit({ items: basicWardrobe, occasion: 'casual', temperatureC: 10 });
    expect(cold.pieces.map((p) => p.category)).toContain('outerwear');

    const noJacket = suggestOutfit({
      items: basicWardrobe.filter((i) => i.category !== 'outerwear'),
      occasion: 'casual',
      temperatureC: 10,
    });
    expect(noJacket.pieces.map((p) => p.category)).not.toContain('outerwear');
    expect(noJacket.tips.join(' ')).toMatch(/jacket|layer/i);
  });

  it('prefers a dress for a formal occasion when one fits', () => {
    const wardrobe = [
      ...basicWardrobe,
      item({
        name: 'Black dress',
        category: 'dress',
        color: 'black',
        formality: 'formal',
        warmth: 'medium',
      }),
      item({
        name: 'Heels',
        category: 'shoes',
        color: 'black',
        formality: 'formal',
        warmth: 'light',
      }),
    ];
    const result = suggestOutfit({ items: wardrobe, occasion: 'formal', temperatureC: 22 });
    expect(result.ok).toBe(true);
    expect(result.pieces.map((p) => p.category)).toContain('dress');
  });

  it('rotates: prefers the least-worn item within a category', () => {
    const wardrobe = [
      item({ name: 'Worn shirt', category: 'top', color: 'blue', timesWorn: 9 }),
      item({ name: 'Fresh shirt', category: 'top', color: 'green', timesWorn: 0 }),
      item({ name: 'Jeans', category: 'bottom', color: 'denim' }),
      item({ name: 'Loafers', category: 'shoes', color: 'brown' }),
    ];
    const result = suggestOutfit({ items: wardrobe, occasion: 'casual', temperatureC: 24 });
    const top = result.pieces.find((p) => p.category === 'top');
    expect(top?.name).toBe('Fresh shirt');
  });

  it('is honest and encouraging when the wardrobe is too sparse', () => {
    const result = suggestOutfit({
      items: [item({ category: 'top', name: 'Only a shirt' })],
      occasion: 'casual',
      temperatureC: 24,
    });
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('bottom');
    expect(result.headline.length).toBeGreaterThan(0);
    // Never a rating or a judgement.
    expect(result.message).not.toMatch(/\b(\d{1,2})\s*\/\s*10\b|rating|score/i);
  });

  it('adds a rain tip when rain is expected', () => {
    const result = suggestOutfit({
      items: basicWardrobe,
      occasion: 'casual',
      temperatureC: 24,
      rain: true,
    });
    expect(result.tips.join(' ')).toMatch(/rain|umbrella/i);
  });
});

import type {
  GarmentFormality,
  GarmentWarmth,
  OutfitPiece,
  StyleOccasion,
  SuggestOutfitResponse,
  WardrobeCategory,
} from '@velunee/contracts';

export interface StyleItem {
  id: string;
  name: string;
  category: WardrobeCategory;
  color: string;
  warmth: GarmentWarmth;
  formality: GarmentFormality;
  timesWorn: number;
}

// Priority order per occasion — earlier formality is preferred, later ones
// are still acceptable so a sparse wardrobe can always suggest something.
const OCCASION_FORMALITY: Record<StyleOccasion, GarmentFormality[]> = {
  casual: ['casual', 'smart', 'formal'],
  work: ['smart', 'formal', 'casual'],
  formal: ['formal', 'smart'],
  party: ['smart', 'formal', 'casual'],
  travel: ['casual', 'smart', 'formal'],
};

const OCCASION_LABEL: Record<StyleOccasion, string> = {
  casual: 'a casual day',
  work: 'work',
  formal: 'a formal occasion',
  party: 'going out',
  travel: 'travel',
};

const NEUTRALS = new Set([
  'black',
  'white',
  'grey',
  'gray',
  'navy',
  'beige',
  'tan',
  'denim',
  'neutral',
  'brown',
  'cream',
  'khaki',
]);

interface WarmthBand {
  accept: GarmentWarmth[];
  prefer: GarmentWarmth;
  needsOuter: boolean;
}

export function warmthBand(temperatureC?: number): WarmthBand {
  if (temperatureC === undefined) {
    return { accept: ['light', 'medium', 'warm'], prefer: 'medium', needsOuter: false };
  }
  if (temperatureC >= 28)
    return { accept: ['light', 'medium'], prefer: 'light', needsOuter: false };
  if (temperatureC >= 18) {
    return { accept: ['light', 'medium', 'warm'], prefer: 'medium', needsOuter: false };
  }
  return { accept: ['medium', 'warm'], prefer: 'warm', needsOuter: true };
}

function pickItem(
  items: StyleItem[],
  category: WardrobeCategory,
  formalityPriority: GarmentFormality[],
  band: WarmthBand,
): StyleItem | null {
  const candidates = items.filter(
    (item) =>
      item.category === category &&
      formalityPriority.includes(item.formality) &&
      band.accept.includes(item.warmth),
  );
  if (candidates.length === 0) return null;

  // Rank: closest formality match → preferred warmth → least worn (rotation).
  return candidates.sort((a, b) => {
    const fa = formalityPriority.indexOf(a.formality);
    const fb = formalityPriority.indexOf(b.formality);
    if (fa !== fb) return fa - fb;
    const wa = a.warmth === band.prefer ? 0 : 1;
    const wb = b.warmth === band.prefer ? 0 : 1;
    if (wa !== wb) return wa - wb;
    return a.timesWorn - b.timesWorn;
  })[0]!;
}

function toPiece(item: StyleItem): OutfitPiece {
  return { itemId: item.id, name: item.name, category: item.category, color: item.color };
}

function coordinationNote(pieces: OutfitPiece[]): string {
  const accents = [
    ...new Set(pieces.map((p) => p.color.toLowerCase()).filter((c) => !NEUTRALS.has(c))),
  ];
  if (accents.length <= 1) {
    return 'The colours sit well together — a clean, easy-to-wear combination.';
  }
  if (accents.length === 2) {
    return 'Two colours in play — keeping the other pieces neutral keeps it balanced.';
  }
  return 'Several colours here; letting one lead and keeping the rest quiet will feel more put-together.';
}

function weatherLine(temperatureC?: number): string {
  if (temperatureC === undefined) return '';
  if (temperatureC >= 28)
    return `It's warm (${temperatureC}°C), so lighter fabrics will feel best. `;
  if (temperatureC < 18)
    return `It's cool (${temperatureC}°C) — layers will keep you comfortable. `;
  return `Mild today (${temperatureC}°C). `;
}

export function suggestOutfit(input: {
  items: StyleItem[];
  occasion: StyleOccasion;
  temperatureC?: number;
  rain?: boolean;
}): SuggestOutfitResponse {
  const formalityPriority = OCCASION_FORMALITY[input.occasion];
  const band = warmthBand(input.temperatureC);

  const pieces: OutfitPiece[] = [];
  const missing: WardrobeCategory[] = [];
  const tips: string[] = [];

  const dress = pickItem(input.items, 'dress', formalityPriority, band);
  const top = pickItem(input.items, 'top', formalityPriority, band);
  const bottom = pickItem(input.items, 'bottom', formalityPriority, band);
  const preferDress = input.occasion === 'formal' || input.occasion === 'party';

  let coreOk = false;
  if (preferDress && dress) {
    pieces.push(toPiece(dress));
    coreOk = true;
  } else if (top && bottom) {
    pieces.push(toPiece(top), toPiece(bottom));
    coreOk = true;
  } else if (dress) {
    pieces.push(toPiece(dress));
    coreOk = true;
  } else {
    if (!top) missing.push('top');
    else pieces.push(toPiece(top));
    if (!bottom) missing.push('bottom');
    else pieces.push(toPiece(bottom));
  }

  const shoes = pickItem(input.items, 'shoes', formalityPriority, band);
  if (shoes) pieces.push(toPiece(shoes));
  else missing.push('shoes');

  if (band.needsOuter) {
    const outer = pickItem(input.items, 'outerwear', formalityPriority, band);
    if (outer) pieces.push(toPiece(outer));
    else tips.push('It’s cool out — a jacket or warm layer would round this off nicely.');
  }

  const accessory = pickItem(input.items, 'accessory', formalityPriority, band);
  if (accessory) pieces.push(toPiece(accessory));

  if (input.rain) {
    tips.push('Rain is likely — water-friendly shoes and an umbrella will keep you comfortable.');
  }

  if (!coreOk) {
    return {
      ok: false,
      headline: 'Let’s build out your wardrobe',
      message:
        input.items.length === 0
          ? 'Add a few clothes and Velunee can start creating outfits from what you already own.'
          : 'Add a few more items and Velunee can put a full look together for this.',
      pieces,
      missing,
      tips,
    };
  }

  return {
    ok: true,
    headline: `An outfit for ${OCCASION_LABEL[input.occasion]}`,
    message: `${weatherLine(input.temperatureC)}${coordinationNote(pieces)}`,
    pieces,
    missing,
    tips,
  };
}

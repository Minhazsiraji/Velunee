import type { ParsedSpendingEntry } from '@velunee/contracts';

export interface ParserCategory {
  id: string;
  name: string;
}

// Deterministic natural-text parser for entries like
// "I spent 250 taka for lunch" or "500 groceries and 200 rickshaw".
// Keyword-based so results are instant, free and predictable; an AI-assisted
// fallback can be layered on later for sentences this cannot handle.

const CATEGORY_KEYWORDS: ReadonlyArray<readonly [string, readonly string[]]> = [
  [
    'Food',
    [
      'lunch',
      'dinner',
      'breakfast',
      'food',
      'grocery',
      'groceries',
      'restaurant',
      'snack',
      'snacks',
      'coffee',
      'tea',
      'meal',
      'iftar',
      'biryani',
    ],
  ],
  [
    'Transport',
    [
      'rickshaw',
      'bus',
      'train',
      'uber',
      'pathao',
      'cng',
      'taxi',
      'fuel',
      'petrol',
      'fare',
      'metro',
      'ride',
    ],
  ],
  ['Shopping', ['shopping', 'clothes', 'dress', 'shoe', 'shoes', 'bag', 'saree', 'kurti']],
  ['Rent', ['rent']],
  [
    'Utilities',
    [
      'electricity',
      'electric',
      'water bill',
      'gas',
      'internet',
      'wifi',
      'recharge',
      'mobile bill',
      'top-up',
      'topup',
    ],
  ],
  ['Education', ['school', 'tuition', 'book', 'books', 'course', 'exam']],
  ['Healthcare', ['medicine', 'doctor', 'hospital', 'pharmacy', 'clinic']],
  ['Children & family', ['baby', 'kid', 'kids', 'child', 'children', 'diaper']],
  [
    'Beauty & personal care',
    ['salon', 'parlour', 'parlor', 'haircut', 'makeup', 'cosmetics', 'skincare'],
  ],
  ['Entertainment', ['movie', 'cinema', 'netflix', 'game', 'concert', 'outing']],
  ['Loan & EMI', ['emi', 'loan', 'installment', 'instalment']],
  ['Gifts', ['gift', 'gifts']],
  ['Travel', ['travel', 'trip', 'hotel', 'flight', 'tour', 'ticket']],
];

const INCOME_PATTERN = /\b(salary|income|received|earned|bonus|freelance|profit)\b/i;

const AMOUNT_PATTERN = /(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/;

const MAX_ENTRIES = 5;

function matchCategoryName(clause: string): string | null {
  const lowered = clause.toLowerCase();
  for (const [name, keywords] of CATEGORY_KEYWORDS) {
    for (const keyword of keywords) {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`\\b${escaped}\\b`, 'i').test(lowered)) {
        return name;
      }
    }
  }
  return null;
}

export function parseSpendingText(
  text: string,
  categories: ParserCategory[],
): ParsedSpendingEntry[] {
  const categoryIdsByName = new Map(
    categories.map((category) => [category.name.toLowerCase(), category.id]),
  );

  // Commas directly followed by a 3-digit group are thousand separators
  // (1,250.50), not clause boundaries.
  const clauses = text
    .split(/(?:,(?!\d{3}\b)|;|\band\b|&|\+)/i)
    .map((clause) => clause.trim())
    .filter(Boolean);

  const entries: ParsedSpendingEntry[] = [];

  for (const clause of clauses) {
    if (entries.length >= MAX_ENTRIES) break;

    const amountMatch = AMOUNT_PATTERN.exec(clause);
    if (!amountMatch) continue;

    const whole = Number(amountMatch[1]!.replace(/,/g, ''));
    const cents = amountMatch[2] ? Number(amountMatch[2].padEnd(2, '0')) : 0;
    const amountMinor = whole * 100 + cents;
    if (amountMinor <= 0) continue;

    const kind = INCOME_PATTERN.test(clause) ? 'income' : 'expense';
    const categoryName = kind === 'expense' ? matchCategoryName(clause) : null;
    const categoryId = categoryName
      ? (categoryIdsByName.get(categoryName.toLowerCase()) ?? null)
      : null;

    entries.push({
      kind,
      amountMinor,
      categoryId,
      categoryName,
      note: clause.slice(0, 240),
    });
  }

  return entries;
}

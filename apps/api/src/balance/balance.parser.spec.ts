import { parseSpendingText } from './balance.parser';

const categories = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Food' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Transport' },
  { id: '33333333-3333-4333-8333-333333333333', name: 'Shopping' },
];

describe('parseSpendingText', () => {
  it('parses the documented single-expense example', () => {
    const entries = parseSpendingText('I spent 250 taka for lunch', categories);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      kind: 'expense',
      amountMinor: 250_00,
      categoryName: 'Food',
      categoryId: categories[0]!.id,
    });
  });

  it('splits multiple expenses joined with "and"', () => {
    const entries = parseSpendingText(
      'I spent 500 taka on groceries and 200 taka for rickshaw',
      categories,
    );

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ amountMinor: 500_00, categoryName: 'Food' });
    expect(entries[1]).toMatchObject({ amountMinor: 200_00, categoryName: 'Transport' });
  });

  it('understands thousand separators and decimals', () => {
    const entries = parseSpendingText('new dress 1,250.50', categories);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ amountMinor: 125_050, categoryName: 'Shopping' });
  });

  it('marks salary as income without a category', () => {
    const entries = parseSpendingText('received salary 60000', categories);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ kind: 'income', amountMinor: 60_000_00, categoryId: null });
  });

  it('leaves the category empty when nothing matches', () => {
    const entries = parseSpendingText('spent 300 on mystery things', categories);

    expect(entries).toHaveLength(1);
    expect(entries[0]!.categoryName).toBeNull();
  });

  it('ignores clauses without an amount', () => {
    expect(parseSpendingText('bought some snacks', categories)).toHaveLength(0);
  });
});

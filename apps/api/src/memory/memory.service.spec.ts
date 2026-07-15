import type { MemoryRepository, MemoryRow } from './memory.repository';
import { MemoryService } from './memory.service';

function buildRow(overrides: Partial<MemoryRow> = {}): MemoryRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    type: 'preference',
    content: 'Prefers simple office outfits',
    enabled: true,
    allowedFeatures: ['chat', 'home'],
    sourceMessageId: null,
    lastUsedAt: null,
    expiresAt: null,
    createdAt: new Date('2026-07-15T08:00:00Z'),
    ...overrides,
  };
}

function buildRepository(rows: MemoryRow[] = []): jest.Mocked<
  Pick<MemoryRepository, 'list' | 'create' | 'update' | 'softDelete' | 'clearAll'>
> {
  return {
    list: jest.fn().mockResolvedValue(rows),
    create: jest.fn().mockImplementation((_userId, input) =>
      Promise.resolve(
        buildRow({
          type: input.type,
          content: input.content,
          allowedFeatures: input.allowedFeatures,
          expiresAt: input.expiresAt,
        }),
      ),
    ),
    update: jest.fn().mockResolvedValue(buildRow({ enabled: false })),
    softDelete: jest.fn().mockResolvedValue(true),
    clearAll: jest.fn().mockResolvedValue(3),
  };
}

describe('MemoryService', () => {
  it('lists memories with their source and controls', async () => {
    const repository = buildRepository([
      buildRow(),
      buildRow({
        id: '22222222-2222-4222-8222-222222222222',
        sourceMessageId: '33333333-3333-4333-8333-333333333333',
      }),
    ]);
    const service = new MemoryService(repository as unknown as MemoryRepository);

    const result = await service.list('user-1');

    expect(result.memories).toHaveLength(2);
    expect(result.memories[0]!.source).toBe('manual');
    expect(result.memories[1]!.source).toBe('chat');
  });

  it('drops unknown feature keys instead of leaking them to the client', async () => {
    const repository = buildRepository([
      buildRow({ allowedFeatures: ['chat', 'community', 'mystery'] }),
    ]);
    const service = new MemoryService(repository as unknown as MemoryRepository);

    const result = await service.list('user-1');

    expect(result.memories[0]!.allowedFeatures).toEqual(['chat']);
  });

  it('gives temporary memories an expiry by default', async () => {
    const repository = buildRepository([]);
    const service = new MemoryService(repository as unknown as MemoryRepository);

    const before = Date.now();
    await service.create('user-1', {
      type: 'temporary',
      content: 'Working late this week',
    });

    const input = repository.create.mock.calls[0]![1];
    expect(input.expiresAt).not.toBeNull();
    const sevenDays = 7 * 86_400_000;
    expect(input.expiresAt!.getTime()).toBeGreaterThanOrEqual(before + sevenDays - 5_000);
    expect(input.expiresAt!.getTime()).toBeLessThanOrEqual(Date.now() + sevenDays + 5_000);
  });

  it('enforces the memory limit', async () => {
    const rows = Array.from({ length: 200 }, (_, index) =>
      buildRow({ id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}` }),
    );
    const repository = buildRepository(rows);
    const service = new MemoryService(repository as unknown as MemoryRepository);

    await expect(
      service.create('user-1', { type: 'preference', content: 'One more' }),
    ).rejects.toThrow(/memory limit/i);
  });

  it('reports how many memories were cleared', async () => {
    const repository = buildRepository();
    const service = new MemoryService(repository as unknown as MemoryRepository);

    await expect(service.clearAll('user-1')).resolves.toEqual({ deletedCount: 3 });
  });
});

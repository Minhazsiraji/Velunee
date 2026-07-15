import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateMemoryInput,
  MemoriesClearedResponse,
  MemoriesResponse,
  MemoryDeletedResponse,
  MemoryFeature,
  MemoryItem,
  MemoryResponse,
  UpdateMemoryInput,
} from '@velunee/contracts';
import { memoryFeatureSchema } from '@velunee/contracts';
import { MemoryRepository, type MemoryRow } from './memory.repository';

const MAX_MEMORIES = 200;
const DAY_MS = 86_400_000;
const DEFAULT_FEATURES: MemoryFeature[] = ['chat', 'home'];

@Injectable()
export class MemoryService {
  constructor(private readonly repository: MemoryRepository) {}

  private toContract(row: MemoryRow): MemoryItem {
    // Stored feature lists may predate newer feature keys; keep only the ones
    // the contract recognises so the client never sees an unknown value.
    const allowedFeatures = row.allowedFeatures.filter(
      (feature): feature is MemoryFeature => memoryFeatureSchema.safeParse(feature).success,
    );

    return {
      id: row.id,
      type: row.type,
      content: row.content,
      enabled: row.enabled,
      allowedFeatures: allowedFeatures.length > 0 ? allowedFeatures : DEFAULT_FEATURES,
      source: row.sourceMessageId ? 'chat' : 'manual',
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async list(userId: string): Promise<MemoriesResponse> {
    const rows = await this.repository.list(userId);
    return { memories: rows.map((row) => this.toContract(row)) };
  }

  async create(userId: string, input: CreateMemoryInput): Promise<MemoryResponse> {
    const existing = await this.repository.list(userId);
    if (existing.length >= MAX_MEMORIES) {
      throw new BadRequestException(
        `You have reached the ${MAX_MEMORIES}-memory limit. Delete a memory you no longer need first.`,
      );
    }

    const expiresAt =
      input.type === 'temporary'
        ? new Date(Date.now() + (input.expiresInDays ?? 7) * DAY_MS)
        : input.expiresInDays !== undefined
          ? new Date(Date.now() + input.expiresInDays * DAY_MS)
          : null;

    const row = await this.repository.create(userId, {
      type: input.type,
      content: input.content,
      allowedFeatures: input.allowedFeatures ?? DEFAULT_FEATURES,
      expiresAt,
    });

    return { memory: this.toContract(row) };
  }

  async update(
    userId: string,
    memoryId: string,
    input: UpdateMemoryInput,
  ): Promise<MemoryResponse> {
    const row = await this.repository.update(userId, memoryId, input);
    if (!row) {
      throw new NotFoundException('Memory not found');
    }
    return { memory: this.toContract(row) };
  }

  async delete(userId: string, memoryId: string): Promise<MemoryDeletedResponse> {
    const deleted = await this.repository.softDelete(userId, memoryId);
    if (!deleted) {
      throw new NotFoundException('Memory not found');
    }
    return { deleted: true };
  }

  async clearAll(userId: string): Promise<MemoriesClearedResponse> {
    const deletedCount = await this.repository.clearAll(userId);
    return { deletedCount };
  }
}

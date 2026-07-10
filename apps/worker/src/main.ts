import { JsonConsoleLogger } from '@velunee/observability';

const logger = new JsonConsoleLogger();
const intervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 30_000);
let shuttingDown = false;

async function runMaintenanceCycle(): Promise<void> {
  logger.info('Worker maintenance cycle started', { intervalMs });

  // Milestone 1 intentionally performs no destructive work.
  // Next tasks: PostgreSQL outbox delivery, expired media deletion,
  // reminder dispatch, usage resets, and verified account-deletion jobs.

  logger.info('Worker maintenance cycle completed');
}

async function main(): Promise<void> {
  logger.info('Velunee worker started');

  while (!shuttingDown) {
    try {
      await runMaintenanceCycle();
    } catch (error) {
      logger.error('Worker cycle failed', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    shuttingDown = true;
    logger.info('Worker shutdown requested', { signal });
  });
}

void main();

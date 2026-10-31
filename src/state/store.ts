import { applyAction, seedState, type Action, type AppState } from '../domain';
import type { StateRepository } from '../data/repository';

/** Writes are serialized and only published after durable storage succeeds. */
export function createAppStore(repository: StateRepository) {
  let current: AppState | null = null;
  let queue: Promise<unknown> = Promise.resolve();
  const listeners = new Set<(state: AppState) => void>();
  function publish(next: AppState) {
    current = next;
    listeners.forEach((listener) => listener(next));
  }
  async function persist(next: AppState) {
    await repository.save(next);
    publish(next);
  }
  function enqueue(operation: () => Promise<void>): Promise<void> {
    const pending = queue.then(operation);
    queue = pending.catch(() => undefined);
    return pending;
  }
  return {
    getState: () => current,
    subscribe(listener: (state: AppState) => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    load: () => enqueue(async () => {
      const stored = await repository.load();
      if (stored) publish(stored);
      else await persist(seedState());
    }),
    act: (action: Action) => enqueue(async () => {
      if (!current) throw new Error('Demo data is still loading. Please try again.');
      await persist(applyAction(current, action));
    }),
    reset: () => enqueue(() => persist(seedState())),
  };
}

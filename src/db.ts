import { Game } from './game';

export const DB_NAME = 'flip7';
export const DB_VERSION = 1;
export const GAMES_STORE = 'games';
export const META_STORE = 'meta';
export const ACTIVE_GAME_KEY = 'activeGameId';

export interface GameStore {
  activeGame(): Promise<Game | null>;
  save(game: Game): Promise<void>;
  setActiveGame(id: string | null): Promise<void>;
  recentGames(limit?: number): Promise<Game[]>;
  remove(id: string): Promise<void>;
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

export function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(GAMES_STORE)) {
        db.createObjectStore(GAMES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked by another tab'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB write aborted'));
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB write failed'));
  });
}

export function createGameStore(factory: IDBFactory): GameStore {
  let connection: Promise<IDBDatabase> | null = null;

  const db = (): Promise<IDBDatabase> => {
    connection ??= openDatabase(factory);
    return connection;
  };

  const readActiveId = async (): Promise<string | null> => {
    const database = await db();
    const store = database.transaction(META_STORE, 'readonly').objectStore(META_STORE);
    const id = await promisify(store.get(ACTIVE_GAME_KEY));
    return typeof id === 'string' ? id : null;
  };

  return {
    async activeGame(): Promise<Game | null> {
      const id = await readActiveId();
      if (id === null) {
        return null;
      }
      const database = await db();
      const store = database.transaction(GAMES_STORE, 'readonly').objectStore(GAMES_STORE);
      const game = await promisify<Game | undefined>(store.get(id));
      return game ?? null;
    },

    async save(game: Game): Promise<void> {
      const database = await db();
      const transaction = database.transaction([GAMES_STORE, META_STORE], 'readwrite');
      transaction.objectStore(GAMES_STORE).put(game);
      transaction.objectStore(META_STORE).put(game.id, ACTIVE_GAME_KEY);
      await transactionDone(transaction);
    },

    async setActiveGame(id: string | null): Promise<void> {
      const database = await db();
      const transaction = database.transaction(META_STORE, 'readwrite');
      const store = transaction.objectStore(META_STORE);
      if (id === null) {
        store.delete(ACTIVE_GAME_KEY);
      } else {
        store.put(id, ACTIVE_GAME_KEY);
      }
      await transactionDone(transaction);
    },

    async recentGames(limit = 10): Promise<Game[]> {
      const database = await db();
      const store = database.transaction(GAMES_STORE, 'readonly').objectStore(GAMES_STORE);
      const games = await promisify<Game[]>(store.getAll());
      return games.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);
    },

    async remove(id: string): Promise<void> {
      const database = await db();
      const transaction = database.transaction([GAMES_STORE, META_STORE], 'readwrite');
      transaction.objectStore(GAMES_STORE).delete(id);
      const meta = transaction.objectStore(META_STORE);
      const activeId = await promisify(meta.get(ACTIVE_GAME_KEY));
      if (activeId === id) {
        meta.delete(ACTIVE_GAME_KEY);
      }
      await transactionDone(transaction);
    },
  };
}

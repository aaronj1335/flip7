import { useCallback, useEffect, useMemo, useState } from 'react';
import { createGameStore, GameStore } from './db';
import { applyAction, createGame, Game, GameAction, TARGET_SCORE } from './game';

export type GameStatus = 'loading' | 'ready' | 'error';

export interface GameController {
  status: GameStatus;
  error: string | null;
  game: Game | null;
  recentGames: Game[];
  dispatch: (action: GameAction) => void;
  startGame: (names: readonly string[], targetScore?: number) => void;
  resumeGame: (id: string) => void;
  leaveGame: () => void;
  deleteGame: (id: string) => void;
}

export function useGame(store: GameStore | null): GameController {
  const [status, setStatus] = useState<GameStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [recentGames, setRecentGames] = useState<Game[]>([]);

  const fail = useCallback((cause: unknown) => {
    setError(cause instanceof Error ? cause.message : String(cause));
    setStatus('error');
  }, []);

  const refreshRecentGames = useCallback(
    async (from: GameStore) => {
      try {
        setRecentGames(await from.recentGames());
      } catch (cause: unknown) {
        fail(cause);
      }
    },
    [fail]
  );

  useEffect(() => {
    if (store === null) {
      setStatus('ready');
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const active = await store.activeGame();
        if (cancelled) {
          return;
        }
        setGame(active);
        setStatus('ready');
        await refreshRecentGames(store);
      } catch (cause: unknown) {
        if (!cancelled) {
          fail(cause);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [store, refreshRecentGames, fail]);

  const persist = useCallback(
    (next: Game) => {
      setGame(next);
      if (store === null) {
        return;
      }
      store
        .save(next)
        .then(() => refreshRecentGames(store))
        .catch(fail);
    },
    [store, refreshRecentGames, fail]
  );

  const dispatch = useCallback(
    (action: GameAction) => {
      setGame((previous) => {
        if (previous === null) {
          return previous;
        }
        const next = applyAction(previous, action);
        if (next !== previous && store !== null) {
          store
            .save(next)
            .then(() => refreshRecentGames(store))
            .catch(fail);
        }
        return next;
      });
    },
    [store, refreshRecentGames, fail]
  );

  const startGame = useCallback(
    (names: readonly string[], targetScore: number = TARGET_SCORE) => {
      persist(createGame(names, targetScore));
    },
    [persist]
  );

  const resumeGame = useCallback(
    (id: string) => {
      const found = recentGames.find((candidate) => candidate.id === id);
      if (found === undefined) {
        return;
      }
      setGame(found);
      store?.setActiveGame(id).catch(fail);
    },
    [recentGames, store, fail]
  );

  const leaveGame = useCallback(() => {
    setGame(null);
    if (store === null) {
      return;
    }
    store
      .setActiveGame(null)
      .then(() => refreshRecentGames(store))
      .catch(fail);
  }, [store, refreshRecentGames, fail]);

  const deleteGame = useCallback(
    (id: string) => {
      setGame((previous) => (previous?.id === id ? null : previous));
      if (store === null) {
        return;
      }
      store
        .remove(id)
        .then(() => refreshRecentGames(store))
        .catch(fail);
    },
    [store, refreshRecentGames, fail]
  );

  return useMemo(
    () => ({
      status,
      error,
      game,
      recentGames,
      dispatch,
      startGame,
      resumeGame,
      leaveGame,
      deleteGame,
    }),
    [status, error, game, recentGames, dispatch, startGame, resumeGame, leaveGame, deleteGame]
  );
}

export function browserGameStore(): GameStore | null {
  if (typeof indexedDB === 'undefined') {
    return null;
  }
  return createGameStore(indexedDB);
}

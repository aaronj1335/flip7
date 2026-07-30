import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createGameStore, GameStore } from './db';
import { applyAction, createGame, Game, GameAction, TARGET_SCORE } from './game';

export type GameStatus = 'loading' | 'ready' | 'error';

export interface GameController {
  status: GameStatus;
  error: string | null;
  persistent: boolean;
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
  const latestGame = useRef<Game | null>(null);

  const fail = useCallback((cause: unknown) => {
    setError(cause instanceof Error ? cause.message : String(cause));
    setStatus('error');
  }, []);

  const show = useCallback((next: Game | null) => {
    latestGame.current = next;
    setGame(next);
  }, []);

  const refreshRecentGames = useCallback(() => {
    if (store === null) {
      return;
    }
    store
      .recentGames()
      .then(setRecentGames)
      .catch(fail);
  }, [store, fail]);

  useEffect(() => {
    if (store === null) {
      setStatus('ready');
      return;
    }
    let cancelled = false;
    store
      .activeGame()
      .then((active) => {
        if (cancelled) {
          return;
        }
        latestGame.current = active;
        setGame(active);
        setStatus('ready');
        refreshRecentGames();
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          fail(cause);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [store, refreshRecentGames, fail]);

  const persist = useCallback(
    (next: Game) => {
      show(next);
      if (store === null) {
        return;
      }
      store
        .save(next)
        .then(refreshRecentGames)
        .catch(fail);
    },
    [store, show, refreshRecentGames, fail]
  );

  const dispatch = useCallback(
    (action: GameAction) => {
      const previous = latestGame.current;
      if (previous === null) {
        return;
      }
      const next = applyAction(previous, action);
      if (next !== previous) {
        persist(next);
      }
    },
    [persist]
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
      show(found);
      store?.setActiveGame(id).catch(fail);
    },
    [recentGames, store, show, fail]
  );

  const leaveGame = useCallback(() => {
    show(null);
    if (store === null) {
      return;
    }
    store
      .setActiveGame(null)
      .then(refreshRecentGames)
      .catch(fail);
  }, [store, show, refreshRecentGames, fail]);

  const deleteGame = useCallback(
    (id: string) => {
      if (latestGame.current?.id === id) {
        show(null);
      }
      if (store === null) {
        return;
      }
      store
        .remove(id)
        .then(refreshRecentGames)
        .catch(fail);
    },
    [store, show, refreshRecentGames, fail]
  );

  return useMemo(
    () => ({
      status,
      error,
      persistent: store !== null,
      game,
      recentGames,
      dispatch,
      startGame,
      resumeGame,
      leaveGame,
      deleteGame,
    }),
    [status, error, store, game, recentGames, dispatch, startGame, resumeGame, leaveGame, deleteGame]
  );
}

export function browserGameStore(): GameStore | null {
  if (typeof indexedDB === 'undefined') {
    return null;
  }
  return createGameStore(indexedDB);
}

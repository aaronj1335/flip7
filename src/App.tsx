import { useMemo, useState } from 'react';
import { PlayerSetup } from './components/PlayerSetup';
import { RoundEditor } from './components/RoundEditor';
import { RoundHistory } from './components/RoundHistory';
import { Scoreboard } from './components/Scoreboard';
import { StorageNotice } from './components/StorageNotice';
import { winners } from './game';
import { browserGameStore, useGame } from './useGame';

function App() {
  const store = useMemo(browserGameStore, []);
  const {
    status,
    error,
    persistent,
    game,
    recentGames,
    dispatch,
    startGame,
    resumeGame,
    leaveGame,
    deleteGame,
  } = useGame(store);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  const champions = game === null ? [] : winners(game);

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Flip 7 Scorekeeper</h1>
          <div className="subtitle">
            {game === null
              ? persistent
                ? 'Saved in your browser'
                : 'Not being saved'
              : `Playing to ${game.targetScore}`}
          </div>
        </div>
        {game === null ? null : (
          <button type="button" onClick={leaveGame}>
            New game
          </button>
        )}
      </header>

      {status === 'loading' ? <div className="panel">Loading saved game&hellip;</div> : null}
      <StorageNotice persistent={persistent} error={error} />

      {status === 'loading' ? null : game === null ? (
        <PlayerSetup
          recentGames={recentGames}
          onStart={startGame}
          onResume={resumeGame}
          onDelete={deleteGame}
        />
      ) : (
        <>
          {champions.length === 0 ? null : (
            <div className="banner">
              <h2>
                {champions.map((player) => player.name).join(' & ')}{' '}
                {champions.length > 1 ? 'tie for the win' : 'wins'}
              </h2>
              <p>
                Reached {game.targetScore} after {game.rounds.length}{' '}
                {game.rounds.length === 1 ? 'round' : 'rounds'}. Undo the last round to keep
                playing.
              </p>
            </div>
          )}

          <Scoreboard game={game} />

          {game.current === null ? (
            <div className="panel button-row">
              <button type="button" onClick={() => dispatch({ type: 'undoRound' })}>
                Undo last round
              </button>
              <button type="button" className="button-primary" onClick={leaveGame}>
                Start a new game
              </button>
            </div>
          ) : (
            <RoundEditor
              players={game.players}
              round={game.current}
              roundNumber={game.rounds.length + 1}
              expandedPlayerId={expandedPlayerId}
              onExpandPlayer={setExpandedPlayerId}
              onAction={dispatch}
              canUndo={game.rounds.length > 0}
            />
          )}

          <RoundHistory game={game} />
        </>
      )}
    </div>
  );
}

export default App;

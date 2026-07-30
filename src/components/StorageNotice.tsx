import React from 'react';

interface StorageNoticeProps {
  persistent: boolean;
  error: string | null;
}

export const StorageNotice: React.FC<StorageNoticeProps> = ({ persistent, error }) => {
  if (error !== null) {
    return (
      <div className="banner warning">
        <h2>Scores may not be saved</h2>
        <p>This browser&rsquo;s database returned an error: {error}</p>
      </div>
    );
  }

  if (!persistent) {
    return (
      <div className="banner warning">
        <h2>Nothing is being saved</h2>
        <p>
          IndexedDB is not available in this browser, so the score is only kept in memory. Reloading
          or closing the tab will lose the game.
        </p>
      </div>
    );
  }

  return null;
};

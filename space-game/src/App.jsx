import { useCallback, useState } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/HUD';
import PauseOverlay from './components/PauseOverlay';
import GameOverScreen from './components/GameOverScreen';
import { PLAYER } from './game/config';
import { loadHighScore, saveHighScore } from './game/storage';

const INITIAL_HUD = { score: 0, lives: PLAYER.lives, level: 1, status: 'playing' };

export default function App() {
  const [gameId, setGameId] = useState(0);
  const [hud, setHud] = useState(INITIAL_HUD);
  const [highScore, setHighScore] = useState(loadHighScore);
  const [isNewRecord, setIsNewRecord] = useState(false);

  const handleGameOver = useCallback((score) => {
    setHighScore((prev) => {
      if (score > prev) {
        saveHighScore(score);
        setIsNewRecord(true);
        return score;
      }
      setIsNewRecord(false);
      return prev;
    });
  }, []);

  const restart = () => {
    setHud(INITIAL_HUD);
    setIsNewRecord(false);
    setGameId((id) => id + 1); // GameCanvas yeniden kurulur → temiz oyun
  };

  return (
    <main className="app">
      <div className="game-frame">
        <GameCanvas key={gameId} onHudChange={setHud} onGameOver={handleGameOver} />
        <HUD score={hud.score} lives={hud.lives} level={hud.level} />
        {hud.status === 'paused' && <PauseOverlay />}
        {hud.status === 'gameover' && (
          <GameOverScreen score={hud.score} highScore={highScore} isNewRecord={isNewRecord} onRestart={restart} />
        )}
      </div>
      <p className="controls-hint">
        <kbd>←</kbd> <kbd>→</kbd> hareket · <kbd>SPACE</kbd> ateş · <kbd>P</kbd> duraklat
      </p>
    </main>
  );
}

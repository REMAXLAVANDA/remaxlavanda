import { useEffect, useRef } from 'react';
import { WORLD } from '../game/config';
import { createGameState, updateGame } from '../game/engine';
import { renderGame } from '../game/render';
import { createInputState, bindKeyboard } from '../game/input';

// Oyun döngüsünü çalıştırır. Durum React state'inde değil ref'te tutulur
// (60 FPS'te React render'ı tetiklememek için); HUD'a sadece değişen
// değerler bildirilir.
export default function GameCanvas({ onHudChange, onGameOver }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = WORLD.width * dpr;
    canvas.height = WORLD.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const state = createGameState();
    const input = createInputState();
    const unbind = bindKeyboard(input);
    if (import.meta.env.DEV) window.__game = { state, input };

    let last = performance.now();
    let rafId;
    let prevHud = '';
    let gameOverReported = false;

    const frame = (now) => {
      // Sekme arka plandayken büyük sıçramaları engelle
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      updateGame(state, input, dt);
      renderGame(ctx, state);

      const hudKey = `${state.score}|${state.lives}|${state.level}|${state.status}`;
      if (hudKey !== prevHud) {
        prevHud = hudKey;
        onHudChange({ score: state.score, lives: state.lives, level: state.level, status: state.status });
      }
      if (state.status === 'gameover' && !gameOverReported) {
        gameOverReported = true;
        onGameOver(state.score);
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      unbind();
    };
  }, [onHudChange, onGameOver]);

  return <canvas ref={canvasRef} className="game-canvas" />;
}

const KEY = 'spaceGame.highScore';

export function loadHighScore() {
  try {
    return Number(localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(score) {
  try {
    localStorage.setItem(KEY, String(score));
  } catch {
    // Gizli sekme vb. — skor kaydedilemezse oyun yine çalışır.
  }
}

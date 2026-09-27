// Tüm oyun ayarları tek yerde — denge değişiklikleri buradan yapılır.
export const WORLD = { width: 480, height: 720 };

export const PLAYER = {
  width: 44,
  height: 52,
  speed: 360, // px/sn
  fireCooldown: 0.22, // sn
  lives: 3,
  invulnerableTime: 1.6, // hasar sonrası dokunulmazlık (sn)
};

export const BULLET = { width: 4, height: 18, speed: 720 };

// Meteor tipleri: boyut, puan ve can (kaç mermide kırılır)
export const METEOR_TYPES = {
  small: { radius: 16, score: 30, hp: 1 },
  medium: { radius: 26, score: 20, hp: 2 },
  large: { radius: 40, score: 50, hp: 4 },
};

// Zorluk: seviye her LEVEL_DURATION saniyede bir artar.
export const DIFFICULTY = {
  levelDuration: 15,
  baseSpawnInterval: 1.1, // sn
  minSpawnInterval: 0.28,
  spawnIntervalStep: 0.09,
  baseSpeed: [90, 160],
  speedStepPerLevel: 22,
  largeMeteorFromLevel: 3,
};

export const STARFIELD_LAYERS = [
  { count: 70, speed: 18, size: 1, alpha: 0.45 },
  { count: 40, speed: 45, size: 1.5, alpha: 0.7 },
  { count: 18, speed: 90, size: 2, alpha: 1 },
];

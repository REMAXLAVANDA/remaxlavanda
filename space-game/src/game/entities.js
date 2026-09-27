import { WORLD, PLAYER, BULLET, METEOR_TYPES, DIFFICULTY, STARFIELD_LAYERS } from './config';

const rand = (min, max) => min + Math.random() * (max - min);

export function createPlayer() {
  return {
    x: WORLD.width / 2,
    y: WORLD.height - 80,
    width: PLAYER.width,
    height: PLAYER.height,
    cooldown: 0,
    invulnerable: 0,
    tilt: 0,
  };
}

export function createBullet(x, y) {
  return { x, y, width: BULLET.width, height: BULLET.height, dead: false };
}

// Düzensiz kenarlı kaya şekli: her köşe için yarıçap çarpanı
function makeShape(points) {
  return Array.from({ length: points }, () => rand(0.72, 1.08));
}

function makeCraters(radius) {
  const count = Math.floor(rand(2, 4));
  return Array.from({ length: count }, () => ({
    x: rand(-0.45, 0.45) * radius,
    y: rand(-0.45, 0.45) * radius,
    r: rand(0.12, 0.24) * radius,
  }));
}

const PALETTES = [
  { base: '#6b5d52', light: '#9a8a7c', dark: '#3a312b' },
  { base: '#5a5f6b', light: '#8a90a0', dark: '#2f323a' },
  { base: '#7a4f3a', light: '#b07a5c', dark: '#3f2519' },
];

function pickMeteorType(level) {
  const r = Math.random();
  if (level >= DIFFICULTY.largeMeteorFromLevel) {
    const largeChance = Math.min(0.12 + (level - DIFFICULTY.largeMeteorFromLevel) * 0.04, 0.35);
    if (r < largeChance) return 'large';
  }
  return r < 0.55 ? 'small' : 'medium';
}

export function createMeteor(level) {
  const typeKey = pickMeteorType(level);
  const type = METEOR_TYPES[typeKey];
  const [minSpeed, maxSpeed] = DIFFICULTY.baseSpeed;
  const bonus = (level - 1) * DIFFICULTY.speedStepPerLevel;
  // Büyük meteorlar biraz daha yavaş
  const sizeFactor = typeKey === 'large' ? 0.75 : typeKey === 'medium' ? 0.9 : 1;

  return {
    type: typeKey,
    x: rand(type.radius, WORLD.width - type.radius),
    y: -type.radius,
    radius: type.radius,
    vx: rand(-25, 25),
    vy: rand(minSpeed + bonus, maxSpeed + bonus) * sizeFactor,
    rotation: rand(0, Math.PI * 2),
    spin: rand(-1.4, 1.4),
    hp: type.hp,
    maxHp: type.hp,
    score: type.score,
    shape: makeShape(typeKey === 'large' ? 13 : 10),
    craters: makeCraters(type.radius),
    palette: PALETTES[Math.floor(Math.random() * PALETTES.length)],
    hitFlash: 0,
    dead: false,
  };
}

export function createExplosion(x, y, radius, color = '#ffb347') {
  const count = Math.round(radius * 0.8) + 8;
  return Array.from({ length: count }, () => {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(40, 220);
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(0.35, 0.8),
      maxLife: 0.8,
      size: rand(1.5, 3.5),
      color,
    };
  });
}

export function createStarfield() {
  return STARFIELD_LAYERS.flatMap((layer) =>
    Array.from({ length: layer.count }, () => ({
      x: rand(0, WORLD.width),
      y: rand(0, WORLD.height),
      speed: layer.speed,
      size: layer.size,
      alpha: layer.alpha,
      twinkle: rand(0, Math.PI * 2),
    })),
  );
}

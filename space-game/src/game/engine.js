// Oyun motoru: saf durum + update. React'ten ve çizimden bağımsız.
import { WORLD, PLAYER, BULLET, DIFFICULTY } from './config';
import { createPlayer, createBullet, createMeteor, createExplosion, createStarfield } from './entities';

export function createGameState() {
  return {
    status: 'playing', // 'playing' | 'paused' | 'gameover'
    time: 0,
    level: 1,
    score: 0,
    lives: PLAYER.lives,
    spawnTimer: 0.6,
    shake: 0,
    player: createPlayer(),
    bullets: [],
    meteors: [],
    particles: [],
    stars: createStarfield(),
  };
}

function circleRectHit(cx, cy, r, rect) {
  const nx = Math.max(rect.x - rect.width / 2, Math.min(cx, rect.x + rect.width / 2));
  const ny = Math.max(rect.y - rect.height / 2, Math.min(cy, rect.y + rect.height / 2));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function spawnInterval(level) {
  return Math.max(
    DIFFICULTY.minSpawnInterval,
    DIFFICULTY.baseSpawnInterval - (level - 1) * DIFFICULTY.spawnIntervalStep,
  );
}

function updateStars(state, dt) {
  for (const s of state.stars) {
    s.y += s.speed * dt;
    s.twinkle += dt * 3;
    if (s.y > WORLD.height) {
      s.y -= WORLD.height;
      s.x = Math.random() * WORLD.width;
    }
  }
}

function updateParticles(state, dt) {
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}

function updatePlayer(state, input, dt) {
  const p = state.player;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  p.x += dir * PLAYER.speed * dt;
  p.x = Math.max(p.width / 2, Math.min(WORLD.width - p.width / 2, p.x));
  // Hareket yönüne hafif yatış (görsel)
  p.tilt += (dir * 0.25 - p.tilt) * Math.min(1, dt * 10);

  p.cooldown -= dt;
  p.invulnerable = Math.max(0, p.invulnerable - dt);

  if (input.fire && p.cooldown <= 0) {
    state.bullets.push(createBullet(p.x, p.y - p.height / 2));
    p.cooldown = PLAYER.fireCooldown;
  }
}

function damagePlayer(state) {
  const p = state.player;
  state.lives -= 1;
  p.invulnerable = PLAYER.invulnerableTime;
  state.shake = 0.35;
  state.particles.push(...createExplosion(p.x, p.y, 30, '#5ad7ff'));
  if (state.lives <= 0) {
    state.status = 'gameover';
    state.particles.push(...createExplosion(p.x, p.y, 60, '#ff6a3d'));
  }
}

export function updateGame(state, input, dt) {
  // Duraklatma tuşu tek seferlik olay olarak tüketilir
  if (input.pausePressed) {
    input.pausePressed = false;
    if (state.status === 'playing') state.status = 'paused';
    else if (state.status === 'paused') state.status = 'playing';
  }

  if (state.status === 'paused') return;

  // Game over sonrası arka plan ve patlamalar akmaya devam eder
  updateStars(state, dt);
  updateParticles(state, dt);
  state.shake = Math.max(0, state.shake - dt);
  if (state.status === 'gameover') return;

  state.time += dt;
  state.level = 1 + Math.floor(state.time / DIFFICULTY.levelDuration);

  updatePlayer(state, input, dt);

  // Mermiler
  for (const b of state.bullets) {
    b.y -= BULLET.speed * dt;
    if (b.y < -b.height) b.dead = true;
  }

  // Meteor üretimi
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    state.meteors.push(createMeteor(state.level));
    state.spawnTimer = spawnInterval(state.level) * (0.6 + Math.random() * 0.8);
  }

  // Meteor hareketi
  for (const m of state.meteors) {
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.rotation += m.spin * dt;
    m.hitFlash = Math.max(0, m.hitFlash - dt);
    if (m.x < m.radius || m.x > WORLD.width - m.radius) m.vx *= -1;
    if (m.y - m.radius > WORLD.height) m.dead = true;
  }

  // Mermi ↔ meteor
  for (const m of state.meteors) {
    if (m.dead) continue;
    for (const b of state.bullets) {
      if (b.dead) continue;
      if (circleRectHit(m.x, m.y, m.radius, b)) {
        b.dead = true;
        m.hp -= 1;
        m.hitFlash = 0.08;
        if (m.hp <= 0) {
          m.dead = true;
          state.score += m.score;
          state.particles.push(...createExplosion(m.x, m.y, m.radius));
        }
        break;
      }
    }
  }

  // Gemi ↔ meteor (hitbox görselden biraz küçük — daha adil hissettirir)
  const p = state.player;
  if (p.invulnerable <= 0) {
    const hitbox = { x: p.x, y: p.y + 4, width: p.width * 0.6, height: p.height * 0.7 };
    for (const m of state.meteors) {
      if (!m.dead && circleRectHit(m.x, m.y, m.radius * 0.85, hitbox)) {
        m.dead = true;
        state.particles.push(...createExplosion(m.x, m.y, m.radius));
        damagePlayer(state);
        break;
      }
    }
  }

  state.bullets = state.bullets.filter((b) => !b.dead);
  state.meteors = state.meteors.filter((m) => !m.dead);
}

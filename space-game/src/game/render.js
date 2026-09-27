// Çizim katmanı: sadece durumu okur, değiştirmez.
import { WORLD } from './config';

function drawBackground(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  g.addColorStop(0, '#05030f');
  g.addColorStop(0.6, '#0a0a24');
  g.addColorStop(1, '#130a2a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  // Hafif nebula
  const n = ctx.createRadialGradient(WORLD.width * 0.75, WORLD.height * 0.3, 0, WORLD.width * 0.75, WORLD.height * 0.3, 260);
  n.addColorStop(0, 'rgba(120, 60, 200, 0.12)');
  n.addColorStop(1, 'rgba(120, 60, 200, 0)');
  ctx.fillStyle = n;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
}

function drawStars(ctx, stars) {
  ctx.fillStyle = '#fff';
  for (const s of stars) {
    ctx.globalAlpha = s.alpha * (0.75 + Math.sin(s.twinkle) * 0.25);
    // Hızlı yıldızlar hafif uzun çizgi — hareket hissi
    const len = s.speed > 60 ? s.size * 3 : s.size;
    ctx.fillRect(s.x, s.y, s.size, len);
  }
  ctx.globalAlpha = 1;
}

function drawShip(ctx, player, time) {
  const { x, y, width: w, height: h, invulnerable, tilt } = player;
  // Hasar sonrası yanıp sönme
  if (invulnerable > 0 && Math.floor(invulnerable * 12) % 2 === 0) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt * 0.35);

  // Motor alevi
  const flicker = 0.8 + Math.sin(time * 40) * 0.12 + Math.random() * 0.1;
  const flameH = 26 * flicker;
  const flame = ctx.createLinearGradient(0, h / 2 - 6, 0, h / 2 + flameH);
  flame.addColorStop(0, 'rgba(255,255,255,0.95)');
  flame.addColorStop(0.3, 'rgba(90,215,255,0.9)');
  flame.addColorStop(1, 'rgba(60,80,255,0)');
  ctx.fillStyle = flame;
  ctx.shadowColor = '#5ad7ff';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(-7, h / 2 - 8);
  ctx.quadraticCurveTo(0, h / 2 + flameH, 7, h / 2 - 8);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Kanatlar
  ctx.fillStyle = '#2a3350';
  ctx.strokeStyle = '#5ad7ff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2 + 14);
  ctx.lineTo(w / 2, h / 2 - 4);
  ctx.lineTo(w / 2 - 8, h / 2);
  ctx.lineTo(-w / 2 + 8, h / 2);
  ctx.lineTo(-w / 2, h / 2 - 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Gövde
  const body = ctx.createLinearGradient(-10, 0, 10, 0);
  body.addColorStop(0, '#8b97b8');
  body.addColorStop(0.5, '#e8ecf7');
  body.addColorStop(1, '#8b97b8');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.quadraticCurveTo(11, -h / 6, 10, h / 2 - 6);
  ctx.lineTo(-10, h / 2 - 6);
  ctx.quadraticCurveTo(-11, -h / 6, 0, -h / 2);
  ctx.fill();

  // Kokpit
  const glass = ctx.createLinearGradient(0, -h / 4, 0, 0);
  glass.addColorStop(0, '#9ff0ff');
  glass.addColorStop(1, '#1b6c9a');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.ellipse(0, -h / 8, 4.5, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Kanat uçlarında ışıklar
  ctx.fillStyle = '#ff4d6d';
  ctx.shadowColor = '#ff4d6d';
  ctx.shadowBlur = 8;
  ctx.fillRect(-w / 2 + 1, h / 2 - 7, 3, 3);
  ctx.fillRect(w / 2 - 4, h / 2 - 7, 3, 3);
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawBullets(ctx, bullets) {
  ctx.save();
  ctx.shadowColor = '#ff3df2';
  ctx.shadowBlur = 14;
  for (const b of bullets) {
    const g = ctx.createLinearGradient(0, b.y - b.height / 2, 0, b.y + b.height / 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, '#ff8af5');
    g.addColorStop(1, 'rgba(255,61,242,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height, 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMeteor(ctx, m) {
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(m.rotation);

  const pts = m.shape.length;
  ctx.beginPath();
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const r = m.radius * m.shape[i];
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();

  const g = ctx.createRadialGradient(-m.radius * 0.35, -m.radius * 0.35, m.radius * 0.1, 0, 0, m.radius * 1.1);
  g.addColorStop(0, m.palette.light);
  g.addColorStop(0.55, m.palette.base);
  g.addColorStop(1, m.palette.dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  for (const c of m.craters) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (m.hitFlash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,200,150,0.6)';
    ctx.beginPath();
    ctx.arc(0, 0, m.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles(ctx, particles) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDamageVignette(ctx, player) {
  if (player.invulnerable <= 0) return;
  const t = player.invulnerable;
  const g = ctx.createRadialGradient(WORLD.width / 2, WORLD.height / 2, WORLD.height * 0.3, WORLD.width / 2, WORLD.height / 2, WORLD.height * 0.75);
  g.addColorStop(0, 'rgba(255,0,60,0)');
  g.addColorStop(1, `rgba(255,0,60,${Math.min(0.35, t * 0.25)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
}

export function renderGame(ctx, state) {
  ctx.save();
  if (state.shake > 0) {
    const s = state.shake * 18;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawBackground(ctx);
  drawStars(ctx, state.stars);
  drawBullets(ctx, state.bullets);
  for (const m of state.meteors) drawMeteor(ctx, m);
  if (state.status !== 'gameover') drawShip(ctx, state.player, state.time);
  drawParticles(ctx, state.particles);
  ctx.restore();
  drawDamageVignette(ctx, state.player);
}

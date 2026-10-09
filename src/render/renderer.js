// 渲染层：把世界状态画到 Canvas。只读 world，绝不修改。
// 位置使用 prev→current 插值，因此在 120Hz 屏幕上依然顺滑（模拟仍是固定 60Hz）。

import { ARENA, COLORS, ENEMIES, PLAYER } from '../sim/constants.js';
import { lerp, clamp } from '../core/math.js';

const TAU = Math.PI * 2;
const BULLET_ENEMY_GLOW = 'rgba(255,159,67,0.28)';

function polygon(ctx, x, y, r, sides, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * TAU;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dpr = 1;
    this.time = 0;
  }

  resize(cam) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const need = this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr);
    if (need) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    this.dpr = dpr;
    cam.resize(w, h, dpr);
    return need;
  }

  render(world, cam, fx, alpha, dt) {
    this.time += dt;
    const ctx = this.ctx;
    const { cssW: W, cssH: H } = cam;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    cam.apply(ctx);
    const vp = cam.viewport();

    this.drawGrid(ctx, vp);
    this.drawArenaEdge(ctx);

    fx.drawTrails(ctx);
    fx.drawMarks(ctx);

    this.drawOrbs(ctx, world, vp, alpha);
    this.drawBullets(ctx, world, vp, alpha);
    this.drawEnemies(ctx, world, vp, alpha);
    this.drawPlayer(ctx, world, alpha);
    fx.draw(ctx);

    ctx.restore();

    this.drawOffscreenThreats(ctx, world, cam, vp);

    this.drawVignette(ctx, W, H);
  }

  // ---------------------------------------------------------------- 背景

  drawGrid(ctx, vp) {
    const step = 100;
    const x0 = Math.floor(vp.x0 / step) * step;
    const y0 = Math.floor(vp.y0 / step) * step;
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLORS.grid;
    ctx.beginPath();
    for (let x = x0; x <= vp.x1; x += step) {
      ctx.moveTo(x, vp.y0);
      ctx.lineTo(x, vp.y1);
    }
    for (let y = y0; y <= vp.y1; y += step) {
      ctx.moveTo(vp.x0, y);
      ctx.lineTo(vp.x1, y);
    }
    ctx.stroke();

    // 每 500 单位加粗，提供空间参照（硬核射击靠走位，参照物很重要）
    ctx.strokeStyle = COLORS.gridBold;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const bx0 = Math.floor(vp.x0 / 500) * 500;
    const by0 = Math.floor(vp.y0 / 500) * 500;
    for (let x = bx0; x <= vp.x1; x += 500) {
      ctx.moveTo(x, vp.y0);
      ctx.lineTo(x, vp.y1);
    }
    for (let y = by0; y <= vp.y1; y += 500) {
      ctx.moveTo(vp.x0, y);
      ctx.lineTo(vp.x1, y);
    }
    ctx.stroke();
  }

  drawArenaEdge(ctx) {
    ctx.save();
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 12]);
    ctx.lineDashOffset = -this.time * 30;
    ctx.strokeRect(0, 0, ARENA.w, ARENA.h);
    ctx.restore();
  }

  drawVignette(ctx, W, H) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ---------------------------------------------------------------- 实体

  drawOrbs(ctx, world, vp, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const o of world.orbs) {
      if (o.x < vp.x0 || o.x > vp.x1 || o.y < vp.y0 || o.y > vp.y1) continue;
      const x = lerp(o.px, o.x, alpha);
      const y = lerp(o.py, o.y, alpha);
      const pulse = 0.75 + Math.sin((this.time + o.id) * 6) * 0.25;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#7cf6d8';
      ctx.beginPath();
      ctx.arc(x, y, 12 * pulse, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#dfffef';
      polygon(ctx, x, y, 4.5 * pulse, 4, this.time * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawBullets(ctx, world, vp, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of world.bullets) {
      if (b.x < vp.x0 || b.x > vp.x1 || b.y < vp.y0 || b.y > vp.y1) continue;
      const x = lerp(b.px, b.x, alpha);
      const y = lerp(b.py, b.y, alpha);
      const a = Math.atan2(b.vy, b.vx);
      if (b.owner === 'player') {
        const len = b.radius * (b.crit ? 4.6 : 3.4);
        ctx.globalAlpha = 0.85;
        ctx.strokeStyle = b.color;
        ctx.lineCap = 'round';
        ctx.lineWidth = b.radius * (b.crit ? 1.9 : 1.3);
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(a) * len, y - Math.sin(a) * len);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = b.crit ? '#ffffff' : b.color;
        ctx.beginPath();
        ctx.arc(x, y, b.radius * 0.62, 0, TAU);
        ctx.fill();
      } else {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = BULLET_ENEMY_GLOW;
        ctx.beginPath();
        ctx.arc(x, y, b.radius * 2.4, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = COLORS.enemyBullet;
        ctx.beginPath();
        ctx.arc(x, y, b.radius, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#2a1105';
        ctx.beginPath();
        ctx.arc(x, y, b.radius * 0.42, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawEnemies(ctx, world, vp, alpha) {
    const p = world.players.find((pl) => pl.alive) || world.players[0];
    for (const e of world.enemies) {
      if (e.x < vp.x0 || e.x > vp.x1 || e.y < vp.y0 || e.y > vp.y1) continue;
      const x = lerp(e.px, e.x, alpha);
      const y = lerp(e.py, e.y, alpha);
      const r = e.radius;
      const face = p ? Math.atan2(p.y - y, p.x - x) : 0;
      const hit = e.hitFlash;
      const spawnScale = e.spawnAnim > 0 ? 1 - (e.spawnAnim / 0.35) * 0.45 : 1;
      const rr = r * spawnScale;

      ctx.save();
      ctx.translate(x, y);

      // 蓄力预告（突进者）
      if (e.state === 'telegraph') {
        ctx.save();
        ctx.globalAlpha = 0.35 + e.telegraph * 0.5;
        ctx.strokeStyle = '#ff3fa4';
        ctx.lineWidth = 3;
        ctx.setLineDash([14, 9]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(e.dirX * 460, e.dirY * 460);
        ctx.stroke();
        ctx.restore();
      }

      ctx.rotate(face);

      if (e.elite) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, rr + 7, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }

      const body = hit > 0.02 ? '#ffffff' : e.color;
      this.drawEnemyShape(ctx, e, rr, body);

      // 血条（受伤后才出现，避免屏幕噪音）
      if (e.hp < e.maxHp - 0.01) {
        ctx.rotate(-face);
        const w = rr * 2.2;
        const hp = clamp(e.hp / e.maxHp, 0, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(-w / 2, -rr - 13, w, 4);
        ctx.fillStyle = e.elite ? '#ffd166' : '#ff5d6c';
        ctx.fillRect(-w / 2, -rr - 13, w * hp, 4);
      }

      ctx.restore();
    }
  }

  drawEnemyShape(ctx, e, r, body) {
    const def = ENEMIES[e.type];
    switch (e.type) {
      case 'grunt':
        polygon(ctx, 0, 0, r, 3, 0);
        ctx.fillStyle = body;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;

      case 'shooter':
        polygon(ctx, 0, 0, r, 4, 0);
        ctx.fillStyle = body;
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(r * 0.3, -2.5, r * 1.1, 5);
        ctx.strokeStyle = body;
        ctx.lineWidth = 2;
        ctx.strokeRect(r * 0.3, -2.5, r * 1.1, 5);
        break;

      case 'charger': {
        const t = e.state === 'telegraph' ? 1 + e.telegraph * 0.35 : 1;
        ctx.beginPath();
        ctx.moveTo(r * 1.45 * t, 0);
        ctx.lineTo(-r * 0.75, -r);
        ctx.lineTo(-r * 0.2, 0);
        ctx.lineTo(-r * 0.75, r);
        ctx.closePath();
        ctx.fillStyle = body;
        ctx.fill();
        break;
      }

      case 'splitter':
        polygon(ctx, 0, 0, r, 6, Math.PI / 6);
        ctx.fillStyle = body;
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        polygon(ctx, 0, 0, r * 0.5, 6, Math.PI / 6);
        ctx.fill();
        ctx.strokeStyle = body;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;

      case 'tank':
        polygon(ctx, 0, 0, r, 8, Math.PI / 8);
        ctx.fillStyle = body;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 3;
        polygon(ctx, 0, 0, r * 0.62, 8, Math.PI / 8);
        ctx.stroke();
        break;

      case 'boss': {
        const rot = this.time * 0.7;
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 4;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(0, 0, r + 16 + k * 13, rot + k, rot + k + 2.1);
          ctx.stroke();
        }
        ctx.restore();
        polygon(ctx, 0, 0, r, 6, rot * 0.5);
        ctx.fillStyle = e.phase === 3 ? '#ff6b81' : body;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.3 * (1 + Math.sin(this.time * 5) * 0.12), 0, TAU);
        ctx.fill();
        break;
      }

      default:
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, TAU);
        ctx.fill();
        break;
    }
  }

  drawPlayer(ctx, world, alpha) {
    for (const p of world.players) {
      if (!p.alive) continue;
      const x = lerp(p.px, p.x, alpha);
      const y = lerp(p.py, p.y, alpha);
      const r = p.radius;
      const blink = p.invuln > 0 && Math.floor(p.invuln * 22) % 2 === 0;

      ctx.save();
      ctx.translate(x, y);

      // 地面光圈
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = COLORS.player;
      ctx.beginPath();
      ctx.arc(0, 0, r * 2.6, 0, TAU);
      ctx.fill();
      ctx.restore();

      // 瞄准方向楔形
      const facing = Math.atan2(p.aimY, p.aimX);
      ctx.save();
      ctx.rotate(facing);
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = COLORS.aim;
      ctx.beginPath();
      ctx.moveTo(r + 16, 0);
      ctx.lineTo(r + 4, -5.5);
      ctx.lineTo(r + 4, 5.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 枪口火焰
      if (p.muzzle > 0.02) {
        ctx.save();
        ctx.rotate(facing);
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = p.muzzle;
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath();
        ctx.arc(r + PLAYER.muzzleOffset + 4, 0, 7 + p.muzzle * 9, 0, TAU);
        ctx.fill();
        ctx.restore();
      }

      // 本体
      ctx.globalAlpha = blink ? 0.35 : 1;
      ctx.fillStyle = p.hurtSlow > 0 ? '#ff8fa0' : COLORS.player;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = COLORS.playerCore;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.42, 0, TAU);
      ctx.fill();

      // 冲刺充能：环绕小点
      const dashMax = Math.max(1, p.dashMax);
      for (let i = 0; i < dashMax; i++) {
        const a = -Math.PI / 2 + (i / dashMax) * TAU;
        const filled = i < p.dashCharges;
        ctx.globalAlpha = filled ? 0.95 : 0.22;
        ctx.fillStyle = filled ? '#8ff6ff' : '#5a7a92';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * (r + 9), Math.sin(a) * (r + 9), 3.2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------- 离屏威胁指示

  drawOffscreenThreats(ctx, world, cam, vp) {
    const W = cam.cssW;
    const H = cam.cssH;
    const inset = 26;
    let shown = 0;
    ctx.save();
    for (const e of world.enemies) {
      if (shown >= 14) break;
      if (e.x >= vp.x0 && e.x <= vp.x1 && e.y >= vp.y0 && e.y <= vp.y1) continue;
      const s = cam.worldToScreen(e.x, e.y);
      const cx = W / 2;
      const cy = H / 2;
      const dx = s.x - cx;
      const dy = s.y - cy;
      const a = Math.atan2(dy, dx);
      const rx = W / 2 - inset;
      const ry = H / 2 - inset;
      const t = Math.min(Math.abs(rx / (Math.cos(a) || 1e-6)), Math.abs(ry / (Math.sin(a) || 1e-6)));
      const px = cx + Math.cos(a) * t;
      const py = cy + Math.sin(a) * t;
      const big = e.type === 'boss';
      ctx.globalAlpha = big ? 1 : 0.6;
      ctx.fillStyle = big ? '#ff2d55' : e.color;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a);
      const sz = big ? 13 : 8;
      ctx.beginPath();
      ctx.moveTo(sz, 0);
      ctx.lineTo(-sz * 0.6, -sz * 0.7);
      ctx.lineTo(-sz * 0.6, sz * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      shown++;
    }
    ctx.restore();
  }
}
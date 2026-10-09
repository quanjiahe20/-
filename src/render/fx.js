// 表现层特效系统：只消费模拟层抛出的「事件」，自己维护粒子/环/文字。
//
// 这一层是刻意的单向依赖：sim → events → fx。
// 所以粒子永远不会影响模拟结果，联机时各端表现可以不同而不产生分歧。
// 也正因为如此，这里可以自由使用 Math.random()。

import { clamp } from '../core/math.js';

const MAX_PARTS = 620;
const MAX_TEXTS = 40;

export class Fx {
  constructor() {
    this.parts = [];
    this.rings = [];
    this.texts = [];
    this.marks = [];
    this.trails = [];
    this.flash = 0;
    this.rand = Math.random;
  }

  // ------------------------------------------------------------ 事件入口

  handleEvents(events, cam) {
    for (const ev of events) {
      switch (ev.type) {
        case 'shoot':
          this.muzzle(ev);
          if (ev.shake) cam.addShake(ev.shake);
          break;
        case 'enemyHit':
          this.burst(ev.x, ev.y, ev.crit ? 9 : 4, {
            color: ev.color,
            speed: ev.crit ? 260 : 150,
            size: ev.crit ? 3.6 : 2.4,
            life: 0.3,
          });
          if (ev.crit) {
            this.text(ev.x, ev.y - 12, Math.round(ev.amount), '#ffd166', 20);
          }
          break;
        case 'enemyKill':
          this.burst(ev.x, ev.y, ev.boss ? 60 : 14, {
            color: ev.color,
            speed: ev.boss ? 480 : 230,
            size: ev.boss ? 5 : 3,
            life: ev.boss ? 1.1 : 0.5,
          });
          this.ring(ev.x, ev.y, ev.radius * (ev.boss ? 7 : 3.4), ev.color, ev.boss ? 0.7 : 0.32);
          if (ev.boss) {
            cam.addShake(14);
            this.flash = Math.max(this.flash, 0.5);
          }
          break;
        case 'playerHurt':
          this.burst(ev.x, ev.y, 14, { color: '#ff4d6d', speed: 260, size: 3.4, life: 0.45 });
          this.text(ev.x, ev.y - 18, `-${Math.round(ev.amount)}`, '#ff4d6d', 22);
          this.flash = Math.min(1, this.flash + 0.5);
          cam.addShake(7);
          break;
        case 'heal':
          this.text(ev.x, ev.y - 22, `+${Math.round(ev.amount)}`, '#7cf6d8', 18);
          break;
        case 'dash':
          this.trails.push({ x: ev.x, y: ev.y, life: 0.28, max: 0.28 });
          this.burst(ev.x, ev.y, 12, { color: '#7cf6d8', speed: 210, size: 2.8, life: 0.4 });
          break;
        case 'explosion':
          this.ring(ev.x, ev.y, ev.radius, ev.color, 0.34);
          this.burst(ev.x, ev.y, 18, { color: ev.color, speed: 340, size: 3.6, life: 0.5 });
          cam.addShake(4);
          break;
        case 'shockwave':
          this.ring(ev.x, ev.y, ev.radius, ev.color, 0.42, 6);
          cam.addShake(5);
          break;
        case 'levelUp':
          this.ring(ev.x, ev.y, 150, '#ffd166', 0.6, 5);
          this.burst(ev.x, ev.y, 26, { color: '#ffd166', speed: 300, size: 3.2, life: 0.8 });
          break;
        case 'enemySpawn':
          this.marks.push({ x: ev.x, y: ev.y, r: ev.radius, life: 0.55, max: 0.55, elite: ev.elite, boss: ev.boss });
          break;
        case 'chargeGo':
          this.trails.push({ x: ev.x, y: ev.y, life: 0.4, max: 0.4, color: '#ff3fa4' });
          cam.addShake(2.5);
          break;
        case 'bossFire':
          this.ring(ev.x, ev.y, 130, '#ff2d55', 0.3, 3);
          break;
        default:
          break;
      }
    }
  }

  muzzle(ev) {
    const n = ev.weapon === 'shotgun' ? 12 : ev.weapon === 'railgun' ? 10 : 5;
    for (let i = 0; i < n; i++) {
      const a = ev.angle + (this.rand() * 2 - 1) * 0.5;
      const sp = 180 + this.rand() * 220;
      this.push({
        x: ev.x,
        y: ev.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.16,
        max: 0.16,
        size: 2.6 + this.rand() * 2.4,
        color: ev.color,
        drag: 5,
      });
    }
  }

  // ------------------------------------------------------------ 基元

  push(p) {
    if (this.parts.length >= MAX_PARTS) return;
    p.drag = p.drag ?? 3;
    this.parts.push(p);
  }

  burst(x, y, count, o = {}) {
    const speed = o.speed ?? 200;
    const size = o.size ?? 3;
    const life = o.life ?? 0.4;
    for (let i = 0; i < count; i++) {
      const a = this.rand() * Math.PI * 2;
      const sp = speed * (0.35 + this.rand() * 0.65);
      this.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: life * (0.6 + this.rand() * 0.6),
        max: life,
        size: size * (0.6 + this.rand() * 0.7),
        color: o.color,
        drag: o.drag ?? 3.2,
      });
    }
  }

  ring(x, y, maxR, color, life = 0.35, width = 3) {
    this.rings.push({ x, y, r: maxR * 0.2, maxR, life, max: life, color, width });
  }

  text(x, y, value, color, size = 18) {
    if (this.texts.length >= MAX_TEXTS) this.texts.shift();
    this.texts.push({
      x,
      y,
      vx: (this.rand() * 2 - 1) * 26,
      vy: -70,
      value,
      color,
      size,
      life: 0.75,
      max: 0.75,
    });
  }

  // ------------------------------------------------------------ 更新

  update(dt) {
    const parts = this.parts;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        parts.splice(i, 1);
        continue;
      }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k;
      p.vy *= k;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.marks.length - 1; i >= 0; i--) {
      const m = this.marks[i];
      m.life -= dt;
      if (m.life <= 0) this.marks.splice(i, 1);
    }
    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.life -= dt;
      if (t.life <= 0) this.trails.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.texts.splice(i, 1);
        continue;
      }
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.vy += 130 * dt;
    }

    this.flash = Math.max(0, this.flash - dt * 2.6);
  }

  // ------------------------------------------------------------ 绘制（世界坐标）

  drawMarks(ctx) {
    for (const m of this.marks) {
      const t = 1 - m.life / m.max;
      const r = m.r * (2.6 - 1.6 * t);
      ctx.save();
      ctx.globalAlpha = clamp(m.life / m.max, 0, 1) * 0.9;
      ctx.strokeStyle = m.boss ? '#ff2d55' : m.elite ? '#ffd166' : '#ff7a8a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha *= 0.4;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * 0.6 * t, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawTrails(ctx) {
    for (const t of this.trails) {
      const a = t.life / t.max;
      ctx.save();
      ctx.globalAlpha = a * 0.45;
      ctx.fillStyle = t.color || '#7cf6d8';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 22 * a, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 冲击环
    for (const r of this.rings) {
      const t = 1 - r.life / r.max;
      const rad = r.r + (r.maxR - r.r) * t;
      ctx.globalAlpha = (r.life / r.max) * 0.85;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - t * 0.6);
      ctx.beginPath();
      ctx.arc(r.x, r.y, rad, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 粒子
    for (const p of this.parts) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // 伤害数字
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const a = clamp(t.life / t.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = `700 ${t.size}px ui-monospace, Menlo, monospace`;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillText(t.value, t.x + 1.5, t.y + 1.5);
      ctx.fillStyle = t.color;
      ctx.fillText(t.value, t.x, t.y);
    }
    ctx.restore();
  }

  clear() {
    this.parts.length = 0;
    this.rings.length = 0;
    this.texts.length = 0;
    this.marks.length = 0;
    this.trails.length = 0;
    this.flash = 0;
  }
}
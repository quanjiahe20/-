// HUD 与菜单：全部用 Canvas 绘制。
// 选择 Canvas 而非 DOM 的原因：全屏游戏里 DOM 层的滚动/缩放/安全区问题在
// 移动端浏览器上非常难缠，Canvas 画 UI 反而更可控（代价是要自己做命中测试）。

import { clamp } from '../core/math.js';
import { WEAPONS, COLORS } from '../sim/constants.js';
import { RARITY, UPGRADE_BY_ID } from '../sim/upgrades.js';

const FONT = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
const MONO = 'ui-monospace, Menlo, Consolas, monospace';

/** 结算页内容更多，按钮要往下挪，避免和统计数字打架 */
export const GAMEOVER_BTN_Y = 0.66;

function uiScale(W, H) {
  return clamp(Math.min(W, H) / 430, 0.82, 1.7);
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// ---------------------------------------------------------------- 布局（供命中测试复用）

export function upgradeRects(W, H, count) {
  if (count <= 0) return [];
  const horizontal = W / H > 1.05;
  if (horizontal) {
    const cw = clamp(W * 0.26, 150, 320);
    const ch = clamp(H * 0.6, 180, 420);
    const gap = cw * 0.055;
    const total = count * cw + (count - 1) * gap;
    const x0 = (W - total) / 2;
    const y = (H - ch) / 2 + H * 0.045;
    return Array.from({ length: count }, (_, i) => ({ x: x0 + i * (cw + gap), y, w: cw, h: ch }));
  }
  const cw = clamp(W * 0.88, 200, 470);
  const ch = clamp(H * 0.19, 80, 150);
  const gap = ch * 0.16;
  const total = count * ch + (count - 1) * gap;
  const y0 = (H - total) / 2 + H * 0.035;
  return Array.from({ length: count }, (_, i) => ({ x: (W - cw) / 2, y: y0 + i * (ch + gap), w: cw, h: ch }));
}

export function buttonRects(W, H, yFactor = 0.58) {
  const s = uiScale(W, H);
  const w = clamp(W * 0.3, 180, 320);
  const h = 52 * s;
  const cx = W / 2;
  const primary = { x: cx - w / 2, y: H * yFactor, w, h };
  return {
    primary,
    secondary: { x: cx - w / 2 * 0.78, y: primary.y + h * 1.45, w: w * 0.78, h: h * 0.82 },
  };
}

// ---------------------------------------------------------------- HUD

export function drawHud(ctx, world, cam, dt, opts = {}) {
  const W = cam.cssW;
  const H = cam.cssH;
  const s = uiScale(W, H);
  const p = world.players[0];
  if (!p) return;

  ctx.save();
  ctx.textBaseline = 'middle';

  // ---- 顶部经验条 ----
  const xpRatio = clamp(p.xp / p.xpNeed, 0, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(0, 0, W, 4 * s);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(0, 0, W * xpRatio, 4 * s);
  ctx.fillStyle = 'rgba(255,209,102,0.25)';
  ctx.fillRect(0, 0, W * xpRatio, 4 * s);

  // ---- 左上：生命 / 冲刺 / 武器 ----
  const pad = 14 * s;
  const barW = clamp(W * 0.26, 140, 300);
  const barH = 15 * s;
  const hpRatio = clamp(p.hp / p.maxHp, 0, 1);
  const low = hpRatio < 0.34;

  ctx.fillStyle = 'rgba(8,14,24,0.72)';
  roundRect(ctx, pad - 6 * s, pad - 6 * s, barW + 12 * s, barH + 12 * s, 6 * s);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  roundRect(ctx, pad, pad, barW, barH, 4 * s);
  ctx.fill();

  const hpColor = low ? '#ff4d6d' : '#7cf6d8';
  ctx.fillStyle = hpColor;
  roundRect(ctx, pad, pad, Math.max(2, barW * hpRatio), barH, 4 * s);
  ctx.fill();

  // 低血量脉冲描边
  if (low && p.alive) {
    const pulse = 0.35 + Math.sin(performance.now() / 180) * 0.3;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = '#ff4d6d';
    ctx.lineWidth = 3 * s;
    roundRect(ctx, pad - 3 * s, pad - 3 * s, barW + 6 * s, barH + 6 * s, 6 * s);
    ctx.stroke();
    ctx.restore();
  }

  ctx.font = `700 ${12 * s}px ${MONO}`;
  ctx.fillStyle = '#04121a';
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}`, pad + 8 * s, pad + barH / 2 + 0.5);

  // 冲刺充能
  let cy = pad + barH + 16 * s;
  const pipR = 5.5 * s;
  for (let i = 0; i < Math.max(1, p.dashMax); i++) {
    const ready = i < p.dashCharges;
    ctx.beginPath();
    ctx.arc(pad + pipR + i * (pipR * 2.6), cy, pipR, 0, Math.PI * 2);
    ctx.fillStyle = ready ? '#8ff6ff' : 'rgba(140,170,200,0.22)';
    ctx.fill();
    if (!ready && i === p.dashCharges) {
      const prog = 1 - clamp(p.dashCd / (p.dashCd + 0.0001), 0, 1);
      ctx.strokeStyle = '#8ff6ff';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.arc(pad + pipR + i * (pipR * 2.6), cy, pipR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
      ctx.stroke();
    }
  }

  // 武器与弹药
  cy += 20 * s;
  const wdef = WEAPONS[p.weapon];
  ctx.font = `600 ${13 * s}px ${FONT}`;
  ctx.fillStyle = wdef.color;
  ctx.fillText(wdef.name, pad, cy);
  const nameW = ctx.measureText(wdef.name).width;
  ctx.font = `700 ${13 * s}px ${MONO}`;
  ctx.fillStyle = p.reloading > 0 ? '#ffd166' : p.ammo > 0 ? '#dff3ff' : '#ff4d6d';
  const ammoText = p.reloading > 0 ? '换弹中…' : `${p.ammo} / ${p.magSize}`;
  ctx.fillText(ammoText, pad + nameW + 12 * s, cy);

  // 换弹进度条
  if (p.reloading > 0) {
    const w2 = 96 * s;
    const prog = 1 - p.reloading / Math.max(0.01, p.reloadingTotal || 1);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, pad, cy + 12 * s, w2, 4 * s, 2 * s);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    roundRect(ctx, pad, cy + 12 * s, w2 * clamp(prog, 0, 1), 4 * s, 2 * s);
    ctx.fill();
  }

  // ---- 顶部中间：波次 ----
  ctx.textAlign = 'center';
  ctx.font = `700 ${17 * s}px ${FONT}`;
  ctx.fillStyle = COLORS.text;
  ctx.fillText(world.wave > 0 ? `第 ${world.wave} 波` : '备 战', W / 2, pad + 10 * s);
  ctx.font = `600 ${11 * s}px ${FONT}`;
  ctx.fillStyle = 'rgba(200,225,245,0.6)';
  const remain = world.enemies.length + world.director.queue.length;
  ctx.fillText(
    world.phase === 'rest' && world.wave > 0
      ? `下一波 ${Math.ceil(world.phaseTime)}s`
      : world.wave === 0
        ? `第 1 波 ${Math.ceil(world.phaseTime)}s 后抵达`
        : `剩余威胁 ${remain}`,
    W / 2,
    pad + 30 * s,
  );

  // ---- 右上：分数 / 等级 ----
  ctx.textAlign = 'right';
  ctx.font = `700 ${15 * s}px ${MONO}`;
  ctx.fillStyle = '#dff3ff';
  ctx.fillText(`${Math.round(world.score)}`, W - pad - 52 * s, pad + 10 * s);
  ctx.font = `600 ${12 * s}px ${FONT}`;
  ctx.fillStyle = 'rgba(200,225,245,0.65)';
  ctx.fillText(`Lv.${p.level} · 击杀 ${p.stats.kills}`, W - pad - 52 * s, pad + 30 * s);

  // ---- Boss 血条 ----
  const boss = world.enemies.find((e) => e.type === 'boss');
  if (boss) {
    const bw = clamp(W * 0.5, 220, 640);
    const bh = 10 * s;
    const bx = (W - bw) / 2;
    const by = H - 34 * s;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, bx - 3 * s, by - 3 * s, bw + 6 * s, bh + 6 * s, 5 * s);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, bx, by, bw, bh, 4 * s);
    ctx.fill();
    ctx.fillStyle = '#ff2d55';
    roundRect(ctx, bx, by, bw * clamp(boss.hp / boss.maxHp, 0, 1), bh, 4 * s);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.font = `700 ${11 * s}px ${FONT}`;
    ctx.fillStyle = '#ffb3c0';
    ctx.fillText(`监工 · 阶段 ${boss.phase}`, W / 2, by - 12 * s);
  }

  // ---- 波次提示大字 ----
  if (opts.announce && opts.announce.t > 0) {
    const a = opts.announce;
    const k = clamp(a.t / a.max, 0, 1);
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 2.4);
    ctx.textAlign = 'center';
    ctx.font = `800 ${clamp(W * 0.05, 26, 62)}px ${FONT}`;
    ctx.fillStyle = a.color || COLORS.text;
    ctx.fillText(a.text, W / 2, H * 0.32 - (1 - k) * 20);
    if (a.sub) {
      ctx.font = `600 ${clamp(W * 0.02, 12, 22)}px ${FONT}`;
      ctx.fillStyle = 'rgba(220,240,255,0.75)';
      ctx.fillText(a.sub, W / 2, H * 0.32 + clamp(W * 0.045, 22, 52));
    }
    ctx.restore();
  }

  ctx.restore();

  // ---- 受伤红边 ----
  if (opts.hurtFlash > 0.01) {
    ctx.save();
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.28, W / 2, H / 2, Math.max(W, H) * 0.66);
    g.addColorStop(0, 'rgba(255,40,80,0)');
    g.addColorStop(1, `rgba(255,40,80,${clamp(opts.hurtFlash, 0, 1) * 0.55})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- 菜单

export function drawStart(ctx, W, H, best) {
  const s = uiScale(W, H);
  ctx.save();
  ctx.fillStyle = 'rgba(4,7,13,0.82)';
  ctx.fillRect(0, 0, W, H);

  // 装饰性准星
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = '#7cf6d8';
  ctx.lineWidth = 2;
  const cx = W / 2;
  const cy = H * 0.32;
  const r = Math.min(W, H) * 0.125;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r * 1.4, cy);
  ctx.lineTo(cx - r * 0.55, cy);
  ctx.moveTo(cx + r * 0.55, cy);
  ctx.lineTo(cx + r * 1.4, cy);
  ctx.moveTo(cx, cy - r * 1.4);
  ctx.lineTo(cx, cy - r * 0.55);
  ctx.moveTo(cx, cy + r * 0.55);
  ctx.lineTo(cx, cy + r * 1.4);
  ctx.stroke();

  // 准星中心点
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#ff4d6d';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = `800 ${clamp(W * 0.085, 30, 72)}px ${FONT}`;
  ctx.fillStyle = '#eafffb';
  ctx.fillText('霓 虹 空 洞', W / 2, H * 0.125);

  ctx.font = `600 ${clamp(Math.min(W, H) * 0.026, 10, 17)}px ${FONT}`;
  ctx.fillStyle = 'rgba(160,205,235,0.8)';
  ctx.fillText('NEON HOLLOW · 俯视角双摇杆 · 波次生存', W / 2, H * 0.195);

  ctx.font = `700 ${14 * s}px ${FONT}`;
  ctx.fillStyle = '#ffd166';
  if (best && best.wave > 0) {
    ctx.fillText(`历史最佳：第 ${best.wave} 波 · ${best.score} 分`, W / 2, H * 0.72);
  }

  const btns = buttonRects(W, H);
  drawButton(ctx, btns.primary, '开 始 潜 入', '#7cf6d8', s);

  ctx.font = `600 ${clamp(Math.min(W, H) * 0.023, 10, 14)}px ${FONT}`;
  ctx.fillStyle = 'rgba(190,215,235,0.85)';
  const tips = [
    '左半屏滑动移动 · 右半屏滑动瞄准并自动开火',
    '冲刺带无敌帧，是唯一能穿过弹幕的手段',
    '打空会自动换弹，也可主动按「换弹」抢节奏',
  ];
  tips.forEach((t, i) => {
    ctx.fillText(t, W / 2, H * (0.80 + i * 0.062));
  });
  ctx.restore();
}

function drawButton(ctx, rect, label, color, s) {
  ctx.save();
  ctx.fillStyle = 'rgba(12,22,36,0.9)';
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10 * s);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10 * s);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `700 ${clamp(rect.h * 0.4, 14, 22)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.restore();
}

export function drawUpgrade(ctx, W, H, world, hoverIndex = -1) {
  const s = uiScale(W, H);
  ctx.save();
  ctx.fillStyle = 'rgba(4,7,13,0.72)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${clamp(W * 0.032, 18, 34)}px ${FONT}`;
  ctx.fillStyle = '#ffd166';
  ctx.fillText('等级提升', W / 2, H * 0.13);
  ctx.font = `600 ${13 * s}px ${FONT}`;
  ctx.fillStyle = 'rgba(200,225,245,0.75)';
  const pending = world.players[0]?.pendingLevelUps || 0;
  ctx.fillText(pending > 1 ? `还有 ${pending} 次强化待选` : '选择一项强化', W / 2, H * 0.13 + clamp(W * 0.036, 22, 40));

  const rects = upgradeRects(W, H, world.upgradeOptions.length);
  world.upgradeOptions.forEach((id, i) => {
    const up = UPGRADE_BY_ID[id];
    if (!up) return;
    const r = rects[i];
    const rar = RARITY[up.rarity];
    const owner = world.players[0];
    const stacks = owner ? owner.upgrades[up.id] || 0 : 0;

    ctx.save();
    const lift = i === hoverIndex ? -6 : 0;
    ctx.translate(0, lift);

    ctx.fillStyle = 'rgba(11,18,30,0.95)';
    roundRect(ctx, r.x, r.y, r.w, r.h, 12 * s);
    ctx.fill();

    // 稀有度顶栏
    ctx.fillStyle = rar.color;
    ctx.globalAlpha = 0.9;
    roundRect(ctx, r.x, r.y, r.w, Math.max(5, r.h * 0.035), 4 * s);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = rar.color;
    ctx.lineWidth = i === hoverIndex ? 3 : 1.6;
    roundRect(ctx, r.x, r.y, r.w, r.h, 12 * s);
    ctx.stroke();

    const cx = r.x + r.w / 2;
    const compact = r.w < r.h;
    ctx.textAlign = 'center';

    ctx.font = `700 ${11 * s}px ${FONT}`;
    ctx.fillStyle = rar.color;
    ctx.fillText(rar.label, cx, r.y + r.h * (compact ? 0.16 : 0.13));

    ctx.font = `800 ${clamp(r.w * 0.085, 15, 26)}px ${FONT}`;
    ctx.fillStyle = '#eafffb';
    ctx.fillText(up.name, cx, r.y + r.h * 0.34);

    ctx.font = `500 ${clamp(r.w * 0.058, 11, 16)}px ${FONT}`;
    ctx.fillStyle = 'rgba(198,222,242,0.88)';
    wrapText(ctx, up.desc, cx, r.y + r.h * 0.5, r.w * 0.84, clamp(r.w * 0.072, 13, 20));

    if (stacks > 0) {
      ctx.font = `600 ${11 * s}px ${FONT}`;
      ctx.fillStyle = 'rgba(255,209,102,0.85)';
      ctx.fillText(`已强化 ×${stacks}  →  ×${stacks + 1}`, cx, r.y + r.h * 0.76);
    }

    ctx.font = `600 ${11 * s}px ${FONT}`;
    ctx.fillStyle = 'rgba(160,195,225,0.6)';
    ctx.fillText(compact ? '点击选择' : '点击卡片选择', cx, r.y + r.h * 0.9);
    ctx.restore();
  });

  ctx.restore();
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
  // 中文按字断行即可
  const chars = Array.from(text);
  let line = '';
  const lines = [];
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lineH) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineH));
}

export function drawPause(ctx, W, H, world) {
  const s = uiScale(W, H);
  ctx.save();
  ctx.fillStyle = 'rgba(4,7,13,0.8)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = `800 ${clamp(W * 0.05, 26, 54)}px ${FONT}`;
  ctx.fillStyle = '#eafffb';
  ctx.fillText('已 暂 停', W / 2, H * 0.26);

  const p = world.players[0];
  if (p) {
    ctx.font = `600 ${14 * s}px ${FONT}`;
    ctx.fillStyle = 'rgba(200,225,245,0.8)';
    ctx.fillText(`第 ${world.wave} 波 · Lv.${p.level} · ${Math.round(world.score)} 分`, W / 2, H * 0.335);

    // 已获得强化一览
    const ids = Object.keys(p.upgrades);
    if (ids.length) {
      ctx.font = `600 ${12 * s}px ${FONT}`;
      ctx.fillStyle = 'rgba(180,210,235,0.85)';
      ctx.fillText('已获得强化', W / 2, H * 0.40);
      const perLine = Math.max(2, Math.floor(W / (112 * s)));
      ids.forEach((id, i) => {
        const up = UPGRADE_BY_ID[id];
        if (!up) return;
        const col = i % perLine;
        const row = Math.floor(i / perLine);
        const inRow = Math.min(ids.length - row * perLine, perLine);
        const x = W / 2 + (col - (inRow - 1) / 2) * 112 * s;
        ctx.fillStyle = RARITY[up.rarity].color;
        ctx.font = `600 ${11 * s}px ${FONT}`;
        ctx.fillText(`${up.name}×${p.upgrades[id]}`, x, H * 0.44 + row * 20 * s);
      });
    }
  }

  const btns = buttonRects(W, H);
  drawButton(ctx, btns.primary, '继 续', '#7cf6d8', s);
  drawButton(ctx, btns.secondary, '放弃本局', '#ff8fa0', s);
  ctx.restore();
}

export function drawGameOver(ctx, W, H, world, best) {
  const s = uiScale(W, H);
  ctx.save();
  ctx.fillStyle = 'rgba(12,3,8,0.86)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = `800 ${clamp(W * 0.07, 26, 62)}px ${FONT}`;
  ctx.fillStyle = '#ff4d6d';
  ctx.fillText('信 号 丢 失', W / 2, H * 0.16);

  const p = world.players[0];
  ctx.font = `700 ${clamp(W * 0.026, 14, 24)}px ${FONT}`;
  ctx.fillStyle = '#eafffb';
  ctx.fillText(`坚持到第 ${world.wave} 波`, W / 2, H * 0.27);

  if (best && best.wave > 0) {
    ctx.font = `600 ${13 * s}px ${FONT}`;
    ctx.fillStyle = 'rgba(255,209,102,0.9)';
    ctx.fillText(`历史最佳：第 ${best.wave} 波 · ${best.score} 分`, W / 2, H * 0.345);
  }

  if (p) {
    const stats = [
      ['最终得分', Math.round(world.score)],
      ['击杀数', p.stats.kills],
      ['等级', `Lv.${p.level}`],
      ['命中率', p.stats.shots > 0 ? `${Math.round((p.stats.hits / p.stats.shots) * 100)}%` : '—'],
    ];
    stats.forEach(([k, v], i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = W / 2 + (col - 0.5) * Math.min(W * 0.44, 300);
      const y = H * 0.42 + row * 0.09 * H;
      ctx.fillStyle = 'rgba(180,205,230,0.65)';
      ctx.font = `600 ${12 * s}px ${FONT}`;
      ctx.fillText(k, x, y);
      ctx.fillStyle = '#eafffb';
      ctx.font = `700 ${16 * s}px ${MONO}`;
      ctx.fillText(String(v), x, y + 18 * s);
    });
  }

  const btns = buttonRects(W, H, GAMEOVER_BTN_Y);
  drawButton(ctx, btns.primary, '再 来 一 局', '#7cf6d8', s);
  drawButton(ctx, btns.secondary, '返回主菜单', '#8fb4d8', s);
  ctx.restore();
}
// 应用入口：状态机 + 固定步长主循环。
//
// 循环的关键结构（这也是为联机留的接口）：
//   requestAnimationFrame(可变 dt)
//     └── 累积器 → 固定 DT 的 world.step(inputSource)  ← 唯一推进模拟的地方
//     └── 渲染时用 alpha = acc/DT 做插值
// 只要 inputSource 换成网络指令源，整个流程原封不动就变成"客户端预测 + 服务端权威"。

import { DT, MAX_CATCHUP_STEPS, ARENA } from './sim/constants.js';
import { World } from './sim/world.js';
import { DeviceState } from './sim/input.js';
import { LoopbackTransport } from './net/transport.js';
import { Camera } from './render/camera.js';
import { Renderer } from './render/renderer.js';
import { Fx } from './render/fx.js';
import { TouchControls } from './ui/touch.js';
import { KeyboardInput } from './ui/keyboard.js';
import {
  drawHud,
  drawStart,
  drawUpgrade,
  drawPause,
  drawGameOver,
  upgradeRects,
  buttonRects,
  GAMEOVER_BTN_Y,
} from './ui/hud.js';
import { clamp } from './core/math.js';

const BEST_KEY = 'neonhollow.best.v1';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const ctx = renderer.ctx;
const cam = new Camera();
const fx = new Fx();
const device = new DeviceState();

// 单机模式下走 LoopbackTransport：输入源就是本地设备，没有对端。
// 联机时把这一行换成 WebSocketTransport，其余代码一行都不用动（见 src/net/）。
const transport = new LoopbackTransport(device);
const localInput = transport.getInputSource();

const touch = new TouchControls(canvas, device, { onPause: () => togglePause() });
const kb = new KeyboardInput(canvas, device, cam, { isBlocked: () => touch.moveStickActive });

/** 菜单背景用的空世界，让渲染管线在无对局时也能跑起来 */
const emptyWorld = { players: [], enemies: [], bullets: [], orbs: [] };

const app = {
  state: 'menu', // menu | playing | paused | gameover
  world: null,
  acc: 0,
  announce: null,
  hover: -1,
  best: readBest(),
  menuT: 0,
};

// ---------------------------------------------------------------- 状态切换

function startRun() {
  const w = new World({ seed: ((Math.random() * 0xffffffff) >>> 0) });
  w.addPlayer(1, '你');
  app.world = w;
  app.state = 'playing';
  app.acc = 0;
  app.hover = -1;
  fx.clear();
  device.reset();
  cam.snapTo(w.players[0].x, w.players[0].y);
  setTouchEnabled(false);
  announce('准 备', '第 1 波即将抵达', '#7cf6d8', 1.8);
  touch.hintTimer = 4.5;
}

function endRun() {
  app.state = 'gameover';
  setTouchEnabled(false);
  saveBest();
}

function togglePause() {
  if (app.state === 'playing') {
    app.state = 'paused';
    setTouchEnabled(false);
  } else if (app.state === 'paused') {
    app.state = 'playing';
    app.acc = 0;
    setTouchEnabled(true);
  }
}

function toMenu() {
  app.state = 'menu';
  app.world = null;
  app.announce = null;
  fx.clear();
  setTouchEnabled(false);
}

function setTouchEnabled(v) {
  const want = v && app.world && app.world.phase !== 'upgrade' && app.state === 'playing';
  touch.setEnabled(want);
}

function announce(text, sub, color, dur) {
  app.announce = { text, sub, color, t: dur, max: dur };
}

// ---------------------------------------------------------------- 最佳记录

function readBest() {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    return raw ? JSON.parse(raw) : { wave: 0, score: 0 };
  } catch {
    return { wave: 0, score: 0 };
  }
}

function saveBest() {
  const w = app.world;
  if (!w) return;
  if (w.wave > app.best.wave || w.score > app.best.score) {
    app.best = { wave: Math.max(w.wave, app.best.wave), score: Math.max(w.score, app.best.score) };
    try {
      localStorage.setItem(BEST_KEY, JSON.stringify(app.best));
    } catch {
      /* 隐私模式下 localStorage 可能不可用，忽略即可 */
    }
  }
}

// ---------------------------------------------------------------- 模拟事件 → 表现

function consumeEvents(events) {
  fx.handleEvents(events, cam);
  for (const ev of events) {
    if (ev.type === 'waveStart') {
      if (ev.boss) announce(`第 ${ev.wave} 波 · 首领`, '弹幕会随它的血量升级', '#ff4d6d', 2.2);
      else announce(`第 ${ev.wave} 波`, '剩余威胁计数见顶部', '#7cf6d8', 1.5);
    } else if (ev.type === 'waveClear') {
      announce('清 空', `回收 ${ev.heal} 点生命`, '#ffd166', 1.5);
    } else if (ev.type === 'levelUp') {
      app.hover = -1;
    }
  }
}

// ---------------------------------------------------------------- 更新

function update(dt) {
  touch.update(dt);

  if (kb.wantPause) {
    kb.wantPause = false;
    if (app.state === 'playing' || app.state === 'paused') togglePause();
  }

  if (app.state === 'playing' && app.world) {
    const w = app.world;
    const p = w.players[0];

    if (w.phase !== 'upgrade') {
      kb.setPlayerPos(p.x, p.y, touch.aimStickActive);
      kb.update();

      app.acc += dt;
      let steps = 0;
      while (app.acc >= DT && steps < MAX_CATCHUP_STEPS) {
        w.step(localInput);
        app.acc -= DT;
        steps++;
        consumeEvents(w.drainEvents());
        if (w.phase === 'gameover') {
          app.acc = 0;
          break;
        }
      }
      // 掉帧过多时直接丢弃积压，宁可跳帧也不要雪崩式补算
      if (app.acc > DT * MAX_CATCHUP_STEPS) app.acc = 0;
    } else {
      app.acc = 0;
    }

    if (w.phase !== 'upgrade') setTouchEnabled(true);
    else setTouchEnabled(false);

    if (p.alive) cam.follow(p, dt);
    if (w.phase === 'gameover') endRun();
  } else if (app.state === 'menu') {
    // 菜单里让镜头缓慢巡游，当作动态背景
    app.menuT += dt;
    cam.x = ARENA.w / 2 + Math.cos(app.menuT * 0.13) * 460;
    cam.y = ARENA.h / 2 + Math.sin(app.menuT * 0.19) * 300;
  }

  fx.update(dt);
  if (app.announce) {
    app.announce.t -= dt;
    if (app.announce.t <= 0) app.announce = null;
  }
}

// ---------------------------------------------------------------- 绘制

function draw(dt) {
  renderer.resize(cam);
  const W = cam.cssW;
  const H = cam.cssH;

  if (app.state === 'menu') {
    renderer.render(emptyWorld, cam, fx, 1, dt);
    drawStart(ctx, W, H, app.best);
    return;
  }

  const w = app.world;
  const alpha = app.state === 'playing' ? clamp(app.acc / DT, 0, 1) : 1;
  renderer.render(w, cam, fx, alpha, dt);

  if (app.state !== 'gameover') {
    drawHud(ctx, w, cam, dt, { announce: app.announce, hurtFlash: fx.flash });
    touch.draw(ctx, W, H);
  }
  if (app.state === 'playing' && w.phase === 'upgrade') {
    drawUpgrade(ctx, W, H, w, app.hover);
  }
  if (app.state === 'paused') drawPause(ctx, W, H, w);
  if (app.state === 'gameover') drawGameOver(ctx, W, H, w, app.best);
}

// ---------------------------------------------------------------- 主循环

let last = performance.now();

function frame(now) {
  const raw = (now - last) / 1000;
  last = now;
  // 切标签页回来时 raw 会非常大，钳住避免物理爆掉
  const dt = Math.min(raw, 0.25);

  update(dt);
  draw(dt);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- UI 命中测试

function hit(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function handleUiTap(x, y) {
  const W = cam.cssW;
  const H = cam.cssH;
  const btns = buttonRects(W, H);
  const overBtns = buttonRects(W, H, GAMEOVER_BTN_Y);

  if (app.state === 'menu') {
    if (hit(btns.primary, x, y)) startRun();
    return;
  }

  if (app.state === 'playing' && app.world && app.world.phase === 'upgrade') {
    const opts = app.world.upgradeOptions;
    const rects = upgradeRects(W, H, opts.length);
    for (let i = 0; i < rects.length; i++) {
      if (hit(rects[i], x, y)) {
        app.world.chooseUpgrade(app.world.upgradeFor, opts[i]);
        app.hover = -1;
        return;
      }
    }
    return;
  }

  if (app.state === 'paused') {
    if (hit(btns.primary, x, y)) togglePause();
    else if (hit(btns.secondary, x, y)) toMenu();
    return;
  }

  if (app.state === 'gameover') {
    if (hit(overBtns.primary, x, y)) startRun();
    else if (hit(overBtns.secondary, x, y)) toMenu();
  }
}

canvas.addEventListener('pointerdown', (e) => {
  if (touch.enabled) return; // 对局中由 TouchControls 接手
  const r = canvas.getBoundingClientRect();
  handleUiTap(e.clientX - r.left, e.clientY - r.top);
});

canvas.addEventListener('pointermove', (e) => {
  if (app.state !== 'playing' || !app.world || app.world.phase !== 'upgrade') {
    app.hover = -1;
    return;
  }
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  const rects = upgradeRects(cam.cssW, cam.cssH, app.world.upgradeOptions.length);
  app.hover = rects.findIndex((rc) => hit(rc, x, y));
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter' || e.code === 'Space') {
    if (app.state === 'menu') startRun();
    else if (app.state === 'gameover') startRun();
  }
  // 选卡支持数字键 1/2/3，PC 上调参时省事
  if (app.state === 'playing' && app.world && app.world.phase === 'upgrade') {
    const idx = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
    if (idx >= 0 && idx < app.world.upgradeOptions.length) {
      app.world.chooseUpgrade(app.world.upgradeFor, app.world.upgradeOptions[idx]);
    }
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && app.state === 'playing') togglePause();
});

// ---------------------------------------------------------------- 启动

renderer.resize(cam);
touch.attach();
kb.attach();
setTouchEnabled(false);
requestAnimationFrame((t) => {
  last = t;
  frame(t);
});
// 移动端双摇杆触控。使用 Pointer Events，因此鼠标/触控笔/手指统一处理。
//
// 设计要点（都是手感问题，不是代码问题）：
//   · 动态摇杆：手指按下的位置即摇杆原点，不需要"找按钮"
//   · 左半屏移动、右半屏瞄准并自动开火
//   · 摇杆只有超过死区才写入设备状态，避免手指微抖导致人物乱飘
//   · 冲刺/换弹做成右下角实体按钮，因为这两个是"决策"而不是"方向"

import { clamp, norm } from '../core/math.js';

const DEADZONE = 0.14;

export class TouchControls {
  constructor(canvas, device, opts = {}) {
    this.canvas = canvas;
    this.device = device;
    this.onPause = opts.onPause || null;
    this.enabled = true;

    /** @type {Map<number, object>} */
    this.pointers = new Map();
    this.buttons = [];
    this.hintTimer = 3;

    this._boundDown = (e) => this.onDown(e);
    this._boundMove = (e) => this.onMove(e);
    this._boundUp = (e) => this.onUp(e);
    this._boundCancel = (e) => this.onUp(e);
    this._boundCtx = (e) => e.preventDefault();
  }

  /** 开关触控。关闭时必须清干净，否则会出现"幽灵摇杆" */
  setEnabled(v) {
    if (this.enabled === v) return;
    this.enabled = v;
    if (!v) {
      this.pointers.clear();
      for (const b of this.buttons) b.pressed = 0;
      this.device.moveX = 0;
      this.device.moveY = 0;
      this.device.firing = false;
    }
  }

  attach() {
    const c = this.canvas;
    c.addEventListener('pointerdown', this._boundDown, { passive: false });
    c.addEventListener('pointermove', this._boundMove, { passive: false });
    c.addEventListener('pointerup', this._boundUp, { passive: false });
    c.addEventListener('pointercancel', this._boundCancel, { passive: false });
    c.addEventListener('contextmenu', this._boundCtx);
  }

  detach() {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this._boundDown);
    c.removeEventListener('pointermove', this._boundMove);
    c.removeEventListener('pointerup', this._boundUp);
    c.removeEventListener('pointercancel', this._boundCancel);
    c.removeEventListener('contextmenu', this._boundCtx);
  }

  /** 每帧根据画布尺寸重算按钮位置 */
  layout() {
    const W = this.canvas.clientWidth || window.innerWidth;
    const H = this.canvas.clientHeight || window.innerHeight;
    const s = Math.min(W, H);
    const br = clamp(s * 0.115, 28, 52);
    const pad = br * 1.55;
    this.W = W;
    this.H = H;
    this.stickMax = clamp(s * 0.16, 44, 88);
    this.buttons = [
      { id: 'dash', x: W - pad, y: H - pad, r: br, label: '冲刺' },
      { id: 'reload', x: W - pad - br * 2.25, y: H - br * 1.35, r: br * 0.78, label: '换弹' },
      { id: 'pause', x: W - br * 0.95, y: br * 0.95, r: br * 0.62, label: 'II' },
    ];
  }

  hitButton(px, py) {
    for (const b of this.buttons) {
      const dx = px - b.x;
      const dy = py - b.y;
      if (dx * dx + dy * dy <= (b.r + 10) ** 2) return b;
    }
    return null;
  }

  localPoint(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  onDown(e) {
    if (!this.enabled) return;
    e.preventDefault();
    const pt = this.localPoint(e);
    const btn = this.hitButton(pt.x, pt.y);
    if (btn) {
      this.buttons.forEach((b) => {
        if (b.id === btn.id) b.pressed = 1;
      });
      if (btn.id === 'dash') this.device.dashQueued = true;
      if (btn.id === 'reload') this.device.reloadQueued = true;
      if (btn.id === 'pause' && this.onPause) this.onPause();
      return;
    }

    const role = pt.x < this.W * 0.46 ? 'move' : 'aim';
    // 同一角色只允许一根手指，防止双指互相打架
    for (const p of this.pointers.values()) if (p.role === role) return;

    this.pointers.set(e.pointerId, {
      id: e.pointerId,
      role,
      ox: pt.x,
      oy: pt.y,
      x: pt.x,
      y: pt.y,
      active: true,
      age: 0,
    });
    if (role === 'aim') {
      // 按下即视为开始瞄准，但方向要等移动超过死区才确定
      this.device.firing = true;
    }
  }

  onMove(e) {
    if (!this.enabled) return;
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    e.preventDefault();
    const pt = this.localPoint(e);
    p.x = pt.x;
    p.y = pt.y;
    this.applyPointer(p);
  }

  onUp(e) {
    const p = this.pointers.get(e.pointerId);
    if (p) {
      this.pointers.delete(e.pointerId);
      if (p.role === 'move') {
        this.device.moveX = 0;
        this.device.moveY = 0;
      } else {
        this.device.firing = false;
      }
    }
    this.buttons.forEach((b) => {
      b.pressed = 0;
    });
  }

  applyPointer(p) {
    const dx = p.x - p.ox;
    const dy = p.y - p.oy;
    const dist = Math.hypot(dx, dy);
    if (dist < 1e-4) return;
    const n = norm(dx, dy);
    const mag = clamp(dist / this.stickMax, 0, 1);

    if (p.role === 'move') {
      // 移动摇杆：低于死区就是 0，避免手指微动导致走位
      if (mag < DEADZONE) {
        this.device.moveX = 0;
        this.device.moveY = 0;
      } else {
        const scaled = (mag - DEADZONE) / (1 - DEADZONE);
        this.device.moveX = n.x * scaled;
        this.device.moveY = n.y * scaled;
      }
    } else {
      if (mag < DEADZONE) {
        // 轻放时不开火，但保留上一次瞄准方向
        this.device.firing = false;
      } else {
        this.device.aimX = n.x;
        this.device.aimY = n.y;
        this.device.firing = true;
      }
    }
  }

  update(dt) {
    if (this.hintTimer > 0) this.hintTimer -= dt;
    for (const p of this.pointers.values()) p.age += dt;
    for (const b of this.buttons) if (b.pressed) b.pressed = Math.max(0, b.pressed - dt * 4);
  }

  get moveStickActive() {
    for (const p of this.pointers.values()) if (p.role === 'move') return true;
    return false;
  }

  get aimStickActive() {
    for (const p of this.pointers.values()) if (p.role === 'aim') return true;
    return false;
  }

  /** 屏幕坐标绘制（不走摄像机变换） */
  draw(ctx, cssW, cssH) {
    if (!this.enabled) return;
    if (this.W !== cssW || this.H !== cssH) this.layout();

    ctx.save();
    // 左右半屏的极淡底色，提示"左走右打"
    if (this.hintTimer > 0) {
      const a = clamp(this.hintTimer / 3, 0, 1) * 0.06;
      ctx.fillStyle = `rgba(120,200,255,${a})`;
      ctx.fillRect(0, 0, cssW * 0.46, cssH);
      ctx.fillStyle = `rgba(255,120,140,${a})`;
      ctx.fillRect(cssW * 0.54, 0, cssW * 0.46, cssH);
      ctx.textAlign = 'center';
      ctx.font = '600 13px system-ui, sans-serif';
      ctx.fillStyle = `rgba(220,240,255,${a * 8})`;
      ctx.fillText('左半屏滑动：移动', cssW * 0.23, cssH * 0.5);
      ctx.fillText('右半屏滑动：瞄准 + 自动开火', cssW * 0.77, cssH * 0.5);
    }

    for (const p of this.pointers.values()) this.drawStick(ctx, p);

    for (const b of this.buttons) {
      ctx.globalAlpha = b.pressed ? 0.95 : 0.55;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10,18,30,0.72)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = b.id === 'dash' ? 'rgba(124,246,216,0.9)' : 'rgba(160,200,240,0.6)';
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#dff3ff';
      ctx.font = `600 ${Math.round(b.r * 0.52)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, b.x, b.y + 1);
    }
    ctx.restore();
  }

  drawStick(ctx, p) {
    const dx = p.x - p.ox;
    const dy = p.y - p.oy;
    const dist = Math.hypot(dx, dy);
    const max = this.stickMax;
    const cl = dist > max ? max / dist : 1;
    const kx = p.ox + dx * cl;
    const ky = p.oy + dy * cl;

    const col = p.role === 'move' ? '124,246,216' : '255,120,140';
    ctx.save();
    ctx.globalAlpha = 0.28 + Math.min(0.25, p.age);
    ctx.fillStyle = `rgba(${col},0.10)`;
    ctx.beginPath();
    ctx.arc(p.ox, p.oy, max, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(${col},0.55)`;
    ctx.beginPath();
    ctx.arc(p.ox, p.oy, max, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = `rgba(${col},0.4)`;
    ctx.beginPath();
    ctx.moveTo(p.ox, p.oy);
    ctx.lineTo(kx, ky);
    ctx.stroke();

    ctx.globalAlpha = 0.85;
    ctx.fillStyle = `rgba(${col},0.85)`;
    ctx.beginPath();
    ctx.arc(kx, ky, max * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(kx, ky, max * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
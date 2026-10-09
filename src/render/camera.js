// 摄像机：跟随 + 瞄准前瞻 + 屏震。
// 纯表现层，不参与模拟，因此可以放心地用帧时间（而非固定 DT）来平滑。

import { CAMERA, ARENA } from '../sim/constants.js';
import { damp, clamp } from '../core/math.js';

export class Camera {
  constructor() {
    this.x = ARENA.w / 2;
    this.y = ARENA.h / 2;
    this.scale = 1;
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.cssW = 1;
    this.cssH = 1;
    this.dpr = 1;
  }

  resize(cssW, cssH, dpr) {
    this.cssW = cssW;
    this.cssH = cssH;
    this.dpr = dpr;
    // 取更严格的一边，保证任何画幅下都能看到足够大的战场。
    // 竖屏时这条会算出更小的 scale（视野更宽），正好补偿竖屏视野窄的问题
    this.scale = Math.min(cssW / CAMERA.viewW, cssH / CAMERA.viewH);
  }

  addShake(v) {
    this.shake = Math.min(26, this.shake + v);
  }

  /** 立即对准目标（开局/复活用，避免镜头飞过去） */
  snapTo(x, y) {
    this.x = x;
    this.y = y;
  }

  follow(p, dt) {
    const tx = p.x + p.aimX * CAMERA.lookAheadAim + p.vx * 0.06;
    const ty = p.y + p.aimY * CAMERA.lookAheadAim + p.vy * 0.06;
    this.x = damp(this.x, tx, CAMERA.followRate, dt);
    this.y = damp(this.y, ty, CAMERA.followRate, dt);

    // 限制在竞技场内，避免镜头推出边界露出大片空白
    const halfW = this.cssW / (2 * this.scale);
    const halfH = this.cssH / (2 * this.scale);
    this.x = halfW * 2 >= ARENA.w ? ARENA.w / 2 : clamp(this.x, halfW, ARENA.w - halfW);
    this.y = halfH * 2 >= ARENA.h ? ARENA.h / 2 : clamp(this.y, halfH, ARENA.h - halfH);

    this.shake = Math.max(0, this.shake - CAMERA.shakeDecay * this.shake * dt - 6 * dt);
    const s = this.shake;
    this.shakeX = (Math.random() * 2 - 1) * s;
    this.shakeY = (Math.random() * 2 - 1) * s;
  }

  /** 应用世界→屏幕变换（调用方负责 save/restore） */
  apply(ctx) {
    ctx.translate(this.cssW / 2, this.cssH / 2);
    ctx.scale(this.scale, this.scale);
    ctx.translate(-this.x + this.shakeX, -this.y + this.shakeY);
  }

  /** 世界坐标 → 屏幕(CSS px)坐标，HUD 与离屏指示器用 */
  worldToScreen(x, y) {
    return {
      x: this.cssW / 2 + (x - this.x + this.shakeX) * this.scale,
      y: this.cssH / 2 + (y - this.y + this.shakeY) * this.scale,
    };
  }

  /** 屏幕(CSS px)坐标 → 世界坐标，鼠标瞄准用 */
  screenToWorld(sx, sy) {
    return {
      x: (sx - this.cssW / 2) / this.scale + this.x - this.shakeX,
      y: (sy - this.cssH / 2) / this.scale + this.y - this.shakeY,
    };
  }

  /** 当前可见的世界矩形，用于剔除 */
  viewport(pad = 80) {
    const halfW = this.cssW / (2 * this.scale) + pad;
    const halfH = this.cssH / (2 * this.scale) + pad;
    return {
      x0: this.x - halfW,
      y0: this.y - halfH,
      x1: this.x + halfW,
      y1: this.y + halfH,
    };
  }
}
// 桌面键鼠输入，仅用于开发调试与 PC 端试玩。
// 与触控共享同一个 DeviceState；若触控摇杆正在使用，则键盘不覆盖移动向量。

import { norm } from '../core/math.js';

const KEYMAP = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

export class KeyboardInput {
  constructor(canvas, device, cam, opts = {}) {
    this.canvas = canvas;
    this.device = device;
    this.cam = cam;
    this.isBlocked = opts.isBlocked || (() => false);
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, inside: false };
    this.wantPause = false;
  }

  attach() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('blur', this.onBlur);
  }

  detach() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('blur', this.onBlur);
  }

  onBlur = () => {
    this.keys.clear();
    this.device.moveX = 0;
    this.device.moveY = 0;
    this.device.firing = false;
    this.mouse.down = false;
  };

  onKeyDown = (e) => {
    if (KEYMAP[e.code]) {
      this.keys.add(KEYMAP[e.code]);
      e.preventDefault();
    }
    if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.device.dashQueued = true;
      e.preventDefault();
    }
    if (e.code === 'KeyR') this.device.reloadQueued = true;
    if (e.code === 'Escape' || e.code === 'KeyP') this.wantPause = true;
  };

  onKeyUp = (e) => {
    if (KEYMAP[e.code]) this.keys.delete(KEYMAP[e.code]);
  };

  onMouseMove = (e) => {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - r.left;
    this.mouse.y = e.clientY - r.top;
    this.mouse.inside = true;
  };

  onMouseDown = (e) => {
    if (e.button === 0) this.mouse.down = true;
  };

  onMouseUp = () => {
    this.mouse.down = false;
  };

  /** 每 tick 调用，把键鼠状态折算进 DeviceState */
  update() {
    const k = this.keys;

    if (!this.isBlocked()) {
      let x = 0;
      let y = 0;
      if (k.has('left')) x -= 1;
      if (k.has('right')) x += 1;
      if (k.has('up')) y -= 1;
      if (k.has('down')) y += 1;
      const n = norm(x, y);
      this.device.moveX = n.x;
      this.device.moveY = n.y;
    }

    // 鼠标始终跟随光标瞄准（不必按住），开火才需要按住左键
    const pl = this.lastPlayerPos;
    if (this.mouse.inside && pl) {
      const world = this.cam.screenToWorld(this.mouse.x, this.mouse.y);
      const n = norm(world.x - pl.x, world.y - pl.y);
      if (n.x !== 0 || n.y !== 0) {
        this.device.aimX = n.x;
        this.device.aimY = n.y;
      }
    }

    if (this.mouse.inside) {
      this.device.firing = this.mouse.down;
    } else if (!this.touchFiring) {
      this.device.firing = false;
    }
  }

  setPlayerPos(x, y, touchFiring) {
    this.lastPlayerPos = { x, y };
    this.touchFiring = touchFiring;
  }
}
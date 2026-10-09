// 输入层：把「设备」抽象成「指令」。
//
// 联机预留的关键设计：
//   模拟层从不直接读键盘/触摸，只消费 InputCommand。
//   今天它来自 LocalInputSource（本地设备），
//   明天换成 NetworkInputSource（网络包）即可，模拟层一行不用改。
//   Command 字段全部做了定点量化，便于打包成二进制与做位级一致校验。

import { clamp, norm } from '../core/math.js';

export const EMPTY_COMMAND = Object.freeze({
  seq: 0,
  moveX: 0,
  moveY: 0,
  aimX: 0,
  aimY: 0,
  firing: false,
  dash: false,
  reload: false,
});

/** 量化到 1/1024，避免浮点尾差在网络传输后造成分歧 */
const q = (v) => Math.round(clamp(v, -1, 1) * 1024) / 1024;

export function makeCommand(seq, move, aim, firing, dash, reload) {
  const m = norm(move.x, move.y);
  const a = norm(aim.x, aim.y);
  return {
    seq,
    moveX: q(m.x),
    moveY: q(m.y),
    aimX: q(a.x),
    aimY: q(a.y),
    firing: !!firing,
    dash: !!dash,
    reload: !!reload,
  };
}

/**
 * 设备原始状态容器。
 * 触摸摇杆与键鼠各自写入这个对象，输入源统一从这里取。
 */
export class DeviceState {
  constructor() {
    this.moveX = 0;
    this.moveY = 0;
    this.aimX = 0;
    this.aimY = 0;
    this.firing = false;
    this.dashQueued = false;
    this.reloadQueued = false;
  }

  reset() {
    this.moveX = 0;
    this.moveY = 0;
    this.aimX = 0;
    this.aimY = 0;
    this.firing = false;
    this.dashQueued = false;
    this.reloadQueued = false;
  }
}

/** 输入源接口。所有实现都必须满足该签名。 */
export class InputSource {
  /** @returns {import('./input.js').InputCommand} */
  getCommand(_playerId, _tick) {
    return EMPTY_COMMAND;
  }
}

/** 本地设备输入源：每 tick 从 DeviceState 采样一次指令 */
export class LocalInputSource extends InputSource {
  constructor(device) {
    super();
    this.device = device;
    this.seq = 0;
  }

  getCommand(_playerId, _tick) {
    const d = this.device;
    const cmd = makeCommand(
      ++this.seq,
      { x: d.moveX, y: d.moveY },
      { x: d.aimX, y: d.aimY },
      d.firing,
      d.dashQueued,
      d.reloadQueued,
    );
    // 边沿触发的按键在采样后立刻消费，保证一次按压只触发一次
    d.dashQueued = false;
    d.reloadQueued = false;
    return cmd;
  }
}

/**
 * 网络输入源占位实现。
 * 联机阶段：从 socket 收到的帧里按 (playerId, tick) 取出对应指令；
 * 若该 tick 缺失则重发最近一次确认过的指令（输入预测/延迟补偿的入口）。
 */
export class NetworkInputSource extends InputSource {
  constructor() {
    super();
    /** @type {Map<number, Map<number, object>>} playerId -> tick -> command */
    this.buffer = new Map();
    this.lastKnown = new Map();
  }

  push(playerId, tick, command) {
    if (!this.buffer.has(playerId)) this.buffer.set(playerId, new Map());
    this.buffer.get(playerId).set(tick, command);
  }

  getCommand(playerId, tick) {
    const byTick = this.buffer.get(playerId);
    const cmd = byTick && byTick.get(tick);
    if (cmd) {
      this.lastKnown.set(playerId, cmd);
      byTick.delete(tick);
      return cmd;
    }
    // 丢包兜底：沿用上一次已知指令，保证模拟不中断
    return this.lastKnown.get(playerId) || EMPTY_COMMAND;
  }
}

/** 指令打包为紧凑数组，便于后续走二进制协议 */
export function packCommand(c) {
  return [
    c.seq,
    Math.round(c.moveX * 1024),
    Math.round(c.moveY * 1024),
    Math.round(c.aimX * 1024),
    Math.round(c.aimY * 1024),
    (c.firing ? 1 : 0) | (c.dash ? 2 : 0) | (c.reload ? 4 : 0),
  ];
}

export function unpackCommand(a) {
  const flags = a[5] | 0;
  return {
    seq: a[0],
    moveX: a[1] / 1024,
    moveY: a[2] / 1024,
    aimX: a[3] / 1024,
    aimY: a[4] / 1024,
    firing: !!(flags & 1),
    dash: !!(flags & 2),
    reload: !!(flags & 4),
  };
}
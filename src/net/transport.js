// 传输层抽象：游戏循环只认识「输入源」和「消息」，不认识 socket。
//
//   LoopbackTransport  单机（现在）
//   MemoryChannel      进程内双工，供确定性回归测试使用（不需要任何网络）
//   WebSocketTransport 浏览器 / Node 通用的真实实现（联机阶段启用）
//
// 升级路径：
//   1. 客户端 main.js 把 localInput 换成 transport.getInputSource()
//   2. 服务端用 NetworkInputSource 收集各玩家上传的指令
//   3. 服务端跑同一份 World，按 DESYNC_POLICY 周期下发快照与校验和

import { LocalInputSource, NetworkInputSource } from '../sim/input.js';
import { MSG, encode, decode, packInputFrame, unpackInputFrame } from './protocol.js';

export class Transport {
  constructor() {
    this._handlers = new Set();
    this.open = false;
  }

  onMessage(fn) {
    this._handlers.add(fn);
    return () => this._handlers.delete(fn);
  }

  emit(msg) {
    for (const fn of this._handlers) fn(msg);
  }

  send(_msg) {
    throw new Error('Transport.send 未实现');
  }

  close() {
    this.open = false;
  }

  get online() {
    return false;
  }
}

/** 单机：没有对端，输入直接来自本地设备 */
export class LoopbackTransport extends Transport {
  constructor(device) {
    super();
    this.device = device;
    this.input = new LocalInputSource(device);
    this.open = true;
  }

  getInputSource() {
    return this.input;
  }

  send() {
    /* 单机没有对端，故意空实现：保持调用点写法在联机时不变 */
  }
}

// ---------------------------------------------------------------- 进程内双工

class MemoryEndpoint extends Transport {
  constructor() {
    super();
    this.peer = null;
    this.open = true;
  }

  send(msg) {
    // 同步投递：本地回环没有延迟，便于做逐 tick 的确定性断言。
    // 需要模拟延迟/丢包时，在这里加一个 (tick, msg) 队列即可。
    if (this.peer) this.peer.emit(msg);
  }
}

/** 创建一对互通的端点，语义上等价于一条 TCP 连接的两端 */
export function createMemoryChannel() {
  const a = new MemoryEndpoint();
  const b = new MemoryEndpoint();
  a.peer = b;
  b.peer = a;
  return { a, b };
}

// ---------------------------------------------------------------- WebSocket

export class WebSocketTransport extends Transport {
  constructor(url, opts = {}) {
    super();
    this.url = url;
    this.ws = null;
    this.outbox = [];
    this.closedByUser = false;
    this.reconnectDelay = opts.reconnectDelay ?? 1200;
    this.maxReconnectDelay = opts.maxReconnectDelay ?? 8000;
    this.currentDelay = this.reconnectDelay;
  }

  connect() {
    const WS = globalThis.WebSocket;
    if (!WS) throw new Error('当前运行环境没有 WebSocket 实现');
    this.ws = new WS(this.url);

    this.ws.onopen = () => {
      this.open = true;
      this.currentDelay = this.reconnectDelay;
      for (const m of this.outbox) this.ws.send(encode(m));
      this.outbox.length = 0;
      this.emit({ t: MSG.OPEN });
    };

    this.ws.onmessage = (e) => {
      try {
        this.emit(decode(e.data));
      } catch (err) {
        this.emit({ t: MSG.ERROR, error: String(err) });
      }
    };

    this.ws.onclose = () => {
      this.open = false;
      this.emit({ t: MSG.CLOSE });
      if (!this.closedByUser) this.scheduleReconnect();
    };

    this.ws.onerror = () => this.emit({ t: MSG.ERROR });

    return this;
  }

  scheduleReconnect() {
    // 指数退避：联机断线时不要疯狂重连把服务端打挂
    setTimeout(() => {
      if (this.closedByUser) return;
      this.connect();
      this.currentDelay = Math.min(this.maxReconnectDelay, this.currentDelay * 1.7);
    }, this.currentDelay);
  }

  send(msg) {
    if (this.open && this.ws && this.ws.readyState === 1) this.ws.send(encode(msg));
    else this.outbox.push(msg);
  }

  close() {
    this.closedByUser = true;
    this.outbox.length = 0;
    if (this.ws) this.ws.close();
    super.close();
  }

  get online() {
    return this.open;
  }
}

/**
 * 服务端侧会话：把收到的输入帧灌进 NetworkInputSource，
 * 并按 tick 顺序交给权威 World 消费。
 */
export class ServerSession {
  constructor(world) {
    this.world = world;
    this.input = new NetworkInputSource();
    /** tick -> 已收到的玩家集合，用于判断"本 tick 是否可以推进" */
    this.ready = new Map();
  }

  handleMessage(msg) {
    if (msg.t === MSG.INPUT) {
      const frame = unpackInputFrame(msg.frame);
      if (!frame) return false;
      for (const { playerId, command } of frame.entries) {
        this.input.push(playerId, frame.tick, command);
      }
      this.ready.set(frame.tick, frame.entries.map((e) => e.playerId));
      return true;
    }
    if (msg.t === MSG.UPGRADE_PICK) {
      return this.world.chooseUpgrade(msg.playerId, msg.upgradeId);
    }
    return false;
  }

  /** 构造一帧输入并打包发送，客户端与测试都用它 */
  static frameInput(tick, commands) {
    return packInputFrame(tick, commands);
  }
}
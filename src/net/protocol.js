// 联机协议定义。单机阶段这份文件就已经生效 —— 因为输入指令在本地也是
// 走同样的「打包 / 解包」路径，等真正联网时不需要改协议，只需要接上传输层。

import { packCommand, unpackCommand } from '../sim/input.js';

export const PROTOCOL_VERSION = 1;

/** 消息类型。数值显式写死，方便将来换成二进制编码时不至于错位。 */
export const MSG = {
  HELLO: 1, // C→S 请求加入：{ t, version, name }
  WELCOME: 2, // S→C 加入成功：{ t, playerId, seed, tick, snapshot }
  INPUT: 3, // C→S 输入帧：{ t, tick, entries:[[playerId,[cmd...]]] }
  SNAPSHOT: 4, // S→C 权威快照：{ t, tick, snapshot }
  EVENTS: 5, // S→C 事件广播：{ t, tick, events }
  UPGRADE_OFFER: 6, // S→C 三选一：{ t, playerId, options:[id] }
  UPGRADE_PICK: 7, // C→S 选择：{ t, playerId, upgradeId }
  CHECKSUM: 8, // 双向分歧探测：{ t, tick, hash }
  PING: 9,
  PONG: 10,
  OPEN: 100, // 传输层内部事件（非线上消息）
  CLOSE: 101,
  ERROR: 102,
};

/**
 * 输入帧的线格式（数组，非对象，为了省带宽）：
 *   [version, tick, playerCount, ...(playerId, seq, mx, my, ax, ay, flags)*]
 * 感谢 makeCommand 里的 1/1024 量化，浮点值在传输后是精确相等的，
 * 不会因为序列化引入尾差导致 lockstep 分裂。
 */
export function packInputFrame(tick, entries) {
  const out = [PROTOCOL_VERSION, tick, entries.length];
  for (const { playerId, command } of entries) {
    out.push(playerId, ...packCommand(command));
  }
  return out;
}

export function unpackInputFrame(arr) {
  if (!arr || arr[0] !== PROTOCOL_VERSION) return null;
  const tick = arr[1];
  const n = arr[2];
  const entries = [];
  let i = 3;
  for (let k = 0; k < n; k++) {
    const playerId = arr[i++];
    const command = unpackCommand(arr.slice(i, i + 6));
    i += 6;
    entries.push({ playerId, command });
  }
  return { tick, entries };
}

export function encode(msg) {
  return JSON.stringify(msg);
}

export function decode(raw) {
  return JSON.parse(raw);
}

/** 客户端与服务端产生分歧时的处理策略（TODO：目前只上报，不做纠正） */
export const DESYNC_POLICY = {
  /** 校验和每 N tick 比对一次 */
  interval: 60,
  /** 连续 diverged 超过该次数则强制拉一份完整快照重同步 */
  threshold: 3,
};
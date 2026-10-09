// 确定性伪随机数发生器（mulberry32）。
// 关键点：RNG 状态可以序列化进世界快照。联机时只要所有端分享同一 seed
// 并消费同样的调用序列，随机结果就完全一致——这是 lockstep / 回滚网络的基础。

export class Rng {
  constructor(seed = 1) {
    this.s = seed >>> 0;
  }

  /** [0,1) */
  next() {
    let t = (this.s += 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** [min,max) */
  range(min, max) {
    return min + (max - min) * this.next();
  }

  /** [min,max] 整数 */
  int(min, max) {
    return Math.floor(min + (max - min + 1) * this.next());
  }

  /** [-1,1) */
  sign() {
    return this.next() * 2 - 1;
  }

  // ---- 快照 ----
  saveState() {
    return this.s >>> 0;
  }

  loadState(s) {
    this.s = s >>> 0;
  }
}

/** 把任意字符串映射为 32 位种子，方便用房间号/昵称做可复现开局 */
export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
// 纯数学工具，无任何副作用与外部依赖。
// 模拟层只允许使用这里 + core/rng.js 的随机来源，保证跨平台/跨设备可复现。

export const TAU = Math.PI * 2;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;

/** 帧率无关的指数趋近，t 为「每秒收敛比例」 */
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));

export const dist2 = (ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
};

export const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));

/** 圆形碰撞：返回是否重叠 */
export const circleHit = (ax, ay, ar, bx, by, br) => {
  const r = ar + br;
  return dist2(ax, ay, bx, by) <= r * r;
};

/** 归一化，零向量返回 (0,0) */
export function norm(x, y) {
  const l = Math.hypot(x, y);
  if (l < 1e-6) return { x: 0, y: 0 };
  return { x: x / l, y: y / l };
}

/** 把角度差收敛到 [-PI, PI) */
export function wrapAngle(a) {
  while (a >= Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

/** 沿最短路径插值角度 */
export function angleTowards(cur, target, maxStep) {
  const d = wrapAngle(target - cur);
  if (Math.abs(d) <= maxStep) return target;
  return wrapAngle(cur + Math.sign(d) * maxStep);
}

// 以下随机工具统一接收 Rng 实例（见 core/rng.js），而非裸函数，
// 避免调用方在 rng() / rng.next() 之间搞混。

/** 数组随机取一个 */
export const pick = (rng, arr) => arr[Math.floor(rng.next() * arr.length) % arr.length];

/** Fisher-Yates，返回新数组 */
export function shuffled(rng, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const t = out[i];
    out[i] = out[j];
    out[j] = t;
  }
  return out;
}

/** 加权随机：items 为 [{weight, ...}]，返回被选中的元素 */
export function weightedPick(rng, items, weightOf = (it) => it.weight) {
  let total = 0;
  for (const it of items) total += Math.max(0, weightOf(it));
  if (total <= 0) return items[0];
  let roll = rng.next() * total;
  for (const it of items) {
    roll -= Math.max(0, weightOf(it));
    if (roll <= 0) return it;
  }
  return items[items.length - 1];
}
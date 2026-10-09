// 无头模拟自检：不依赖浏览器，直接验证模拟层的正确性与确定性。
// 这是后续做联机前必须一直绿的护栏 —— 一旦这里挂了，lockstep 一定分裂。

import { World } from '../src/sim/world.js';
import { makeCommand } from '../src/sim/input.js';

/** 完全由 tick 决定的脚本化输入，保证可复现 */
class ScriptedInput {
  getCommand(_playerId, tick) {
    const a = tick * 0.017;
    const mx = Math.cos(a);
    const my = Math.sin(a * 0.7);
    const aimA = tick * 0.031;
    return makeCommand(
      tick,
      { x: mx, y: my },
      { x: Math.cos(aimA), y: Math.sin(aimA) },
      true,
      tick % 97 === 0,
      false,
    );
  }
}

function run(ticks, seed, hooks = {}) {
  const w = new World({ seed });
  w.addPlayer(1, 'P1');
  const input = new ScriptedInput();
  const trace = [];

  for (let i = 0; i < ticks; i++) {
    w.step(input);
    // 选卡也必须是确定性的：这里用"永远选第一个"的固定策略
    if (w.phase === 'upgrade') {
      w.chooseUpgrade(w.upgradeFor, w.upgradeOptions[0]);
    }
    if (w.phase === 'gameover') break;
    trace.push(w.checksum());
  }
  hooks.onWorld?.(w);
  return { world: w, trace };
}

function snapshotRoundTrip(ticks, seed, after) {
  const w = new World({ seed });
  w.addPlayer(1, 'P1');
  const input = new ScriptedInput();

  const advance = (world, from, to) => {
    for (let i = from; i < to; i++) {
      world.step(input);
      if (world.phase === 'upgrade') world.chooseUpgrade(world.upgradeFor, world.upgradeOptions[0]);
      if (world.phase === 'gameover') return;
    }
  };

  advance(w, 0, ticks);
  const snap = w.snapshot();
  advance(w, ticks, ticks + after);
  const expected = w.checksum();

  const restored = World.fromSnapshot(snap);
  advance(restored, ticks, ticks + after);
  const actual = restored.checksum();

  return { expected, actual, ok: expected === actual };
}

let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
  if (!ok) failures++;
};

console.log('\n=== 无头模拟自检 ===\n');

console.log('[1] 长跑 3600 tick（60 秒）');
const a = run(3600, 20261009);
const w1 = a.world;
console.log(
  `      波次=${w1.wave} 分数=${w1.score} 玩家等级=${w1.players[0].level} ` +
    `击杀=${w1.players[0].stats.kills} 存活=${w1.players[0].alive} ` +
    `实体(敌/弹/球)=${w1.enemies.length}/${w1.bullets.length}/${w1.orbs.length} phase=${w1.phase}`,
);
check('模拟未抛异常且推进到至少第 1 波', w1.wave >= 1);

console.log('\n[2] 确定性复现（同 seed 同输入 → 同轨迹）');
const b = run(3600, 20261009);
let same = a.trace.length === b.trace.length;
if (same) {
  for (let i = 0; i < a.trace.length; i++) {
    if (a.trace[i] !== b.trace[i]) {
      same = false;
      console.log(`      首个分歧出现在 tick ${i + 1}: ${a.trace[i]} vs ${b.trace[i]}`);
      break;
    }
  }
}
check('两条轨迹逐 tick 校验和完全一致', same, `(${a.trace.length} ticks)`);

console.log('\n[3] 快照 → 恢复 → 续跑，结果一致');
const rt = snapshotRoundTrip(1800, 777, 900);
check('快照续跑校验和一致', rt.ok, `${rt.expected} vs ${rt.actual}`);

console.log('\n[4] 不同 seed 应产生不同轨迹（排除"退化随机"）');
const c = run(1200, 4242);
const d = run(1200, 98765);
check('不同 seed 的轨迹存在差异', c.trace[c.trace.length - 1] !== d.trace[d.trace.length - 1]);

console.log('\n[5] 长时间生存压力测试（含 Boss 波）');
const e = run(20000, 555);
console.log(`      波次=${e.world.wave} 最高波=${e.world.maxWave} 分数=${e.world.score} phase=${e.world.phase}`);
check('跑满 20000 tick 无崩溃', true);

console.log(`\n${failures === 0 ? '全部通过' : `${failures} 项失败`}\n`);
process.exit(failures === 0 ? 0 : 1);
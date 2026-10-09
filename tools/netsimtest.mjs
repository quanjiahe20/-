// 联机路径回归测试：在**进程内**模拟「客户端 ↔ 权威服务端」，
// 全程走真实的打包 / 解包 / 传输层代码，但不碰任何网络。
//
// 它回答一个具体问题：把单机逻辑搬成 lockstep 之后，
// 客户端预测与服务端权威会不会因为"浮点序列化 / 指令丢失"而分裂？
// 只要这个测试是绿的，后面接真 WebSocket 就只是换传输实现的事。

import { World } from '../src/sim/world.js';
import { NetworkInputSource, makeCommand } from '../src/sim/input.js';
import { createMemoryChannel, ServerSession } from '../src/net/transport.js';
import { MSG, packInputFrame, unpackInputFrame } from '../src/net/protocol.js';

/** 完全由 tick 决定的输入脚本，两端一致 */
function scriptedCommand(tick) {
  const a = tick * 0.019;
  const aimA = tick * 0.037;
  return makeCommand(
    tick,
    { x: Math.cos(a), y: Math.sin(a * 0.8) },
    { x: Math.cos(aimA), y: Math.sin(aimA) },
    true,
    tick % 83 === 0,
    tick % 211 === 0,
  );
}

let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
  if (!ok) failures++;
};

console.log('\n=== 联机路径自检（进程内 lockstep）===\n');

// ---------------------------------------------------------------- 1. 线格式无损

console.log('[1] 输入帧打包 → 解包 必须位级无损');
{
  // 刻意取一些"除不尽"的浮点值，验证 1/1024 量化确实抹掉了尾差
  const src = makeCommand(7, { x: 0.3333333, y: -0.7777777 }, { x: -0.1234567, y: 0.9876543 }, true, false, true);
  const frame = packInputFrame(7, [{ playerId: 3, command: src }]);
  const back = unpackInputFrame(frame);
  const cmd = back.entries[0].command;
  const same =
    cmd.moveX === src.moveX &&
    cmd.moveY === src.moveY &&
    cmd.aimX === src.aimX &&
    cmd.aimY === src.aimY &&
    cmd.firing === src.firing &&
    cmd.dash === src.dash &&
    cmd.reload === src.reload;
  check('量化后的指令往返完全相等', same, `${JSON.stringify([src.moveX, cmd.moveX])}`);
  check('帧长度符合预期', frame.length === 3 + 7, `len=${frame.length}`);
  check('版本不符时应拒收', unpackInputFrame([999, 1, 0]) === null);
}

// ---------------------------------------------------------------- 2. 双端一致性

console.log('\n[2] 客户端预测 vs 服务端权威：逐 tick 校验和一致');
const SEED = 20261009;
const TICKS = 5400; // 90 秒，足以跑过若干波与一次 Boss

const serverWorld = new World({ seed: SEED });
serverWorld.addPlayer(1, 'P1');
const session = new ServerSession(serverWorld);

const clientWorld = new World({ seed: SEED });
clientWorld.addPlayer(1, 'P1');

const clientInput = new NetworkInputSource();
const serverInput = session.input;

const channel = createMemoryChannel();
let inputsReceived = 0;
let upgradePicks = 0;

// 服务端侧：收到的输入帧直接交给 ServerSession
channel.b.onMessage((msg) => {
  if (msg.t === MSG.INPUT) {
    inputsReceived++;
    session.handleMessage(msg);
  } else if (msg.t === MSG.UPGRADE_PICK) {
    session.handleMessage(msg);
  }
});

let firstDivergence = -1;
for (let tick = 1; tick <= TICKS; tick++) {
  const cmd = scriptedCommand(tick);

  // 客户端：把自己的指令按线格式走一遍再喂给自己（模拟"回放已确认输入"）
  const frame = packInputFrame(tick, [{ playerId: 1, command: cmd }]);
  const decoded = unpackInputFrame(frame);
  clientInput.push(1, tick, decoded.entries[0].command);

  // 客户端 → 服务端
  channel.a.send({ t: MSG.INPUT, frame });

  clientWorld.step(clientInput);
  serverWorld.step(serverInput);

  // 选卡必须两端做同样的事，否则状态立刻分叉
  const cUp = clientWorld.phase === 'upgrade';
  const sUp = serverWorld.phase === 'upgrade';
  if (cUp !== sUp) {
    firstDivergence = tick;
    console.log(`      选卡状态不一致 @ tick ${tick}: client=${clientWorld.phase} server=${serverWorld.phase}`);
    break;
  }
  if (cUp) {
    // 客户端提交意图，服务端才是真正的执行者
    const pick = clientWorld.upgradeOptions[0];
    channel.a.send({ t: MSG.UPGRADE_PICK, playerId: clientWorld.upgradeFor, upgradeId: pick });
    clientWorld.chooseUpgrade(clientWorld.upgradeFor, pick);
    upgradePicks++;
  }

  if (tick % 60 === 0) {
    const hc = clientWorld.checksum();
    const hs = serverWorld.checksum();
    if (hc !== hs) {
      firstDivergence = tick;
      console.log(`      校验和分歧 @ tick ${tick}: client=${hc} server=${hs}`);
      break;
    }
  }
  if (clientWorld.phase === 'gameover') break;
}

check('全程无分歧', firstDivergence === -1, firstDivergence === -1 ? `(${TICKS} ticks)` : '');
check('服务端确实收到了输入帧', inputsReceived > 0, `收到 ${inputsReceived} 帧`);
check('双端最终校验和相同', clientWorld.checksum() === serverWorld.checksum());
console.log(
  `      终局：波次=${serverWorld.wave} 分数=${serverWorld.score} ` +
    `敌人=${serverWorld.enemies.length} 已选强化=${upgradePicks} 玩家存活=${serverWorld.players[0].alive}`,
);

// ---------------------------------------------------------------- 3. 断流容错

console.log('\n[3] 丢包容错：输入源必须沿用上一条已确认指令而不是卡死');
{
  const src = new NetworkInputSource();
  src.push(1, 1, makeCommand(1, { x: 1, y: 0 }, { x: 1, y: 0 }, true, false, false));
  const first = src.getCommand(1, 1);
  const missing = src.getCommand(1, 2); // tick 2 的包丢了
  check('缺失 tick 时回退到上一条指令', missing.moveX === first.moveX && missing.firing === true);
  check('完全没有任何指令时返回空指令而不抛异常', src.getCommand(9, 99).firing === false);
}

// ---------------------------------------------------------------- 4. 快照重同步

console.log('\n[4] 中途加入：用快照重建一个世界，续跑结果必须一致');
{
  const a = new World({ seed: 31337 });
  a.addPlayer(1, 'P1');
  const input = new NetworkInputSource();
  const advance = (w, from, to) => {
    for (let t = from; t < to; t++) {
      const c = scriptedCommand(t);
      input.push(1, t, c);
      w.step(input);
      if (w.phase === 'upgrade') w.chooseUpgrade(w.upgradeFor, w.upgradeOptions[0]);
      if (w.phase === 'gameover') return;
    }
  };
  advance(a, 1, 900);
  const snap = a.snapshot();
  advance(a, 900, 1500);

  const b = World.fromSnapshot(snap);
  advance(b, 900, 1500);
  check('快照重建后校验和一致', a.checksum() === b.checksum(), `${a.checksum()} vs ${b.checksum()}`);
  check('快照可被 JSON 序列化传输', typeof JSON.stringify(snap) === 'string');
}

console.log(`\n${failures === 0 ? '全部通过' : `${failures} 项失败`}\n`);
process.exit(failures === 0 ? 0 : 1);
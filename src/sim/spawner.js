// 波次导演：决定「这一波刷什么、刷多少、按什么节奏刷」。
// 抽离成独立模块的原因——联机时服务端需要权威地生成波次计划，
// 客户端只接收 spawn 事件，不参与决策。

import { ENEMIES, WAVE } from './constants.js';
import { weightedPick, shuffled } from '../core/math.js';

/** 各兵种的刷怪预算消耗，用来把"数值强度"换算成"进关卡的花费" */
export const COST = {
  grunt: 3,
  shooter: 5,
  charger: 6,
  splitter: 8,
  tank: 16,
  boss: 110,
};

/**
 * 生成本波的刷怪队列。全部随机来自注入的 rng，保证各端一致。
 * @returns {{queue: Array<{type:string, elite:boolean}>, budget:number, boss:boolean}}
 */
export function planWaveSpawns(rng, wave) {
  const boss = wave % WAVE.bossEvery === 0;
  let budget = WAVE.budget(wave);
  if (boss) budget = Math.max(30, budget - COST.boss);

  const available = Object.values(ENEMIES).filter((d) => d.weight > 0 && d.minWave <= wave);
  const queue = [];
  const counts = {};
  const maxPerType = Math.max(5, Math.round(budget / 11));
  let spent = 0;
  let guard = 0;

  while (spent < budget && guard++ < 500) {
    const affordable = available.filter(
      (d) => COST[d.id] <= budget - spent && (counts[d.id] || 0) < maxPerType,
    );
    if (affordable.length === 0) break;

    const def = weightedPick(rng, affordable, (d) => d.weight);
    counts[def.id] = (counts[def.id] || 0) + 1;
    spent += COST[def.id];
    const elite = wave >= WAVE.eliteFromWave && rng.next() < 0.085;
    queue.push({ type: def.id, elite });
  }

  return { queue: shuffled(rng, queue), budget: spent, boss };
}
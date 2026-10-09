// 肉鸽成长池。
// 设计约定：升级是**纯数据**（不含函数），效果用 mul/add 两个字典描述。
// 好处：升级选项可以被序列化传给客户端、服务端可复用同一份逻辑校验，
// 联机时"谁来选升级"不会引入分歧。

import { weightedPick } from '../core/math.js';

export const RARITY = {
  common: { id: 'common', label: '常规', color: '#8fb4d8', weight: 100 },
  uncommon: { id: 'uncommon', label: '稀有', color: '#7cf6d8', weight: 46 },
  rare: { id: 'rare', label: '史诗', color: '#c8a6ff', weight: 18 },
  legendary: { id: 'legendary', label: '传说', color: '#ffb35c', weight: 6 },
};

/**
 * mul: 乘算修正（以 1 为基准的增量，如 0.15 表示 +15%）
 * add: 加算修正
 * weapon: 直接替换主武器
 */
export const UPGRADES = [
  // ---------- 通用输出 ----------
  { id: 'dmg_up', name: '火力强化', desc: '子弹伤害 +16%', rarity: 'common', max: 8, mul: { damageMul: 0.16 } },
  { id: 'rate_up', name: '循环加速', desc: '射速 +13%', rarity: 'common', max: 7, mul: { fireRateMul: 0.13 } },
  { id: 'bullet_spd', name: '高初速弹药', desc: '子弹飞行速度 +18%，散布 -15%', rarity: 'common', max: 5, mul: { bulletSpeedMul: 0.18, spreadMul: -0.15 } },
  { id: 'crit_chance', name: '弱点识别', desc: '暴击率 +9%', rarity: 'uncommon', max: 6, add: { critChance: 0.09 } },
  { id: 'crit_dmg', name: '处决协议', desc: '暴击伤害 +55%', rarity: 'uncommon', max: 5, add: { critMul: 0.55 } },
  { id: 'pierce', name: '穿甲弹头', desc: '子弹额外贯穿 1 个目标', rarity: 'uncommon', max: 4, add: { pierceAdd: 1 } },
  { id: 'ricochet', name: '跳弹涂层', desc: '子弹命中后弹射 1 次', rarity: 'rare', max: 3, add: { ricochet: 1 } },

  // ---------- 生存 ----------
  { id: 'maxhp', name: '强化骨架', desc: '生命上限 +22 并立即回复', rarity: 'common', max: 10, add: { maxHpAdd: 22 } },
  { id: 'armor', name: '复合装甲', desc: '受到伤害固定 -4', rarity: 'uncommon', max: 5, add: { armorFlat: 4 } },
  { id: 'speed_up', name: '机动靴', desc: '移动速度 +9%', rarity: 'common', max: 6, mul: { speedMul: 0.09 } },
  { id: 'dash_cd', name: '冷却回路', desc: '冲刺冷却 -22%', rarity: 'uncommon', max: 4, mul: { dashCdMul: -0.22 } },
  { id: 'dash_charge', name: '双冲程', desc: '冲刺次数上限 +1', rarity: 'rare', max: 2, add: { dashChargesAdd: 1 } },
  { id: 'lifesteal', name: '汲取', desc: '击杀回复 3 点生命', rarity: 'uncommon', max: 5, add: { lifestealFlat: 3 } },
  { id: 'thorns', name: '尖刺力场', desc: '接触你的敌人受到 18 点伤害', rarity: 'rare', max: 3, add: { thorns: 18 } },

  // ---------- 弹药 ----------
  { id: 'mag', name: '扩容弹匣', desc: '弹匣容量 +35%', rarity: 'common', max: 6, mul: { magMul: 0.35 } },
  { id: 'reload', name: '快速装填', desc: '换弹时间 -24%', rarity: 'common', max: 5, mul: { reloadMul: -0.24 } },

  // ---------- 特殊机制 ----------
  { id: 'kill_nova', name: '死亡新星', desc: '击杀时引发小范围爆炸（+22 伤害）', rarity: 'uncommon', max: 4, add: { explodeOnKill: 22 } },
  { id: 'hit_blast', name: '破片弹', desc: '子弹命中时产生破片爆炸（+14 伤害）', rarity: 'rare', max: 3, add: { explodeOnHit: 14 } },
  { id: 'reload_shock', name: '换弹冲击波', desc: '完成换弹时击退并伤害周围敌人', rarity: 'rare', max: 3, add: { reloadShockwave: 1 } },
  { id: 'xp_up', name: '数据解析', desc: '获得经验 +25%', rarity: 'common', max: 5, mul: { xpMul: 0.25 } },

  // ---------- 武器替换 ----------
  { id: 'w_smg', name: '换装：冲锋枪', desc: '高射速、大散布', rarity: 'uncommon', max: 1, weapon: 'smg', excludeWeapon: true },
  { id: 'w_shotgun', name: '换装：霰弹枪', desc: '近战一枪一个，远距离无力', rarity: 'uncommon', max: 1, weapon: 'shotgun', excludeWeapon: true },
  { id: 'w_rifle', name: '换装：战术步枪', desc: '高单发伤害，可贯穿一个目标', rarity: 'rare', max: 1, weapon: 'rifle', excludeWeapon: true },
  { id: 'w_railgun', name: '换装：电磁轨道炮', desc: '贯穿全场，弹匣极小', rarity: 'legendary', max: 1, weapon: 'railgun', excludeWeapon: true },
];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

/** 玩家是否已拿满该升级 */
function atMax(player, up) {
  const n = player.upgrades[up.id] || 0;
  return n >= up.max;
}

/** 是否因条件被排除（例如已有同款武器） */
function excluded(player, up) {
  if (up.excludeWeapon && player.weapon === up.weapon) return true;
  return false;
}

/** 玩家 mods 默认值，必须出现在快照里，保证跨端一致 */
export function defaultMods() {
  return {
    damageMul: 1,
    fireRateMul: 1,
    speedMul: 1,
    bulletSpeedMul: 1,
    spreadMul: 1,
    magMul: 1,
    reloadMul: 1,
    dashCdMul: 1,
    xpMul: 1,
    critChance: 0.05,
    critMul: 2.0,
    pierceAdd: 0,
    ricochet: 0,
    lifestealFlat: 0,
    thorns: 0,
    armorFlat: 0,
    maxHpAdd: 0,
    dashChargesAdd: 0,
    explodeOnKill: 0,
    explodeOnHit: 0,
    reloadShockwave: 0,
  };
}

/**
 * 抽 count 个互不重复的升级选项。
 * 使用注入的 rng，保证同一 seed 下所有人看到同样的三选一。
 */
export function rollChoices(rng, player, count = 3) {
  const pool = UPGRADES.filter((u) => !atMax(player, u) && !excluded(player, u));
  if (pool.length === 0) return [];
  const out = [];
  const remain = pool.slice();
  while (out.length < count && remain.length > 0) {
    const chosen = weightedPick(rng, remain, (u) => RARITY[u.rarity].weight);
    out.push(chosen);
    remain.splice(remain.indexOf(chosen), 1);
  }
  return out;
}

/** 把升级写入玩家的 mods / 武器 / 计数 */
export function applyUpgrade(player, up) {
  player.upgrades[up.id] = (player.upgrades[up.id] || 0) + 1;
  if (up.weapon) {
    player.weapon = up.weapon;
    // 换枪后重新计算弹匣
    player.magSize = 0;
    player.ammo = 0;
    player.reloading = 0;
  }
  for (const [k, v] of Object.entries(up.mul || {})) {
    player.mods[k] = (player.mods[k] ?? 1) + v;
  }
  for (const [k, v] of Object.entries(up.add || {})) {
    player.mods[k] = (player.mods[k] ?? 0) + v;
  }
}

/** 调试/测试用：随机抽 n 个升级并直接应用 */
export function grantRandom(rng, player, n) {
  for (let i = 0; i < n; i++) {
    const opts = rollChoices(rng, player, 1);
    if (!opts.length) break;
    applyUpgrade(player, opts[0]);
  }
}
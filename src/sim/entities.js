// 实体工厂：全部产出**纯数据对象**（无方法、无闭包、无 DOM 引用）。
// 这样整份世界状态可以直接 JSON 序列化 —— 联机快照、回滚、录像回放都靠它。

import { PLAYER, ENEMIES, BULLET, WEAPONS, XP } from './constants.js';
import { defaultMods } from './upgrades.js';
import { resolveMaxHp, resolveDashCharges, resolveWeapon } from './weapons.js';

export function createPlayer(id, x, y, name = 'P1') {
  return {
    kind: 'player',
    id,
    name,
    x,
    y,
    px: x,
    py: y,
    vx: 0,
    vy: 0,
    aimX: 1,
    aimY: 0,
    radius: PLAYER.radius,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    alive: true,

    weapon: PLAYER.startWeapon,
    ammo: WEAPONS[PLAYER.startWeapon].magSize,
    magSize: WEAPONS[PLAYER.startWeapon].magSize,
    cooldown: 0,
    reloading: 0,
    reloadingTotal: 0,

    dashMax: PLAYER.dashCharges,
    dashCharges: PLAYER.dashCharges,
    dashCd: 0,
    dashTime: 0,
    dashDirX: 1,
    dashDirY: 0,
    invuln: 0,
    hurtSlow: 0,

    level: 1,
    xp: 0,
    xpNeed: XP.need(1),
    pendingLevelUps: 0,
    mods: defaultMods(),
    upgrades: {},

    muzzle: 0,
    recoil: 0,
    stats: { kills: 0, damage: 0, shots: 0, hits: 0 },
  };
}

/** 应用升级后需要同步的派生属性（生命上限、冲刺次数） */
export function refreshDerived(player, healDiff = true) {
  const newMax = resolveMaxHp(player);
  if (healDiff && newMax > player.maxHp) player.hp += newMax - player.maxHp;
  player.maxHp = newMax;
  player.dashMax = resolveDashCharges(player);
  if (player.dashCharges > player.dashMax) player.dashCharges = player.dashMax;
  const w = resolveWeapon(player);
  player.magSize = w.magSize;
  if (player.ammo > player.magSize) player.ammo = player.magSize;
}

export function createEnemy(id, typeId, x, y, wave, opts = {}) {
  const def = ENEMIES[typeId];
  const hpScale = opts.hpMul ?? 1;
  const dmgScale = opts.dmgMul ?? 1;
  const spdScale = opts.spdMul ?? 1;
  const hp = def.hp * hpScale * (opts.hpExtra ?? 1);
  const elite = !!opts.elite;
  return {
    kind: 'enemy',
    id,
    type: typeId,
    x,
    y,
    px: x,
    py: y,
    vx: 0,
    vy: 0,
    radius: def.radius * (elite ? 1.18 : 1),
    hp,
    maxHp: hp,
    speed: def.speed * spdScale,
    contactDamage: def.contactDamage * dmgScale * (elite ? 1.35 : 1),
    armor: def.armor || 0,
    xp: Math.round(def.xp * (elite ? 2.4 : 1)),
    color: elite ? '#ffd166' : def.color,
    behavior: def.behavior,
    elite,
    wave,

    state: 'idle',
    stateTime: 0,
    cooldown: opts.cooldown ?? 0.4,
    telegraph: 0,
    dirX: 0,
    dirY: 0,
    hitFlash: 0,
    knockX: 0,
    knockY: 0,
    touchCd: 0,
    phase: 1,
    alive: true,
    spawnAnim: 0.35,
  };
}

export function createBullet(id, owner, ownerId, x, y, dirX, dirY, speed, damage, opts = {}) {
  return {
    kind: 'bullet',
    id,
    owner, // 'player' | 'enemy'
    ownerId, // 伤害归属：玩家 id 或敌人 id，联机判分与吸血都依赖它
    x,
    y,
    px: x,
    py: y,
    vx: dirX * speed,
    vy: dirY * speed,
    radius: owner === 'player' ? BULLET.playerRadius : BULLET.radius + 1,
    damage,
    pierce: opts.pierce || 0,
    ricochet: opts.ricochet || 0,
    life: opts.life ?? BULLET.life,
    knockback: opts.knockback || 0,
    color: opts.color || '#ffffff',
    crit: !!opts.crit,
    hitIds: [],
    alive: true,
  };
}

export function createOrb(id, x, y, value) {
  return {
    kind: 'orb',
    id,
    x,
    y,
    px: x,
    py: y,
    vx: 0,
    vy: 0,
    value,
    life: XP.orbLife,
    alive: true,
  };
}
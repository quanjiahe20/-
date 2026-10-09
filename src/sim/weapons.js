// 武器结算：把玩家 mods 折算成当前武器的实际开火参数。
// 每 tick 重算（廉价），保证升级后立即生效且不需要在各处打补丁。

import { WEAPONS, PLAYER } from './constants.js';

export function resolveWeapon(player) {
  const base = WEAPONS[player.weapon] || WEAPONS.pistol;
  const m = player.mods;
  return {
    id: base.id,
    name: base.name,
    damage: base.damage * m.damageMul,
    interval: base.interval / Math.max(0.15, m.fireRateMul),
    speed: base.speed * m.bulletSpeedMul,
    spread: base.spread * m.spreadMul,
    pellets: base.pellets,
    magSize: Math.max(1, Math.round(base.magSize * m.magMul)),
    reloadTime: Math.max(0.2, base.reloadTime * m.reloadMul),
    pierce: base.pierce + m.pierceAdd,
    ricochet: m.ricochet,
    knockback: base.knockback,
    shake: base.shake,
    color: base.color,
  };
}

export function resolveMaxHp(player) {
  return PLAYER.maxHp + player.mods.maxHpAdd;
}

export function resolveDashCooldown(player) {
  return PLAYER.dashCooldown * player.mods.dashCdMul;
}

export function resolveDashCharges(player) {
  return PLAYER.dashCharges + player.mods.dashChargesAdd;
}
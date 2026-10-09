// 全部数值调参集中在此。模拟层任何模块都从这里取常量，方便统一做数值平衡与联网校验。

export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;
/** 单帧最多追赶的模拟步数（防止切换标签页后一次性补算爆炸） */
export const MAX_CATCHUP_STEPS = 6;

export const ARENA = { w: 2400, h: 1800 };

export const CAMERA = {
  /** 期望至少能看到的世界范围，scale 取两者中更严格的一边 */
  viewW: 1120,
  viewH: 700,
  /** 瞄准方向上的镜头前瞻量，扩大有效预瞄范围 */
  lookAhead: 110,
  lookAheadAim: 90,
  followRate: 7,
  shakeDecay: 3.4,
};

export const PLAYER = {
  radius: 14,
  maxHp: 100,
  speed: 268,
  accelRate: 16,
  frictionRate: 13,
  contactKnockback: 260,

  dashSpeed: 980,
  dashTime: 0.15,
  dashCooldown: 1.5,
  dashCharges: 1,
  dashInvuln: 0.28,

  /** 受击后无敌时间（硬核：很短） */
  hurtInvuln: 0.55,
  /** 受击后移动惩罚 */
  hurtSlowTime: 0.22,
  hurtSlowMul: 0.45,

  pickupRadius: 74,
  /** 从子弹击中判定点回推的枪口偏移 */
  muzzleOffset: 18,

  startWeapon: 'pistol',
  startingLives: 1,
};

export const BULLET = {
  radius: 4,
  playerRadius: 5,
  life: 1.5,
  /** 每次穿透后伤害衰减 */
  pierceFalloff: 0.78,
  /** 弹跳后伤害衰减 */
  ricochetFalloff: 0.85,
};

export const WEAPONS = {
  pistol: {
    id: 'pistol',
    name: '制式手枪',
    desc: '可靠、精准，无限备弹。',
    damage: 26,
    interval: 0.2,
    speed: 1250,
    spread: 0.028,
    pellets: 1,
    magSize: 14,
    reloadTime: 0.8,
    pierce: 0,
    knockback: 120,
    shake: 1.4,
    color: '#8ff6ff',
  },
  smg: {
    id: 'smg',
    name: '冲锋枪',
    desc: '高射速、大散布，适合贴脸泼弹。',
    damage: 12,
    interval: 0.07,
    speed: 1350,
    spread: 0.115,
    pellets: 1,
    magSize: 45,
    reloadTime: 1.25,
    pierce: 0,
    knockback: 60,
    shake: 1.0,
    color: '#ffe27a',
  },
  shotgun: {
    id: 'shotgun',
    name: '霰弹枪',
    desc: '近距离一枪一个，远距离形同虚设。',
    damage: 13,
    interval: 0.74,
    speed: 1050,
    spread: 0.3,
    pellets: 8,
    magSize: 6,
    reloadTime: 1.5,
    pierce: 0,
    knockback: 320,
    shake: 5.5,
    color: '#ffb35c',
  },
  rifle: {
    id: 'rifle',
    name: '战术步枪',
    desc: '高单发伤害，可贯穿一个目标。',
    damage: 58,
    interval: 0.44,
    speed: 1900,
    spread: 0.012,
    pellets: 1,
    magSize: 8,
    reloadTime: 1.35,
    pierce: 1,
    knockback: 200,
    shake: 3.0,
    color: '#c8a6ff',
  },
  railgun: {
    id: 'railgun',
    name: '电磁轨道炮',
    desc: '贯穿全场，但弹匣极小、换弹极慢。',
    damage: 150,
    interval: 1.05,
    speed: 3400,
    spread: 0.0,
    pellets: 1,
    magSize: 4,
    reloadTime: 1.9,
    pierce: 99,
    knockback: 380,
    shake: 6.5,
    color: '#ff7ad9',
  },
};

export const ENEMIES = {
  grunt: {
    id: 'grunt',
    name: '游荡者',
    hp: 42,
    speed: 132,
    radius: 14,
    contactDamage: 12,
    xp: 4,
    color: '#ff5d6c',
    behavior: 'chase',
    weight: 100,
    minWave: 1,
  },
  shooter: {
    id: 'shooter',
    name: '射手',
    hp: 34,
    speed: 98,
    radius: 15,
    contactDamage: 8,
    xp: 7,
    color: '#ffa14a',
    behavior: 'kite',
    keepRange: 330,
    fireInterval: 1.55,
    bulletSpeed: 430,
    bulletDamage: 9,
    burst: 1,
    weight: 60,
    minWave: 2,
  },
  charger: {
    id: 'charger',
    name: '突进者',
    hp: 64,
    speed: 108,
    radius: 17,
    contactDamage: 22,
    xp: 9,
    color: '#ff3fa4',
    behavior: 'charge',
    telegraphTime: 0.62,
    chargeSpeed: 760,
    chargeTime: 0.42,
    chargeCooldown: 2.5,
    weight: 45,
    minWave: 3,
  },
  splitter: {
    id: 'splitter',
    name: '分裂体',
    hp: 78,
    speed: 118,
    radius: 20,
    contactDamage: 14,
    xp: 9,
    color: '#7bffb0',
    behavior: 'chase',
    splitInto: 'grunt',
    splitCount: 2,
    weight: 40,
    minWave: 4,
  },
  tank: {
    id: 'tank',
    name: '重装体',
    hp: 360,
    speed: 64,
    radius: 29,
    contactDamage: 26,
    xp: 26,
    color: '#9aa7ff',
    behavior: 'chase',
    armor: 0.25,
    weight: 22,
    minWave: 6,
  },
  boss: {
    id: 'boss',
    name: '监工',
    hp: 1600,
    speed: 82,
    radius: 46,
    contactDamage: 34,
    xp: 200,
    color: '#ff2d55',
    behavior: 'boss',
    armor: 0.15,
    fireInterval: 2.1,
    bulletSpeed: 380,
    bulletDamage: 12,
    weight: 0,
    minWave: 99,
  },
};

export const WAVE = {
  /** 第 n 波可用的刷怪预算 */
  budget: (n) => Math.round(16 + n * 9 + Math.pow(n, 1.5) * 1.8),
  /** 每波内敌人生成间隔 */
  spawnInterval: 0.62,
  /** 同时存活上限，避免手机卡顿 */
  maxAlive: 34,
  /** 每 N 波出 Boss */
  bossEvery: 5,
  /** 波间休整时间 */
  restTime: 4.2,
  /** 清波奖励回复（硬核：只给一点点） */
  clearHeal: 12,
  /** 每波成长系数 */
  hpScale: (n) => 1 + (n - 1) * 0.135 + Math.pow(Math.max(0, n - 8), 1.6) * 0.02,
  dmgScale: (n) => 1 + (n - 1) * 0.055,
  speedScale: (n) => Math.min(1.45, 1 + (n - 1) * 0.018),
  /** 高波次开始出现精英词缀 */
  eliteFromWave: 7,
};

export const XP = {
  orbRadius: 7,
  orbMagnet: 320,
  orbLife: 40,
  /** 升级所需经验：早期给得快，中后期逐步收口 */
  need: (level) => Math.round(5 + Math.pow(Math.max(0, level - 1), 1.4) * 5 + (level - 1) * 3),
};

export const SCORE = {
  waveClear: 120,
  survivalPerWave: 0.0,
};

export const COLORS = {
  bg: '#07080e',
  grid: 'rgba(120,180,255,0.055)',
  gridBold: 'rgba(120,180,255,0.10)',
  border: 'rgba(140,200,255,0.35)',
  player: '#7cf6d8',
  playerCore: '#eafffb',
  aim: '#ff4d6d',
  enemyBullet: '#ff9f43',
  text: '#dff3ff',
  danger: '#ff4d6d',
  good: '#7cf6d8',
};
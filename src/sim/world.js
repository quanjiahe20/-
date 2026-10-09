// 世界（模拟层核心）。
//
// ⚠️ 本文件**绝对不能**出现 window / document / canvas / performance 等浏览器 API。
// 它必须能在 Node 里裸跑 —— 因为联机方案是"服务端跑同一份 World 做权威模拟"。
// 所有随机都来自 world.rng（可序列化），所有时间推进都以固定 DT 为单位。

import {
  DT,
  ARENA,
  PLAYER,
  BULLET,
  ENEMIES,
  WAVE,
  XP,
  SCORE,
} from './constants.js';
import { Rng } from '../core/rng.js';
import {
  clamp,
  damp,
  norm,
  dist2,
  circleHit,
} from '../core/math.js';
import {
  createPlayer,
  createEnemy,
  createBullet,
  createOrb,
  refreshDerived,
} from './entities.js';
import { resolveWeapon } from './weapons.js';
import { rollChoices, applyUpgrade, UPGRADE_BY_ID } from './upgrades.js';
import { EMPTY_COMMAND } from './input.js';
import { planWaveSpawns, COST } from './spawner.js';

export class World {
  constructor(opts = {}) {
    this.seed = opts.seed ?? 12345;
    this.rng = new Rng(this.seed);
    this.arena = { w: ARENA.w, h: ARENA.h };

    this.tick = 0;
    this.nextId = 1;

    this.players = [];
    this.enemies = [];
    this.bullets = [];
    this.orbs = [];
    this.events = [];

    this.phase = 'rest'; // rest | fight | upgrade | gameover
    this.resumePhase = 'fight';
    this.phaseTime = WAVE.restTime * 0.5;

    this.wave = 0;
    this.score = 0;
    this.maxWave = 0;

    // 波次导演状态（放在 world 上，随快照一起走）
    this.director = { budget: 0, spawnTimer: 0, queue: [], bossPending: false, spawned: 0 };

    this.upgradeFor = null;
    this.upgradeOptions = [];

    /** 表现层一次性消费的事件队列 */
    this.eventSink = [];
  }

  // ---------------------------------------------------------------- 生命周期

  addPlayer(id, name) {
    const x = this.arena.w / 2 + (this.players.length * 60 - 30);
    const y = this.arena.h / 2;
    const p = createPlayer(id, x, y, name);
    this.players.push(p);
    return p;
  }

  getPlayer(id) {
    return this.players.find((p) => p.id === id) || null;
  }

  alivePlayers() {
    return this.players.filter((p) => p.alive);
  }

  emit(ev) {
    this.events.push(ev);
    this.eventSink.push(ev);
  }

  drainEvents() {
    const out = this.eventSink;
    this.eventSink = [];
    return out;
  }

  // ---------------------------------------------------------------- 主循环

  /**
   * 推进一步模拟。固定 DT，调用方负责按真实时间累积步数。
   * @param {{getCommand:Function}} inputSource
   */
  step(inputSource) {
    this.tick++;
    const dt = DT;

    if (this.phase === 'gameover') {
      // 死亡后仍有惯性表现：只推进子弹/粒子
      for (const b of this.bullets) this.stepBullet(b, dt);
      this.cleanup();
      return;
    }

    if (this.phase === 'upgrade') {
      // 选卡期间世界冻结，这是硬核游戏的呼吸点，也顺带让联机同步压力骤降
      return;
    }

    const src = inputSource || null;
    for (const p of this.players) {
      const cmd = p.alive && src ? src.getCommand(p.id, this.tick) : EMPTY_COMMAND;
      if (p.alive) this.stepPlayer(p, cmd, dt);
    }
    for (const e of this.enemies) if (e.alive) this.stepEnemy(e, dt);
    for (const b of this.bullets) if (b.alive) this.stepBullet(b, dt);
    this.stepOrbs(dt);

    this.resolveBulletHits();
    this.resolveContact();
    this.separateEnemies();

    this.stepDirector(dt);
    this.cleanup();
  }

  // ---------------------------------------------------------------- 玩家

  stepPlayer(p, cmd, dt) {
    const m = p.mods;
    const w = resolveWeapon(p);
    p.magSize = w.magSize;
    if (p.ammo > p.magSize) p.ammo = p.magSize;

    // 计时器
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurtSlow = Math.max(0, p.hurtSlow - dt);
    p.muzzle = Math.max(0, p.muzzle - dt * 7);
    p.recoil = Math.max(0, p.recoil - dt * 9);

    // 冲刺充能回复
    if (p.dashCharges < p.dashMax) {
      p.dashCd = Math.max(0, p.dashCd - dt);
      if (p.dashCd <= 0) {
        p.dashCharges++;
        p.dashCd = p.dashCharges < p.dashMax ? PLAYER.dashCooldown * m.dashCdMul : 0;
      }
    } else {
      p.dashCd = 0;
    }

    // 瞄准
    if (cmd.aimX !== 0 || cmd.aimY !== 0) {
      p.aimX = cmd.aimX;
      p.aimY = cmd.aimY;
    }

    // 冲刺
    if (cmd.dash && p.dashCharges > 0 && p.dashTime <= 0) {
      let dx = cmd.moveX;
      let dy = cmd.moveY;
      if (Math.hypot(dx, dy) < 0.2) {
        dx = p.aimX;
        dy = p.aimY;
      }
      const n = norm(dx, dy);
      p.dashDirX = n.x;
      p.dashDirY = n.y;
      p.dashTime = PLAYER.dashTime;
      p.dashCharges--;
      if (p.dashCd <= 0) p.dashCd = PLAYER.dashCooldown * m.dashCdMul;
      p.invuln = Math.max(p.invuln, PLAYER.dashInvuln);
      this.emit({ type: 'dash', x: p.x, y: p.y, dx: n.x, dy: n.y });
    }

    // 移动
    if (p.dashTime > 0) {
      p.dashTime -= dt;
      p.vx = p.dashDirX * PLAYER.dashSpeed;
      p.vy = p.dashDirY * PLAYER.dashSpeed;
      p.invuln = Math.max(p.invuln, 0.05);
    } else {
      const base = PLAYER.speed * m.speedMul;
      const slow = p.hurtSlow > 0 ? PLAYER.hurtSlowMul : 1;
      const desiredX = cmd.moveX * base * slow;
      const desiredY = cmd.moveY * base * slow;
      const moving = cmd.moveX !== 0 || cmd.moveY !== 0;
      const rate = moving ? PLAYER.accelRate : PLAYER.frictionRate;
      p.vx = damp(p.vx, desiredX, rate, dt);
      p.vy = damp(p.vy, desiredY, rate, dt);
    }

    p.px = p.x;
    p.py = p.y;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    this.clampToArena(p);

    // 换弹
    if (p.reloading > 0) {
      p.reloading -= dt;
      if (p.reloading <= 0) {
        p.reloading = 0;
        p.ammo = w.magSize;
        if (m.reloadShockwave > 0) this.reloadShockwave(p, m.reloadShockwave);
      }
    } else if (cmd.reload || p.ammo <= 0) {
      if (p.ammo < w.magSize) {
        p.reloading = w.reloadTime;
        p.reloadingTotal = w.reloadTime;
      }
    }

    // 开火
    if (cmd.firing && p.reloading <= 0 && p.ammo > 0 && p.cooldown <= 0) {
      this.firePlayerWeapon(p, w);
    }
  }

  firePlayerWeapon(p, w) {
    p.ammo--;
    p.cooldown = w.interval;
    p.muzzle = 1;
    p.recoil = Math.min(1, p.recoil + 0.55 + w.shake * 0.05);

    const baseAngle = Math.atan2(p.aimY, p.aimX);
    for (let i = 0; i < w.pellets; i++) {
      // 注意：随机消费顺序必须固定，联机才能位级一致
      const jitter = w.spread > 0 ? (this.rng.next() * 2 - 1) * w.spread : 0;
      const fan = w.pellets > 1 ? (i / (w.pellets - 1) - 0.5) * w.spread * 1.7 : 0;
      const a = baseAngle + jitter + fan;
      const dx = Math.cos(a);
      const dy = Math.sin(a);

      let dmg = w.damage;
      let crit = false;
      if (this.rng.next() < p.mods.critChance) {
        dmg *= p.mods.critMul;
        crit = true;
      }

      this.bullets.push(
        createBullet(
          this.nextId++,
          'player',
          p.id,
          p.x + dx * PLAYER.muzzleOffset,
          p.y + dy * PLAYER.muzzleOffset,
          dx,
          dy,
          w.speed,
          dmg,
          {
            pierce: w.pierce,
            ricochet: w.ricochet,
            knockback: w.knockback,
            color: w.color,
            crit,
          },
        ),
      );
    }
    p.stats.shots += w.pellets;

    this.emit({
      type: 'shoot',
      x: p.x + Math.cos(baseAngle) * PLAYER.muzzleOffset,
      y: p.y + Math.sin(baseAngle) * PLAYER.muzzleOffset,
      angle: baseAngle,
      color: w.color,
      shake: w.shake,
      weapon: w.id,
    });
  }

  reloadShockwave(p, power) {
    const R = 190;
    this.emit({ type: 'shockwave', x: p.x, y: p.y, radius: R, color: '#8ff6ff' });
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d2 = dist2(p.x, p.y, e.x, e.y);
      if (d2 > R * R) continue;
      const d = Math.sqrt(d2) || 1;
      const f = 1 - d / R;
      this.damageEnemy(e, 20 * power * f, false, p.id);
      e.knockX += ((e.x - p.x) / d) * 520 * f;
      e.knockY += ((e.y - p.y) / d) * 520 * f;
    }
  }

  clampToArena(o) {
    const r = o.radius;
    o.x = clamp(o.x, r, this.arena.w - r);
    o.y = clamp(o.y, r, this.arena.h - r);
    if (o.kind === 'player') {
      if (o.x <= r || o.x >= this.arena.w - r) o.vx *= 0.2;
      if (o.y <= r || o.y >= this.arena.h - r) o.vy *= 0.2;
    }
  }

  // ---------------------------------------------------------------- 敌人

  nearestPlayer(x, y) {
    let best = null;
    let bd = Infinity;
    for (const p of this.players) {
      if (!p.alive) continue;
      const d = dist2(x, y, p.x, p.y);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  stepEnemy(e, dt) {
    const def = ENEMIES[e.type];
    e.hitFlash = Math.max(0, e.hitFlash - dt * 5);
    e.spawnAnim = Math.max(0, e.spawnAnim - dt);
    e.cooldown = Math.max(0, e.cooldown - dt);
    e.touchCd = Math.max(0, e.touchCd - dt);

    const target = this.nearestPlayer(e.x, e.y);
    if (!target) {
      e.vx = damp(e.vx, 0, 6, dt);
      e.vy = damp(e.vy, 0, 6, dt);
    } else {
      const dx = target.x - e.x;
      const dy = target.y - e.y;
      const d = Math.hypot(dx, dy) || 1e-6;
      const nx = dx / d;
      const ny = dy / d;

      if (e.behavior === 'chase') this.aiChase(e, def, nx, ny, dt);
      else if (e.behavior === 'kite') this.aiKite(e, def, target, nx, ny, d, dt);
      else if (e.behavior === 'charge') this.aiCharge(e, def, nx, ny, d, dt);
      else if (e.behavior === 'boss') this.aiBoss(e, def, target, nx, ny, d, dt);
    }

    // 出场硬直：刚生成时几乎不动，给玩家反应时间（也防止贴脸秒杀）
    const spawnMul = e.spawnAnim > 0 ? 0.15 : 1;
    e.px = e.x;
    e.py = e.y;
    e.x += (e.vx * spawnMul + e.knockX) * dt;
    e.y += (e.vy * spawnMul + e.knockY) * dt;
    e.knockX = damp(e.knockX, 0, 9, dt);
    e.knockY = damp(e.knockY, 0, 9, dt);
    this.clampToArena(e);
  }

  aiChase(e, def, nx, ny, dt) {
    const s = e.speed;
    e.vx = damp(e.vx, nx * s, 7, dt);
    e.vy = damp(e.vy, ny * s, 7, dt);
  }

  aiKite(e, def, target, nx, ny, d, dt) {
    const keep = def.keepRange;
    let mx;
    let my;
    if (d < keep - 46) {
      mx = -nx;
      my = -ny;
    } else if (d > keep + 46) {
      mx = nx;
      my = ny;
    } else {
      // 横向游走：dirX 在出场时由 rng 决定，保证确定性
      mx = -ny * e.dirX;
      my = nx * e.dirX;
    }
    e.vx = damp(e.vx, mx * e.speed, 6, dt);
    e.vy = damp(e.vy, my * e.speed, 6, dt);

    if (e.cooldown <= 0 && d < keep + 320) {
      e.cooldown = def.fireInterval * this.rng.range(0.85, 1.2);
      // 提前量预判：硬核但公平，逼玩家学会变向
      const lead = d / def.bulletSpeed;
      const tx = target.x + target.vx * lead * 0.72;
      const ty = target.y + target.vy * lead * 0.72;
      const a = Math.atan2(ty - e.y, tx - e.x) + this.rng.range(-0.07, 0.07);
      this.spawnEnemyBullet(e, Math.cos(a), Math.sin(a), def.bulletSpeed, def.bulletDamage);
    }
  }

  aiCharge(e, def, nx, ny, d, dt) {
    switch (e.state) {
      case 'idle':
        e.vx = damp(e.vx, nx * e.speed, 7, dt);
        e.vy = damp(e.vy, ny * e.speed, 7, dt);
        if (d < 430 && e.cooldown <= 0) {
          e.state = 'telegraph';
          e.stateTime = 0;
          e.dirX = nx;
          e.dirY = ny;
        }
        break;
      case 'telegraph': {
        e.vx = damp(e.vx, 0, 13, dt);
        e.vy = damp(e.vy, 0, 13, dt);
        // 蓄力期间缓慢修正朝向，玩家可以靠走位骗冲刺
        e.dirX = damp(e.dirX, nx, 2.6, dt);
        e.dirY = damp(e.dirY, ny, 2.6, dt);
        const n = norm(e.dirX, e.dirY);
        e.dirX = n.x;
        e.dirY = n.y;
        e.telegraph = Math.min(1, e.stateTime / def.telegraphTime);
        if (e.stateTime >= def.telegraphTime) {
          e.state = 'charge';
          e.stateTime = 0;
          e.telegraph = 0;
          this.emit({ type: 'chargeGo', x: e.x, y: e.y, dx: e.dirX, dy: e.dirY });
        }
        break;
      }
      case 'charge':
        e.vx = e.dirX * def.chargeSpeed;
        e.vy = e.dirY * def.chargeSpeed;
        if (e.stateTime >= def.chargeTime) {
          e.state = 'idle';
          e.stateTime = 0;
          e.cooldown = def.chargeCooldown;
        }
        break;
      default:
        e.state = 'idle';
        break;
    }
  }

  /** Boss：按血量分三阶段，弹幕形态逐级加码 */
  aiBoss(e, def, target, nx, ny, d, dt) {
    const ratio = e.hp / e.maxHp;
    const phase = ratio > 0.6 ? 1 : ratio > 0.3 ? 2 : 3;
    e.phase = phase;

    const ideal = 330 - phase * 45;
    let mx = 0;
    let my = 0;
    if (d > ideal + 70) {
      mx = nx;
      my = ny;
    } else if (d < ideal - 70) {
      mx = -nx;
      my = -ny;
    } else {
      mx = -ny * e.dirX;
      my = nx * e.dirX;
    }
    const spd = e.speed * (1 + (phase - 1) * 0.2);
    e.vx = damp(e.vx, mx * spd, 5, dt);
    e.vy = damp(e.vy, my * spd, 5, dt);

    if (e.cooldown <= 0) {
      e.cooldown = def.fireInterval / (1 + (phase - 1) * 0.28);
      const ringCount = phase === 1 ? 10 : phase === 2 ? 12 : 16;
      const offset = phase === 3 ? e.stateTime * 2.4 : e.stateTime * 0.6;
      for (let i = 0; i < ringCount; i++) {
        const a = (i / ringCount) * Math.PI * 2 + offset;
        this.spawnEnemyBullet(e, Math.cos(a), Math.sin(a), def.bulletSpeed, def.bulletDamage);
      }
      // 二阶段起追加一轮指向性扇形，逼玩家不能原地绕圈
      if (phase >= 2) {
        const aim = Math.atan2(target.y - e.y, target.x - e.x);
        const n = phase === 2 ? 3 : 5;
        for (let i = 0; i < n; i++) {
          const a = aim + (i - (n - 1) / 2) * 0.16;
          this.spawnEnemyBullet(e, Math.cos(a), Math.sin(a), def.bulletSpeed * 1.25, def.bulletDamage);
        }
      }
      this.emit({ type: 'bossFire', x: e.x, y: e.y, phase });
    }
  }

  spawnEnemyBullet(e, dx, dy, speed, damage) {
    const def = ENEMIES[e.type];
    this.bullets.push(
      createBullet(
        this.nextId++,
        'enemy',
        e.id,
        e.x + dx * e.radius,
        e.y + dy * e.radius,
        dx,
        dy,
        speed,
        damage,
        { color: '#ff9f43', life: 4.2 },
      ),
    );
  }

  // ---------------------------------------------------------------- 子弹 / 经验球

  stepBullet(b, dt) {
    b.px = b.x;
    b.py = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) b.alive = false;
    if (b.x < -20 || b.y < -20 || b.x > this.arena.w + 20 || b.y > this.arena.h + 20) b.alive = false;
  }

  stepOrbs(dt) {
    for (const o of this.orbs) {
      if (!o.alive) continue;
      o.px = o.x;
      o.py = o.y;
      o.life -= dt;
      if (o.life <= 0) {
        o.alive = false;
        continue;
      }
      const p = this.nearestPlayer(o.x, o.y);
      if (!p) continue;
      const d2 = dist2(o.x, o.y, p.x, p.y);
      const magnet = XP.orbMagnet + p.radius;
      if (d2 < magnet * magnet) {
        const d = Math.sqrt(d2) || 1;
        const pull = 520 * (1 - d / magnet) + 90;
        o.x += ((p.x - o.x) / d) * pull * dt;
        o.y += ((p.y - o.y) / d) * pull * dt;
      }
      if (d2 < (p.radius + XP.orbRadius + 8) ** 2) {
        o.alive = false;
        this.gainXp(p, o.value);
      }
    }
  }

  gainXp(p, raw) {
    const v = raw * p.mods.xpMul;
    p.xp += v;
    let leveled = 0;
    while (p.xp >= p.xpNeed) {
      p.xp -= p.xpNeed;
      p.level++;
      p.xpNeed = XP.need(p.level);
      leveled++;
    }
    if (leveled > 0) {
      p.pendingLevelUps = (p.pendingLevelUps || 0) + leveled;
      this.emit({ type: 'levelUp', x: p.x, y: p.y, level: p.level, playerId: p.id });
      this.tryEnterUpgrade(p);
    }
  }

  // ---------------------------------------------------------------- 碰撞

  resolveBulletHits() {
    // 玩家子弹 → 敌人
    for (const b of this.bullets) {
      if (!b.alive || b.owner !== 'player') continue;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (b.hitIds.indexOf(e.id) !== -1) continue;
        if (!circleHit(b.x, b.y, b.radius, e.x, e.y, e.radius)) continue;

        this.registerHit(b, e);
        b.hitIds.push(e.id);

        if (b.ricochet > 0) {
          b.ricochet--;
          b.damage *= BULLET.ricochetFalloff;
          const next = this.findRicochetTarget(b, e);
          if (next) {
            const n = norm(next.x - b.x, next.y - b.y);
            const sp = Math.hypot(b.vx, b.vy);
            b.vx = n.x * sp;
            b.vy = n.y * sp;
          } else {
            const sp = Math.hypot(b.vx, b.vy);
            const a = Math.atan2(b.vy, b.vx) + this.rng.range(-0.9, 0.9);
            b.vx = Math.cos(a) * sp;
            b.vy = Math.sin(a) * sp;
          }
        } else if (b.pierce > 0) {
          b.pierce--;
          b.damage *= BULLET.pierceFalloff;
        } else {
          b.alive = false;
          break;
        }
      }
    }

    // 敌人子弹 → 玩家
    for (const b of this.bullets) {
      if (!b.alive || b.owner !== 'enemy') continue;
      for (const p of this.players) {
        if (!p.alive) continue;
        if (!circleHit(b.x, b.y, b.radius, p.x, p.y, p.radius)) continue;
        const killed = this.damagePlayer(p, b.damage, b.x, b.y);
        b.alive = false;
        if (killed) break;
      }
    }
  }

  registerHit(b, e) {
    const before = e.hp;
    this.damageEnemy(e, b.damage, b.crit, b.ownerId);
    const dealt = before - e.hp;

    const p = this.getPlayer(b.ownerId);
    if (p) {
      p.stats.hits++;
      p.stats.damage += dealt;
      if (p.mods.explodeOnHit > 0) {
        this.explosion(b.x, b.y, 78, p.mods.explodeOnHit, p.id);
      }
    }

    // 击退
    if (b.knockback) {
      const n = norm(e.x - b.x, e.y - b.y);
      const kb = b.knockback / (1 + (e.radius / 20) ** 2);
      e.knockX += n.x * kb;
      e.knockY += n.y * kb;
    }
  }

  findRicochetTarget(b, exclude) {
    let best = null;
    let bd = 520 * 520;
    for (const e of this.enemies) {
      if (!e.alive || e === exclude) continue;
      if (b.hitIds.indexOf(e.id) !== -1) continue;
      const d = dist2(b.x, b.y, e.x, e.y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  resolveContact() {
    for (const e of this.enemies) {
      if (!e.alive || e.spawnAnim > 0) continue;
      for (const p of this.players) {
        if (!p.alive) continue;
        if (p.dashTime > 0) continue;
        if (!circleHit(e.x, e.y, e.radius, p.x, p.y, p.radius)) continue;

        // 尖刺力场反伤
        if (p.mods.thorns > 0 && e.touchCd <= 0) {
          this.damageEnemy(e, p.mods.thorns, false, p.id);
        }
        const killed = this.damagePlayer(p, e.contactDamage, e.x, e.y);
        if (killed) return;
      }
    }
  }

  separateEnemies() {
    const n = this.enemies.length;
    for (let i = 0; i < n; i++) {
      const a = this.enemies[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < n; j++) {
        const b = this.enemies[j];
        if (!b.alive) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const rr = a.radius + b.radius;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const push = (rr - d) * 0.5;
        const ux = dx / d;
        const uy = dy / d;
        const am = b.type === 'boss' || b.type === 'tank' ? 0.15 : 1;
        const bm = a.type === 'boss' || a.type === 'tank' ? 0.15 : 1;
        a.x -= ux * push * am;
        a.y -= uy * push * am;
        b.x += ux * push * bm;
        b.y += uy * push * bm;
      }
    }
  }

  // ---------------------------------------------------------------- 伤害

  damageEnemy(e, dmg, crit, ownerId) {
    if (!e.alive) return;
    const applied = dmg * (1 - (e.armor || 0));
    e.hp -= applied;
    e.hitFlash = 1;
    this.emit({
      type: 'enemyHit',
      x: e.x,
      y: e.y,
      amount: applied,
      crit: !!crit,
      color: e.color,
      enemyId: e.id,
    });
    if (e.hp <= 0) this.killEnemy(e, ownerId);
  }

  killEnemy(e, ownerId) {
    if (!e.alive) return;
    e.alive = false;
    const def = ENEMIES[e.type];
    const p = this.getPlayer(ownerId);

    if (p) {
      p.stats.kills++;
      if (p.mods.lifestealFlat > 0 && p.alive) {
        p.hp = Math.min(p.maxHp, p.hp + p.mods.lifestealFlat);
        this.emit({ type: 'heal', x: p.x, y: p.y, amount: p.mods.lifestealFlat });
      }
      if (p.mods.explodeOnKill > 0) {
        this.explosion(e.x, e.y, 96, p.mods.explodeOnKill, p.id);
      }
    }

    const xp = Math.round(e.xp);
    this.orbs.push(createOrb(this.nextId++, e.x, e.y, xp));
    this.score += e.type === 'boss' ? 800 : 10 + e.xp * 6;

    this.emit({
      type: 'enemyKill',
      x: e.x,
      y: e.y,
      color: e.color,
      radius: e.radius,
      boss: e.type === 'boss',
      elite: e.elite,
    });

    // 分裂
    if (def.splitInto && !e.elite) {
      for (let i = 0; i < def.splitCount; i++) {
        const a = this.rng.range(0, Math.PI * 2);
        const child = createEnemy(this.nextId++, def.splitInto, e.x + Math.cos(a) * 22, e.y + Math.sin(a) * 22, e.wave, {
          hpMul: WAVE.hpScale(e.wave) * 0.5,
          dmgMul: WAVE.dmgScale(e.wave),
          spdMul: WAVE.speedScale(e.wave) * 1.1,
          cooldown: this.rng.range(0.2, 0.7),
        });
        child.spawnAnim = 0.18;
        this.enemies.push(child);
      }
    }
  }

  explosion(x, y, radius, damage, ownerId) {
    this.emit({ type: 'explosion', x, y, radius, color: '#ffb35c' });
    const r2 = radius * radius;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d2 = dist2(x, y, e.x, e.y);
      if (d2 > r2) continue;
      const f = 1 - Math.sqrt(d2) / radius;
      this.damageEnemy(e, damage * (0.55 + 0.45 * f), false, ownerId);
    }
  }

  /** @returns {boolean} 是否致死 */
  damagePlayer(p, dmg, srcX, srcY) {
    if (!p.alive || p.invuln > 0 || p.dashTime > 0) return false;
    const applied = Math.max(1, dmg - p.mods.armorFlat);
    p.hp -= applied;
    p.invuln = PLAYER.hurtInvuln;
    p.hurtSlow = PLAYER.hurtSlowTime;

    // 受击击退
    const n = norm(p.x - srcX, p.y - srcY);
    p.vx += n.x * PLAYER.contactKnockback;
    p.vy += n.y * PLAYER.contactKnockback;

    this.emit({ type: 'playerHurt', x: p.x, y: p.y, amount: applied, playerId: p.id, hp: p.hp });

    if (p.hp <= 0) {
      p.hp = 0;
      p.alive = false;
      this.emit({ type: 'playerDeath', x: p.x, y: p.y, playerId: p.id });
      if (this.alivePlayers().length === 0) {
        this.phase = 'gameover';
        this.emit({ type: 'gameOver', score: this.score, wave: this.wave });
      }
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------- 波次导演

  stepDirector(dt) {
    if (this.phase === 'rest') {
      this.phaseTime -= dt;
      if (this.phaseTime <= 0) this.startWave();
      return;
    }
    if (this.phase !== 'fight') return;

    const aliveEnemies = this.enemies.length;
    if (this.director.queue.length > 0) {
      this.director.spawnTimer -= dt;
      if (this.director.spawnTimer <= 0 && aliveEnemies < WAVE.maxAlive) {
        this.spawnFromQueue();
        this.director.spawnTimer = WAVE.spawnInterval * this.rng.range(0.75, 1.25);
      }
    } else if (aliveEnemies === 0) {
      this.clearWave();
    }
  }

  startWave() {
    this.wave++;
    this.maxWave = Math.max(this.maxWave, this.wave);
    this.phase = 'fight';
    const plan = planWaveSpawns(this.rng, this.wave);
    this.director.queue = plan.queue;
    this.director.budget = plan.budget;
    this.director.spawnTimer = 0.6;
    this.director.bossPending = plan.boss;
    if (plan.boss) {
      // Boss 先登场，小怪随后填充
      this.director.queue.unshift({ type: 'boss', elite: false });
    }
    this.emit({ type: 'waveStart', wave: this.wave, boss: plan.boss });
  }

  spawnFromQueue() {
    const item = this.director.queue.shift();
    if (!item) return;
    const pos = this.pickSpawnPoint();
    const hpMul = WAVE.hpScale(this.wave) * (item.elite ? 1.9 : 1);
    const e = createEnemy(this.nextId++, item.type, pos.x, pos.y, this.wave, {
      hpMul,
      dmgMul: WAVE.dmgScale(this.wave),
      spdMul: WAVE.speedScale(this.wave),
      elite: item.elite,
      cooldown: this.rng.range(0.3, 1.1),
    });
    e.dirX = this.rng.next() < 0.5 ? -1 : 1;
    if (e.behavior === 'charge') e.cooldown = this.rng.range(0.6, 1.6);
    this.enemies.push(e);
    this.emit({ type: 'enemySpawn', x: pos.x, y: pos.y, radius: ENEMIES[item.type].radius * (item.elite ? 1.4 : 1.2), elite: item.elite, boss: item.type === 'boss' });
  }

  /** 在场内挑一个离玩家足够远的点，避免"贴脸生成"这种不公平死法 */
  pickSpawnPoint() {
    const minDist = 520;
    let bx = this.arena.w / 2;
    let by = this.arena.h / 2;
    let bestScore = -1;
    for (let i = 0; i < 12; i++) {
      const x = this.rng.range(80, this.arena.w - 80);
      const y = this.rng.range(80, this.arena.h - 80);
      const p = this.nearestPlayer(x, y);
      const d = p ? Math.sqrt(dist2(x, y, p.x, p.y)) : minDist;
      if (d >= minDist) return { x, y };
      if (d > bestScore) {
        bestScore = d;
        bx = x;
        by = y;
      }
    }
    return { x: bx, y: by };
  }

  clearWave() {
    this.phase = 'rest';
    this.phaseTime = WAVE.restTime;
    this.score += SCORE.waveClear + this.wave * 40;

    // 清波时把没捡到的经验球直接结算掉。
    // 理由：让玩家为了几个球在残局里冒险跑图，是纯粹的负体验；
    // 而且成长必须跟得上难度曲线，否则第 5 波的 Boss 会变成无法逾越的墙。
    if (this.orbs.length > 0) {
      let banked = 0;
      for (const o of this.orbs) {
        if (o.alive) banked += o.value;
        o.alive = false;
      }
      for (const p of this.players) {
        if (p.alive) this.gainXp(p, banked);
      }
      this.emit({ type: 'xpSweep', amount: banked });
    }

    for (const p of this.players) {
      if (p.alive) p.hp = Math.min(p.maxHp, p.hp + WAVE.clearHeal);
    }
    this.emit({ type: 'waveClear', wave: this.wave, heal: WAVE.clearHeal });
  }

  // ---------------------------------------------------------------- 升级

  tryEnterUpgrade(p) {
    if (this.phase === 'upgrade' || this.phase === 'gameover') return;
    if ((p.pendingLevelUps || 0) <= 0) return;

    const options = rollChoices(this.rng, p, 3);
    if (options.length === 0) {
      p.pendingLevelUps = 0;
      return;
    }
    this.resumePhase = this.phase;
    this.phase = 'upgrade';
    this.upgradeFor = p.id;
    this.upgradeOptions = options.map((u) => u.id);
    this.emit({ type: 'upgradeOffered', playerId: p.id, options: this.upgradeOptions });
  }

  /**
   * 玩家选择升级。联机时这是"客户端意图"，必须由权威端校验 id 是否在
   * 自己下发的 upgradeOptions 中，防止客户端伪造。
   * @returns {boolean} 是否被接受
   */
  chooseUpgrade(playerId, upgradeId) {
    if (this.phase !== 'upgrade' || this.upgradeFor !== playerId) return false;
    if (this.upgradeOptions.indexOf(upgradeId) === -1) return false;
    const up = UPGRADE_BY_ID[upgradeId];
    if (!up) return false;

    const p = this.getPlayer(playerId);
    if (!p) return false;

    applyUpgrade(p, up);
    refreshDerived(p, true);
    p.ammo = Math.min(p.ammo, p.magSize);
    p.pendingLevelUps = Math.max(0, (p.pendingLevelUps || 0) - 1);

    this.emit({ type: 'upgradeTaken', playerId, upgradeId });

    if (p.pendingLevelUps > 0) {
      const options = rollChoices(this.rng, p, 3);
      if (options.length > 0) {
        this.upgradeOptions = options.map((u) => u.id);
        this.emit({ type: 'upgradeOffered', playerId, options: this.upgradeOptions });
        return true;
      }
      p.pendingLevelUps = 0;
    }

    this.phase = this.resumePhase === 'rest' ? 'rest' : 'fight';
    this.upgradeFor = null;
    this.upgradeOptions = [];
    return true;
  }

  // ---------------------------------------------------------------- 收尾

  cleanup() {
    if (this.bullets.some((b) => !b.alive)) this.bullets = this.bullets.filter((b) => b.alive);
    if (this.orbs.some((o) => !o.alive)) this.orbs = this.orbs.filter((o) => o.alive);
    if (this.enemies.some((e) => !e.alive)) this.enemies = this.enemies.filter((e) => e.alive);
    this.events.length = 0;
  }

  // ---------------------------------------------------------------- 快照

  /**
   * 序列化整份世界状态。
   * 用途：联机时新玩家中途加入(发送基线快照)、断线重连、录像回放、回滚重模拟。
   * 因为所有实体都是纯数据，这里直接 JSON 深拷贝即可。
   */
  snapshot() {
    return JSON.parse(
      JSON.stringify({
        seed: this.seed,
        rngState: this.rng.saveState(),
        tick: this.tick,
        nextId: this.nextId,
        arena: this.arena,
        phase: this.phase,
        resumePhase: this.resumePhase,
        phaseTime: this.phaseTime,
        wave: this.wave,
        maxWave: this.maxWave,
        score: this.score,
        director: this.director,
        upgradeFor: this.upgradeFor,
        upgradeOptions: this.upgradeOptions,
        players: this.players,
        enemies: this.enemies,
        bullets: this.bullets,
        orbs: this.orbs,
      }),
    );
  }

  static fromSnapshot(snap) {
    const w = new World({ seed: snap.seed });
    Object.assign(w, {
      tick: snap.tick,
      nextId: snap.nextId,
      arena: snap.arena,
      phase: snap.phase,
      resumePhase: snap.resumePhase,
      phaseTime: snap.phaseTime,
      wave: snap.wave,
      maxWave: snap.maxWave,
      score: snap.score,
      director: snap.director,
      upgradeFor: snap.upgradeFor,
      upgradeOptions: snap.upgradeOptions,
      players: snap.players,
      enemies: snap.enemies,
      bullets: snap.bullets,
      orbs: snap.orbs,
    });
    w.rng.loadState(snap.rngState);
    w.events = [];
    w.eventSink = [];
    return w;
  }

  /** 便于网络传输的极简校验和，可用于快速检测客户端/服务端分歧 */
  checksum() {
    let h = this.tick >>> 0;
    for (const p of this.players) {
      h = (Math.imul(h, 31) + ((p.x * 16) | 0)) >>> 0;
      h = (Math.imul(h, 31) + ((p.y * 16) | 0)) >>> 0;
      h = (Math.imul(h, 31) + ((p.hp * 16) | 0)) >>> 0;
    }
    for (const e of this.enemies) {
      h = (Math.imul(h, 31) + ((e.x * 8) | 0)) >>> 0;
      h = (Math.imul(h, 31) + ((e.hp * 8) | 0)) >>> 0;
    }
    h = (Math.imul(h, 31) + this.bullets.length) >>> 0;
    h = (Math.imul(h, 31) + this.orbs.length) >>> 0;
    return h;
  }
}

export { COST, ENEMIES };
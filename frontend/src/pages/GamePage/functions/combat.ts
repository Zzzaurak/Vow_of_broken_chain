import { directionVector, nearestForwardEnemy } from './targeting';
import {
  attackShape,
  coneReach,
  coneHalfAngle,
  hazardWarningSeconds,
  runeLanding,
} from './enemyAttack';
import { clearPath, pursuitDirection } from './navigation';
import { balance, encounters, mapById } from '../objects/content';
import type { EnemyKind } from '../objects/content';
import type {
  Enemy,
  FrameInput,
  GameState,
  Hazard,
  Projectile,
  Vec,
  VisualEffect,
} from '../objects/game';
import {
  add,
  distance,
  facing,
  length,
  movePosition,
  normalize,
  subtract,
  validPosition,
} from './geometry';
import { notify, spawnWave, victory, dialogueMode, crossExit } from './progression';
const decay = (v: number, dt: number) => Math.max(0, v - dt);
const isBoss = (kind: EnemyKind) => ['glm', 'gpt', 'claude', 'pope'].includes(kind);
const cooldowns = (s: GameState, dt: number) =>
  Object.fromEntries(
    Object.entries(s.snapshot.cooldowns).map(([k, v]) => [k, decay(v, dt)]),
  ) as GameState['snapshot']['cooldowns'];
function damageEnemy(enemy: Enemy, amount: number, source: Vec, pierce = false): Enemy {
  const front = normalize(subtract(source, enemy.position));
  if (
    enemy.kind === 'knight' &&
    enemy.broken <= 0 &&
    !pierce &&
    front.x * enemy.aim.x + front.y * enemy.aim.y > 0.25
  )
    return enemy;
  if (enemy.shield > 0) {
    const shield = Math.max(0, enemy.shield - amount);
    return {
      ...enemy,
      shield,
      phase: shield === 0 ? 'recover' : enemy.phase,
      timer: shield === 0 ? 3 : enemy.timer,
    };
  }
  if (enemy.kind === 'claude') return enemy;
  return { ...enemy, hp: Math.max(0, enemy.hp - amount) };
}
function interruptMage(enemy: Enemy): Enemy {
  return enemy.kind === 'mage' && enemy.phase === 'windup'
    ? { ...enemy, phase: 'recover', timer: balance.enemies.mage.recovery }
    : enemy;
}
function areaDamage(
  state: GameState,
  point: Vec,
  radius: number,
  damage: number,
  pierce = false,
): GameState {
  return {
    ...state,
    enemies: state.enemies.map((e) =>
      distance(e.position, point) < radius
        ? damageEnemy(interruptMage(e), damage, state.snapshot.position, pierce)
        : e,
    ),
  };
}
function flash(
  state: GameState,
  kind: VisualEffect['kind'],
  position: Vec,
  duration: number,
): GameState {
  return {
    ...state,
    serial: state.serial + 1,
    effects: [...state.effects, { id: state.serial + 1, kind, position, age: 0, duration }],
  };
}
export function hitPlayer(state: GameState, baseDamage: number, continuous = false): GameState {
  if (state.invulnerable > 0 && !continuous) return state;
  const damage =
    baseDamage *
    (state.snapshot.difficulty === 'hard' ? 2 : 1) *
    (state.barrier > 0 ? balance.supports.claude.damageMultiplier : 1);
  return {
    ...state,
    snapshot: { ...state.snapshot, hp: Math.max(0, state.snapshot.hp - damage) },
    invulnerable: continuous ? state.invulnerable : 0.5,
    dirty: true,
  };
}
function playerActions(state: GameState, input: FrameInput, dt: number): GameState {
  let next = state;
  const locked = next.enemies.find((e) => e.id === next.lockedEnemy && e.hp > 0);
  const aim = input.aim
    ? normalize(input.aim)
    : locked
      ? normalize(subtract(locked.position, next.snapshot.position))
      : length(input.move) > 0
        ? normalize(input.move)
        : next.aim;
  const requestedTarget =
    input.target ?? locked?.position ?? add(next.snapshot.position, aim, balance.player.waterRange);
  const target = add(
    next.snapshot.position,
    aim,
    Math.min(balance.player.waterRange, distance(next.snapshot.position, requestedTarget)),
  );
  next = {
    ...next,
    aim,
    direction: facing(length(input.move) > 0 ? input.move : aim),
    lockedEnemy: input.aim ? null : next.lockedEnemy,
  };
  if (!next.action && input.melee && next.meleeCooldown <= 0)
    next = {
      ...next,
      action: { kind: 'melee', age: 0, fired: false, aim, target },
      meleeCooldown: balance.player.meleeInterval,
    };
  if (!next.action && input.water) {
    if (next.snapshot.mp < balance.player.waterCost)
      next = notify(next, 'MP 不足，稍候回复或使用摆尾。');
    else if (next.snapshot.cooldowns.water > 0) next = notify(next, '深海之力尚在冷却。');
    else
      next = {
        ...next,
        action: { kind: 'cast', age: 0, fired: false, aim, target },
        snapshot: {
          ...next.snapshot,
          mp: next.snapshot.mp - balance.player.waterCost,
          cooldowns: { ...next.snapshot.cooldowns, water: balance.player.waterCooldown },
        },
        dirty: true,
      };
  }
  if (input.support !== null && next.mode.kind === 'battle') {
    const partner = next.snapshot.supports[input.support];
    const selected =
      partner === 'gpt'
        ? nearestForwardEnemy(
            next.enemies,
            next.snapshot.position,
            directionVector[next.direction],
            balance.player.waterRange,
          )
        : undefined;
    if (next.snapshot.mapId === 'garden') next = notify(next, '这一次，只属于大肥鱼与 Claude。');
    else if (!partner) next = notify(next, '这个援助槽还没有伙伴。');
    else if (next.snapshot.cooldowns[partner] > 0) next = notify(next, '伙伴援助尚在冷却。');
    else if (partner === 'gpt' && !selected)
      next = notify(next, '前方没有可攻击的敌人，请调整朝向。');
    else
      next = {
        ...next,
        casts: [
          ...next.casts,
          {
            partner,
            age: 0,
            fired: false,
            position: add(next.snapshot.position, directionVector[next.direction], -48),
            target: selected ? { ...selected.position } : target,
          },
        ],
        snapshot: {
          ...next.snapshot,
          cooldowns: { ...next.snapshot.cooldowns, [partner]: balance.supports[partner].cooldown },
        },
        dirty: true,
      };
  }
  if (next.action) {
    const action = { ...next.action, age: next.action.age + dt };
    if (!action.fired && action.age >= (action.kind === 'melee' ? 0.11 : 0.12)) {
      action.fired = true;
      if (action.kind === 'melee') {
        next = {
          ...next,
          enemies: next.enemies.map((e) => {
            const v = subtract(e.position, next.snapshot.position),
              unit = normalize(v);
            return length(v) < balance.player.meleeRange &&
              unit.x * action.aim.x + unit.y * action.aim.y > -0.1
              ? damageEnemy(e, balance.player.meleeDamage, next.snapshot.position)
              : e;
          }),
        };
        next = flash(next, 'melee', add(next.snapshot.position, action.aim, 42), 0.22);
      } else {
        next = {
          ...next,
          serial: next.serial + 1,
          projectiles: [
            ...next.projectiles,
            {
              id: next.serial + 1,
              position: next.snapshot.position,
              direction: normalize(subtract(action.target, next.snapshot.position)),
              target: action.target,
              speed: balance.player.waterSpeed,
              distance: Math.min(
                balance.player.waterRange,
                distance(next.snapshot.position, action.target),
              ),
              damage: balance.player.waterDamage,
              enemy: false,
              homing: false,
            },
          ],
        };
      }
    }
    next = {
      ...next,
      action: action.age > (action.kind === 'melee' ? 0.34 : 0.38) ? null : action,
    };
  }
  const castResults = next.casts.map((c) => ({ ...c, age: c.age + dt }));
  for (const cast of castResults.filter((c) => !c.fired && c.age >= 0.26)) {
    cast.fired = true;
    if (cast.partner === 'glm') {
      next = {
        ...next,
        enemies: next.enemies.map((e) =>
          distance(e.position, next.snapshot.position) < balance.supports.glm.radius
            ? { ...interruptMage(e), slowed: isBoss(e.kind) ? 1 : 3 }
            : e,
        ),
      };
      next = flash(next, 'glm', next.snapshot.position, 3);
    } else if (cast.partner === 'gpt') {
      next = areaDamage(
        next,
        cast.target,
        balance.supports.gpt.radius,
        balance.supports.gpt.damage,
        true,
      );
      next = {
        ...next,
        enemies: next.enemies.map((e) =>
          distance(e.position, cast.target) < balance.supports.gpt.radius && !isBoss(e.kind)
            ? {
                ...e,
                broken: 3,
                phase: 'recover',
                timer: 1,
                position: movePosition(
                  e.position,
                  add(
                    { x: 0, y: 0 },
                    normalize(
                      distance(e.position, cast.target) > 0
                        ? subtract(e.position, cast.target)
                        : subtract(e.position, next.snapshot.position),
                    ),
                    55,
                  ),
                  mapById(next.snapshot.mapId),
                ),
              }
            : e,
        ),
      };
      next = flash(next, 'gpt', cast.target, 0.8);
    } else {
      const cleansing = next.hazards.some((h) => h.kind === 'bind');
      next = {
        ...next,
        barrier: 5,
        bound: 0,
        hazards: next.hazards.filter((h) => h.kind !== 'bind'),
        enemies: next.enemies.map((e) =>
          cleansing && e.kind === 'pope' ? { ...e, phase: 'recover', timer: 5 } : e,
        ),
      };
      next = flash(next, 'claude', next.snapshot.position, 5);
    }
  }
  return { ...next, casts: castResults.filter((c) => c.age < 0.6) };
}
function projectilesStep(state: GameState, dt: number): GameState {
  return state.projectiles.reduce<GameState>(
    (next, p) => {
      const direction = p.homing
        ? normalize(
            add(p.direction, normalize(subtract(next.snapshot.position, p.position)), dt * 0.8),
          )
        : p.direction;
      const travel = Math.min(p.distance, p.speed * dt);
      const position = add(p.position, direction, travel),
        remaining = p.distance - travel;
      const blocked = !validPosition(position, mapById(next.snapshot.mapId));
      if (p.enemy && blocked) return next;
      if (p.enemy) {
        if (distance(position, next.snapshot.position) < 22) return hitPlayer(next, p.damage);
        if (remaining <= 0) return next;
      } else if (
        blocked ||
        remaining <= 0 ||
        next.enemies.some((e) => e.hp > 0 && distance(position, e.position) < 26)
      ) {
        return flash(
          areaDamage(next, position, balance.player.waterRadius, p.damage),
          'water',
          position,
          0.36,
        );
      }
      return {
        ...next,
        projectiles: [...next.projectiles, { ...p, position, direction, distance: remaining }],
      };
    },
    { ...state, projectiles: [] },
  );
}
function enemyStep(state: GameState, dt: number): GameState {
  const map = mapById(state.snapshot.mapId);
  return state.enemies.reduce<GameState>(
    (next, original) => {
      if (original.hp <= 0) return { ...next, enemies: [...next.enemies, original] };
      const spec = balance.enemies[original.kind];
      let enemy: Enemy = {
        ...original,
        timer: decay(original.timer, dt),
        slowed: decay(original.slowed, dt),
        broken: decay(original.broken, dt),
      };
      if (enemy.kind === 'pope' && !enemy.phaseTwo && enemy.hp <= enemy.maxHp * 0.5) {
        enemy = { ...enemy, phaseTwo: true, phase: 'recover', timer: 1.5 };
        next = notify(next, '神格崩裂 · 第二阶段！用 Claude 的结界净化禁锢。');
      }
      if (enemy.slowed > 0 && !isBoss(enemy.kind))
        return { ...next, enemies: [...next.enemies, enemy] };
      if (enemy.phase === 'chase') {
        const aim = normalize(subtract(next.snapshot.position, enemy.position));
        enemy = { ...enemy, aim };
        if (
          distance(enemy.position, next.snapshot.position) < spec.range &&
          clearPath(enemy.position, next.snapshot.position, map)
        )
          enemy = { ...enemy, phase: 'windup', timer: spec.windup };
        else
          enemy = {
            ...enemy,
            position: movePosition(
              enemy.position,
              add(
                { x: 0, y: 0 },
                pursuitDirection(enemy.position, next.snapshot.position, map),
                spec.speed * dt * (enemy.slowed > 0 ? 0.4 : 1),
              ),
              map,
            ),
          };
      } else if (enemy.phase === 'windup' && enemy.timer <= 0) {
        const shape = attackShape(enemy, map.id);
        if (shape === 'cone') {
          const aimed = normalize(subtract(next.snapshot.position, enemy.position));
          const inCone = aimed.x * enemy.aim.x + aimed.y * enemy.aim.y > Math.cos(coneHalfAngle);
          if (
            inCone &&
            distance(enemy.position, next.snapshot.position) < coneReach(enemy) &&
            clearPath(enemy.position, next.snapshot.position, map)
          )
            next = hitPlayer(next, spec.damage);
          if (enemy.kind === 'knight' || enemy.kind === 'hound')
            enemy = {
              ...enemy,
              position: movePosition(enemy.position, add({ x: 0, y: 0 }, enemy.aim, 65), map),
            };
        } else if (shape === 'ground') {
          if (enemy.kind === 'glm') {
            const position = runeLanding(next.snapshot.position, next.aim, enemy.position, map);
            enemy = {
              ...enemy,
              position,
              aim: normalize(subtract(next.snapshot.position, position)),
            };
          }
          const kind: Hazard['kind'] =
            enemy.kind === 'glm'
              ? 'page'
              : enemy.kind === 'claude'
                ? 'petal'
                : enemy.kind === 'pope' || enemy.kind === 'mage'
                  ? 'bind'
                  : 'blast';
          const radius = enemy.kind === 'pope' ? 145 : enemy.kind === 'gpt' ? 95 : 70;
          const points =
            enemy.kind === 'pope'
              ? [next.snapshot.position, { x: map.width * 16, y: map.height * 16 }]
              : [next.snapshot.position];
          next = {
            ...next,
            serial: next.serial + points.length,
            hazards: [
              ...next.hazards,
              ...points.map((position, i) => ({
                id: next.serial + i + 1,
                position: { ...position },
                radius,
                timer: 0,
                duration: kind === 'blast' || kind === 'page' ? 0.25 : 3,
                damage: spec.damage,
                kind,
                fired: false,
              })),
            ],
          };
        } else {
          const projectile: Projectile = {
            id: next.serial + 1,
            position: enemy.position,
            direction: enemy.aim,
            target: next.snapshot.position,
            speed: 180,
            distance: 700,
            damage: spec.damage,
            enemy: true,
            homing: enemy.kind === 'pope' && enemy.attack % 2 === 1,
          };
          next = {
            ...next,
            serial: next.serial + 1,
            projectiles: [...next.projectiles, projectile],
          };
        }
        enemy = { ...enemy, phase: 'recover', timer: spec.recovery, attack: enemy.attack + 1 };
      } else if (enemy.phase === 'recover' && enemy.timer <= 0)
        enemy = { ...enemy, phase: 'chase' };
      return { ...next, enemies: [...next.enemies, enemy] };
    },
    { ...state, enemies: [] },
  );
}
function hazardsStep(state: GameState, dt: number): GameState {
  const cleansing = state.barrier > 0 && state.hazards.some((h) => h.kind === 'bind');
  const active = cleansing
    ? {
        ...state,
        bound: 0,
        hazards: state.hazards.filter((h) => h.kind !== 'bind'),
        enemies: state.enemies.map((e) =>
          e.kind === 'pope' ? { ...e, phase: 'recover' as const, timer: 5 } : e,
        ),
      }
    : state;
  return active.hazards.reduce<GameState>(
    (next, h) => {
      const hazard = { ...h, timer: h.timer + dt };
      if (hazard.timer > hazardWarningSeconds + hazard.duration) return next;
      if (
        hazard.timer >= hazardWarningSeconds &&
        distance(hazard.position, next.snapshot.position) < hazard.radius
      ) {
        if (hazard.kind === 'petal') next = { ...next, slow: 0.3 };
        else if (hazard.kind === 'bind') {
          if (next.barrier <= 0)
            next = hitPlayer({ ...next, bound: 0.3 }, hazard.damage * dt, true);
        } else if (!hazard.fired) next = hitPlayer(next, hazard.damage);
      }
      return {
        ...next,
        hazards: [...next.hazards, { ...hazard, fired: hazard.timer >= hazardWarningSeconds }],
      };
    },
    { ...active, hazards: [] },
  );
}
function resolveBattle(state: GameState): GameState {
  const map = mapById(state.snapshot.mapId),
    encounter = encounters.find((e) => e.id === map.encounter);
  if (!encounter) return state;
  const special = state.enemies[0];
  const success =
    encounter.rule === 'surrender'
      ? special && special.hp < special.maxHp * 0.3
      : encounter.rule === 'trial'
        ? special && special.shield === 0 && special.hp < special.maxHp
        : encounter.rule === 'shield'
          ? special && special.shield === 0
          : false;
  if (success) return victory(state);
  if (encounter.rule === 'shield' && special) {
    const call = special.shield <= 42 ? '5-B-call-2' : special.shield <= 98 ? '5-B-call-1' : null;
    if (call && !state.calls.includes(call))
      return { ...state, calls: [...state.calls, call], mode: dialogueMode(call, 'fight') };
  }

  if (state.enemies.length && state.enemies.every((e) => e.hp <= 0)) {
    if (state.wave + 1 < encounter.waves.length) {
      const enemies = spawnWave(state, state.wave + 1);
      return notify(
        { ...state, enemies, wave: state.wave + 1, serial: state.serial + enemies.length },
        `第 ${state.wave + 2} 波守卫`,
      );
    }
    return victory(state);
  }
  return state;
}
export function stepGame(state: GameState, input: FrameInput, dt: number): GameState {
  if (state.mode.kind !== 'explore' && state.mode.kind !== 'battle') return state;
  const map = mapById(state.snapshot.mapId),
    movement = length(input.move) > 0 ? normalize(input.move) : { x: 0, y: 0 };
  const speed = state.bound > 0 ? 0 : balance.player.speed * (state.slow > 0 ? 0.45 : 1);
  let next: GameState = {
    ...state,
    snapshot: {
      ...state.snapshot,
      position: movePosition(
        state.snapshot.position,
        add({ x: 0, y: 0 }, movement, speed * dt),
        map,
      ),
      mp: Math.min(100, state.snapshot.mp + balance.player.mpRegeneration * dt),
      cooldowns: cooldowns(state, dt),
      playSeconds: state.snapshot.playSeconds + dt,
    },
    moving: length(movement) > 0 && speed > 0,
    walkTime: state.walkTime + dt,
    simulationTime: state.simulationTime + dt,
    meleeCooldown: decay(state.meleeCooldown, dt),
    invulnerable: decay(state.invulnerable, dt),
    bound: decay(state.bound, dt),
    slow: decay(state.slow, dt),
    barrier: decay(state.barrier, dt),
    toastTime: decay(state.toastTime, dt),
    effects: state.effects
      .map((e) => ({ ...e, age: e.age + dt }))
      .filter((e) => e.age < e.duration),
    dirty: state.dirty || length(movement) > 0,
  };
  next = playerActions(next, input, dt);
  next = projectilesStep(next, dt);
  if (next.mode.kind === 'battle') {
    // Resolve player success before enemy damage: the dragon trial cannot turn a winning hit into defeat.
    next = resolveBattle(next);
    if (next.mode.kind !== 'battle') return next;
    next = hazardsStep(enemyStep(next, dt), dt);
    if (next.snapshot.hp <= 0)
      return { ...next, mode: { kind: 'failed', elapsed: 0 }, action: null, moving: false };
  }
  return crossExit(next);
}

import type { Enemy } from '../objects/game';

/** Original pixel silhouettes; behavior is shared independently of each creature's appearance. */
export function drawWildlife(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number): boolean {
  if (
    !['sprout', 'rabbit', 'spider', 'crab', 'golem', 'lizard', 'slime', 'officer'].includes(
      enemy.kind,
    )
  )
    return false;
  const step = enemy.phase === 'chase' ? Math.round(Math.sin(time * 9 + enemy.id) * 2) : 0;
  ctx.save();
  ctx.translate(Math.round(enemy.position.x), Math.round(enemy.position.y));
  ctx.scale(enemy.aim.x > 0 ? -1 : 1, 1);
  const r = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };
  const eye = (x: number, y: number) => {
    r(x, y, 7, 7, '#172a35');
    r(x, y, 3, 3, '#f1e5ae');
  };
  if (enemy.kind === 'sprout') {
    r(-17, -40 + step, 34, 32, '#69583c');
    r(-12, -36 + step, 9, 26, '#93754b');
    r(-22, -13, 12, 12 + step, '#6f6243');
    r(9, -13, 12, 12 - step, '#6f6243');
    r(-27, -60 + step, 46, 26, '#38684b');
    r(-18, -68 + step, 28, 25, '#69975c');
    r(6, -59 + step, 21, 18, '#87a968');
    eye(-11, -31 + step);
    eye(5, -31 + step);
  } else if (enemy.kind === 'rabbit') {
    r(-21, -35 + step, 43, 27, '#aaaaba');
    r(-29, -44 + step, 26, 25, '#d2c7c2');
    r(-26, -69 + step, 9, 30, '#cfc5c4');
    r(-12, -65 + step, 9, 27, '#bcb5c2');
    r(-23, -65 + step, 3, 20, '#c58fa3');
    r(-9, -60 + step, 3, 16, '#c58fa3');
    r(18, -32 + step, 12, 12, '#e0d5ca');
    r(-23, -11, 17, 10 + step, '#b9b0b7');
    r(5, -11, 19, 10 - step, '#b9b0b7');
    eye(-24, -37 + step);
  } else if (enemy.kind === 'spider' || enemy.kind === 'crab') {
    const spider = enemy.kind === 'spider';
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) {
        r(side < 0 ? -38 - i * 2 : 17, -37 + i * 10 + (i % 2 ? step : -step), 24, 5, '#777a8e');
        r(side < 0 ? -41 - i * 2 : 36 + i * 2, -33 + i * 10, 5, 10, '#9ba4ac');
      }
    r(-25, -46 + step, 50, 33, spider ? '#535879' : '#75644e');
    r(-17, -54 + step, 34, 38, spider ? '#7982a1' : '#b39d71');
    r(-9, -61 + step, 18, 29, spider ? '#aec9d3' : '#d0b97f');
    if (!spider) {
      r(-13, -43 + step, 23, 5, '#665543');
      r(5, -42 + step, 5, 20, '#665543');
      r(-8, -25 + step, 16, 5, '#665543');
      r(-40, -16, 13, 14, '#b19b6b');
      r(27, -16, 13, 14, '#b19b6b');
    }
    eye(-17, -18 + step);
    eye(9, -18 + step);
  } else if (enemy.kind === 'golem') {
    r(-31, -61 + step, 62, 47, '#6c7c83');
    r(-22, -89 + step, 44, 31, '#98b0b5');
    r(-15, -83 + step, 28, 8, '#bed4d4');
    r(-46, -59 + step, 17, 40, '#849a9f');
    r(29, -59 - step, 17, 40, '#849a9f');
    r(-25, -17, 19, 17 + step, '#849a9f');
    r(7, -17, 19, 17 - step, '#849a9f');
    r(-8, -54 + step, 16, 22, '#9fd4dd');
    eye(-14, -72 + step);
    eye(8, -72 + step);
  } else if (enemy.kind === 'lizard') {
    r(8, -25 + step, 40, 9, '#7197ad');
    r(37, -21 + step, 18, 6, '#8eb0c0');
    r(-24, -36 + step, 51, 24, '#6d91a9');
    r(-34, -42 + step, 25, 22, '#abc7cf');
    r(-17, -56 - step, 13, 30, '#a3c4d2');
    r(-4, -65 - step, 18, 38, '#80a9bd');
    r(14, -53 - step, 12, 26, '#bdd4db');
    r(-19, -14, 9, 13 + step, '#a1bfcb');
    r(16, -14, 9, 13 - step, '#a1bfcb');
    eye(-29, -36 + step);
  } else if (enemy.kind === 'slime') {
    r(-30, -23 + step, 60, 23 - step, '#6ca2bf');
    r(-24, -39 + step, 48, 29, '#8cbacb');
    r(-15, -50 + step, 30, 32, '#bad8df');
    r(-21, -30 + step, 7, 12, '#e1edf0');
    r(13, -23 + step, 8, 16, '#a8d5df');
    eye(-10, -20 + step);
    eye(6, -20 + step);
  } else {
    r(-23, -58 + step, 46, 40, '#52576b');
    r(-17, -78 + step, 34, 25, '#82939e');
    r(-20, -82 + step, 40, 6, '#b8ab77');
    r(-10, -72 + step, 22, 5, '#d3be7d');
    r(-27, -61 + step, 54, 9, '#9b8b62');
    r(-19, -18, 13, 18 + step, '#7f909a');
    r(7, -18, 13, 18 - step, '#7f909a');
    r(-40, -54 + step, 19, 40, '#9d8b5d');
    r(-35, -49 + step, 9, 29, '#51667a');
    r(28, -71, 5, 67, '#b7c9cb');
  }
  ctx.restore();
  return true;
}

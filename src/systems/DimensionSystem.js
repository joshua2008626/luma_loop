// Platform tuple: [x, y, w, h, d]  d: 0 = both worlds, 1 = Light only, 2 = Shadow only. dim: 0 = Light, 1 = Shadow.
export const isActive = (q, dim) => q[4] === 0 || q[4] === dim + 1;
export const overlaps = (r, q) => r.x < q[0] + q[2] && r.x + r.w > q[0] && r.y < q[1] + q[3] && r.y + r.h > q[1];
// Fair-switch rule: refuse if standing on a platform that would vanish, or if the player would end up inside a solid.
export function canSwitch(player, platforms, dim, grounded) {
  const nd = 1 - dim;
  const standingOnVanishing = grounded && platforms.some(q =>
    isActive(q, dim) && !isActive(q, nd) &&
    player.x < q[0] + q[2] && player.x + player.w > q[0] && Math.abs(player.y + player.h - q[1]) < 3);
  if (standingOnVanishing) return { ok: false, reason: 'vanishing-platform' };
  if (platforms.some(q => isActive(q, nd) && overlaps(player, q))) return { ok: false, reason: 'blocked' };
  return { ok: true };
}

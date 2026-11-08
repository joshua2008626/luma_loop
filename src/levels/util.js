// Fragments floating above the given platform indices.
export const frag = (P, ids) => ids.map(i => [P[i][0] + P[i][2] / 2, P[i][1] - 35]);
// Optional 6th platform element: { mx, my, t } moving (oscillates by mx,my over period t seconds),
// { on, off, ph } timed (visible on seconds, hidden off seconds, phase offset), { fall: 1 } falls 0.5s after being stood on, returns after 2.5s more.

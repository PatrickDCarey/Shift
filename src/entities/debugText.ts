/**
 * Text for the dev-only debug overlay (backtick). Pure.
 * Owner: gameplay-engineer [scene].
 */
import type { SimState } from '../core/types';

export function debugText(state: SimState, fps: number): string {
  const p = state.player;
  return [
    `band ${p.band}  gear ${p.gear}`,
    `vx ${p.vx.toFixed(2)}  vy ${p.vy.toFixed(2)}`,
    `x ${p.x.toFixed(2)}  y ${p.y.toFixed(2)}`,
    `step ${state.step}  ${state.status}${p.grounded ? '  grounded' : ''}`,
    `grace ${p.graceSteps}  coyote ${p.coyoteSteps}  air ${p.airDistance.toFixed(1)}`,
    `${Math.round(fps)} fps`,
  ].join('\n');
}

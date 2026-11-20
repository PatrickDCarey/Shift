/**
 * The Tandem camera's park pan (tandem.md, camera answers): when one body goes
 * home and the framing moves from the midpoint to the remaining body, the focus
 * glides there over about a quarter of a second instead of snapping. Instant
 * under reduced motion. Render only; whole pixels in and out.
 *
 * Owner: gameplay-engineer [scene].
 */
export interface Focus {
  readonly x: number;
  readonly y: number;
}

export const PAN_MS = 250;

const smooth = (t: number): number => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number): number => Math.round(a + (b - a) * t);

export class FocusPan {
  private shown: Focus | null = null;
  private activeBodies = 0;
  private from: Focus | null = null;
  private elapsed = 0;

  /**
   * The focus to scroll to this frame. `target` is the framing's focus, `active`
   * the number of bodies not home. A pan starts when `active` drops (but stays
   * above 0) and the target is not where the camera already looks.
   */
  apply(target: Focus, active: number, deltaMs: number, reduced: boolean): Focus {
    const shown = this.shown;
    if (reduced || shown === null || active > this.activeBodies) this.from = null;
    else if (active > 0 && active < this.activeBodies && (shown.x !== target.x || shown.y !== target.y)) {
      this.from = shown;
      this.elapsed = 0;
    }
    this.activeBodies = active;
    this.shown = this.step(target, deltaMs);
    return this.shown;
  }

  private step(target: Focus, deltaMs: number): Focus {
    if (this.from === null) return target;
    this.elapsed += Math.max(0, deltaMs);
    if (this.elapsed >= PAN_MS) {
      this.from = null;
      return target;
    }
    const t = smooth(this.elapsed / PAN_MS);
    return { x: mix(this.from.x, target.x, t), y: mix(this.from.y, target.y, t) };
  }
}

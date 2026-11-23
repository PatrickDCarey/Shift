/**
 * Checkpoint posts (checkpoints.md "Readability"): one sprite per `level.checkpoints` entry, idle until
 * the lit index reaches it, then the 3-frame rise once and `lit`. Reduced motion skips the rise. A post
 * was lit on a step iff `state.checkpoint.index` changed; there is no sim event. Created only for levels
 * with posts. Render only; owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import type { Level, SimState } from '../core/types';
import { PIXEL_KEYS, POST_RISE_FRAMES, postFrameNames } from '../fx';

const DEPTH_POST = 1.5; // above the exit, below hints and bodies
export const RISE_MS_PER_FRAME = 60;

const NAMES = postFrameNames();

/** The frame for one post. `sinceLitMs` is null unless it lit within the rise window. */
export function postFrame(lit: boolean, sinceLitMs: number | null, reduced: boolean): string {
  if (!lit) return NAMES.idle;
  if (reduced || sinceLitMs === null) return NAMES.lit;
  const n = Math.floor(sinceLitMs / RISE_MS_PER_FRAME);
  return n < POST_RISE_FRAMES ? NAMES.rise(n) : NAMES.lit;
}

/** Index to announce when `now` lit a post that `before` had not: the new index, else null. */
export function newlyLit(before: number | null, now: SimState): number | null {
  const index = now.checkpoint?.index ?? null;
  return index !== null && (before === null || index > before) ? index : null;
}

export class PostView {
  private readonly sprites: Phaser.GameObjects.Image[];
  private lit: number | null = null;
  private litAtMs = 0;

  /** Null when the level has no posts. */
  static forLevel(scene: Phaser.Scene, level: Level, tileSize: number, onLit: () => void): PostView | null {
    const posts = level.checkpoints ?? [];
    return posts.length === 0 ? null : new PostView(scene, level, tileSize, onLit);
  }

  private constructor(
    scene: Phaser.Scene,
    level: Level,
    tileSize: number,
    private readonly onLit: () => void,
  ) {
    this.sprites = (level.checkpoints ?? []).map((p) =>
      scene.add.image((p.cell.col + 0.5) * tileSize, (p.cell.row + 1) * tileSize, PIXEL_KEYS.kinetics, NAMES.idle).setOrigin(0.5, 1).setDepth(DEPTH_POST),
    );
  }

  /** Once per rendered frame. A full restart (field gone) unlights every post. */
  update(state: SimState, timeMs: number, reduced: boolean): void {
    const index = state.checkpoint?.index ?? null;
    const fresh = newlyLit(this.lit, state);
    if (fresh !== null) {
      this.litAtMs = timeMs;
      this.onLit();
    }
    this.lit = index;
    const since = timeMs - this.litAtMs;
    this.sprites.forEach((s, i) => {
      const isLit = index !== null && i <= index;
      s.setFrame(postFrame(isLit, i === index && since >= 0 ? since : null, reduced));
    });
  }

  destroy(): void {
    this.sprites.forEach((s) => s.destroy());
  }
}

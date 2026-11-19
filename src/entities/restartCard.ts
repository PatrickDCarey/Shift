/**
 * The restart card's pure model (restart-prompt.md): when it shows, where it
 * sits and how it is laid out. A non-home body that has been in a sealed pocket
 * for 1 s of sim steps gets a `[R] RESTART` card, bottom centre, until the run
 * restarts or respawns. Render only: nothing here touches the sim. The view is
 * `RestartCardView.ts`; the per-frame glue is `RestartCardController.ts`.
 *
 * The delay is a UI constant (one second of steps, converted with `stepHz`),
 * not a gameplay number.
 *
 * Owner: gameplay-engineer [scene].
 */
import { ADVANCE, textWidth } from '../fx';
import { VIEW_H, VIEW_W } from '../fx/pixel';
import { DEFAULT_BINDINGS, type Bindings } from '../ui';
import { HUD_BOTTOM } from './GameHud';
import { hintCapLabel, HINT_CAP_H } from './hintLayout';
import { pocketAt, type SealedPocket } from './sealedPockets';

/** The canvas the card is placed on. */
export const VIEW = { w: VIEW_W, h: VIEW_H } as const;
/** The raised card sits just under the HUD. */
export { HUD_BOTTOM };
const EDGE_MARGIN = 8;
const TIP_GAP = 4;
const PAD = 4;
const CAP_GAP = 4;
export const CARD_WORD = 'RESTART';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface CardLayout {
  readonly w: number;
  readonly h: number;
  /** Key cap rectangle, relative to the card's top-left. */
  readonly cap: Rect;
  readonly capLabel: string;
  /** Top-left of the word, relative to the card. */
  readonly word: { readonly x: number; readonly y: number };
}

/** Cap for the `restart` action's first binding, then the word; padding 4 px (border included). */
export function cardLayout(bindings: Bindings = DEFAULT_BINDINGS): CardLayout {
  const capLabel = hintCapLabel(bindings.restart[0] ?? 'KeyR');
  const capW = ADVANCE * capLabel.length + 5;
  const wordX = PAD + capW + CAP_GAP;
  return {
    w: wordX + textWidth(CARD_WORD) + PAD,
    h: PAD + HINT_CAP_H + PAD,
    cap: { x: PAD, y: PAD, w: capW, h: HINT_CAP_H },
    capLabel,
    word: { x: wordX, y: PAD + 2 },
  };
}

const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * Centred, 8 px above the bottom edge (or 4 px above the Sticky Keys tip when
 * `tipTop` is its top edge); raised to just under the HUD if a body is there.
 */
export function cardPlacement(size: { readonly w: number; readonly h: number }, bodies: readonly Rect[], tipTop: number | null): Rect {
  const x = Math.floor((VIEW.w - size.w) / 2);
  const low = tipTop === null ? VIEW.h - EDGE_MARGIN - size.h : tipTop - TIP_GAP - size.h;
  const lowRect = { x, y: low, w: size.w, h: size.h };
  return bodies.some((b) => overlaps(lowRect, b)) ? { ...lowRect, y: HUD_BOTTOM } : lowRect;
}

/** Pocket index holding the body's centre (half the body height above the feet), or -1. `x`, `y` are the feet in tiles. */
export function bodyPocket(
  pockets: readonly SealedPocket[],
  body: { readonly x: number; readonly y: number },
  playerHeightTiles: number,
): number {
  return pocketAt(pockets, Math.floor(body.x), Math.floor(body.y - playerHeightTiles / 2));
}

export interface CardBody {
  /** Index of the sealed pocket holding the body, or -1. */
  readonly pocket: number;
  readonly home: boolean;
  /** The body's sprite on screen, px. */
  readonly rect: Rect;
}

export interface CardFrame {
  /** `state.step` after this frame's steps (frozen while paused, dead or restarting). */
  readonly step: number;
  /** A restart or respawn happened since the last frame. */
  readonly reset: boolean;
  readonly bodies: readonly CardBody[];
  /** Top edge of the Sticky Keys tip while it shows, else null. */
  readonly tipTop: number | null;
}

interface Stay {
  readonly pocket: number;
  readonly steps: number;
}

export class RestartCardModel {
  private lastStep = 0;
  private stays: (Stay | null)[] = [];
  private placed: Rect | null = null;
  private readonly size = cardLayout();

  /** `stepHz` converts the 1 s delay to steps. */
  constructor(private readonly stepHz: number) {}

  /** Feed one rendered frame; returns the card's rectangle while it shows, else null. */
  update(f: CardFrame): Rect | null {
    if (f.reset || f.step < this.lastStep) this.clear();
    if (f.reset) {
      this.lastStep = f.step; // the reset frame itself counts nothing: stays start from the next step
      return null;
    }
    const delta = Math.max(0, f.step - this.lastStep);
    this.lastStep = f.step;
    this.stays = f.bodies.map((b, i) => this.advance(this.stays[i] ?? null, b, delta));
    if (!this.stays.some((s) => s !== null && s.steps >= this.stepHz)) {
      this.placed = null;
      return null;
    }
    this.placed ??= cardPlacement(this.size, f.bodies.filter((b) => !b.home).map((b) => b.rect), f.tipTop);
    return this.placed;
  }

  private advance(stay: Stay | null, body: CardBody, delta: number): Stay | null {
    if (body.home || body.pocket < 0) return null;
    // A new stay starts at 1 (the step this frame ends on); only a continuing stay adds the frame's steps.
    return { pocket: body.pocket, steps: stay !== null && stay.pocket === body.pocket ? stay.steps + delta : 1 };
  }

  private clear(): void {
    this.stays = [];
    this.placed = null;
  }
}

/**
 * Per-frame glue for the restart card: sealed pockets once per level, then each
 * frame the bodies' pockets and sprite rectangles go to the pure model and the
 * result to the view. Render only; it reads the sim state and never writes it.
 * `snapshot()` is the QA hook's `restartCard` field.
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import type { Level, PlayerState, SimEvent, SimState, SimStatus } from '../core/types';
import { STICKY_TIP_PANEL_TOP } from '../ui';
import { bodyPocket, RestartCardModel, type CardBody, type Rect } from './restartCard';
import { RestartCardView } from './RestartCardView';
import { sealedPockets, type SealedPocket } from './sealedPockets';
import { isRespawn } from './whyFell';

/** What `window.__redshift.restartCard` reports while the card shows (null while hidden). */
export interface RestartCardSnapshot extends Rect {
  readonly visible: true;
}

export interface CardTuning {
  readonly tileSize: number;
  readonly playerWidthTiles: number;
  readonly playerHeightTiles: number;
  readonly stepHz: number;
}

export class RestartCardController {
  private readonly pockets: readonly SealedPocket[];
  private readonly model: RestartCardModel;
  private readonly view: RestartCardView;
  private prevStatus: SimStatus = 'playing';
  private shown: Rect | null = null;

  constructor(
    scene: Phaser.Scene,
    level: Level,
    private readonly tuning: CardTuning,
  ) {
    this.pockets = sealedPockets(level);
    this.model = new RestartCardModel(tuning.stepHz);
    this.view = new RestartCardView(scene);
  }

  /** Call once per rendered frame, after the sim advanced. `scroll` is the camera's top-left in world px. */
  update(state: SimState, events: readonly SimEvent[], scroll: { readonly x: number; readonly y: number }, tipShowing: boolean): void {
    if (this.pockets.length === 0) return;
    const reset = isRespawn(this.prevStatus, state.status, events);
    this.prevStatus = state.status;
    const bodies = [state.player, ...(state.twin === null ? [] : [state.twin])].map((b) => this.cardBody(b, scroll));
    this.shown = this.model.update({ step: state.step, reset, bodies, tipTop: tipShowing ? STICKY_TIP_PANEL_TOP : null });
    this.view.update(this.shown);
  }

  snapshot(): RestartCardSnapshot | null {
    return this.shown === null ? null : { visible: true, ...this.shown };
  }

  destroy(): void {
    this.view.destroy();
  }

  private cardBody(b: PlayerState, scroll: { readonly x: number; readonly y: number }): CardBody {
    const { tileSize: ts, playerWidthTiles, playerHeightTiles } = this.tuning;
    const w = Math.round(playerWidthTiles * ts);
    const h = Math.round(playerHeightTiles * ts);
    const rect = { x: Math.round(b.x * ts - w / 2 - scroll.x), y: Math.round(b.y * ts - h - scroll.y), w, h };
    return { pocket: bodyPocket(this.pockets, b, playerHeightTiles), home: b.home, rect };
  }
}

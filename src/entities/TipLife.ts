/**
 * B1 (sticky-keys-tip.md, pause.md): owns the Sticky Keys tip across pauses. A
 * pause hides the tip and banks its remaining unpaused time; resume shows it
 * again, same place, for what is left; leaving the level hides it for good.
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import { STICKY_TIP_AUTO_HIDE_MS } from '../ui';
import { StickyKeysTip } from '../ui/StickyKeysTipView';
import { pauseTipBudget, resumeTipBudget, startTipBudget, type TipBudget } from './stickyTipBudget';

export class TipLife {
  private tip: StickyKeysTip | null;
  private budget: TipBudget | null;
  private timer: Phaser.Time.TimerEvent | null = null;

  /** `tip` is the tip just shown by the view helper (null when none was due). */
  constructor(
    private readonly scene: Phaser.Scene,
    tip: StickyKeysTip | null,
    private readonly reducedMotion: boolean,
  ) {
    this.tip = tip;
    this.budget = tip === null ? null : startTipBudget(STICKY_TIP_AUTO_HIDE_MS, scene.time.now);
    if (tip !== null) this.watch();
  }

  /** The tip is on screen now (not paused, not hidden). */
  isShowing(): boolean {
    return this.tip?.isVisible() ?? false;
  }

  pause(): void {
    this.timer?.remove(false);
    this.timer = null;
    if (this.tip === null || this.budget === null) return;
    if (this.tip.isVisible()) this.budget = pauseTipBudget(this.budget, this.scene.time.now);
    else this.budget = null;
    this.tip.hide();
    this.tip = null;
  }

  resume(): void {
    if (this.tip !== null || this.budget === null || this.budget.shownAt !== null) return;
    if (this.budget.remainingMs <= 0) {
      this.budget = null;
      return;
    }
    this.budget = resumeTipBudget(this.budget, this.scene.time.now);
    this.tip = new StickyKeysTip(this.scene, { reducedMotion: this.reducedMotion });
    this.watch();
  }

  /** The win step: gone at once and never back (the results panel replaces it). */
  hideOnWin(): void {
    this.timer?.remove(false);
    this.timer = null;
    this.budget = null;
    this.tip?.hideOnWin();
    this.tip = null;
  }

  /** Leaving the level: hidden for good. */
  destroy(): void {
    this.timer?.remove(false);
    this.timer = null;
    this.budget = null;
    this.tip?.hide();
    this.tip = null;
  }

  /** Hide when the unpaused time runs out (always sooner than the view's own 12 s timer). */
  private watch(): void {
    this.timer = this.scene.time.delayedCall(this.budget?.remainingMs ?? 0, () => {
      this.tip?.hide();
      this.tip = null;
      this.budget = null;
    });
  }
}

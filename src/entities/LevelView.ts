/**
 * Draws the level grid. Coloured tiles are solid when they would hold the
 * player now (band matches, or the grace colour) and ghost otherwise; the
 * coloured layer is redrawn only when that answer changes. Reads sim state,
 * never writes it.
 *
 * Reserved tile kinds (mud, ice, conveyor, boost, camera) have no spec yet and
 * draw as safe tiles. Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import { BAND_COLORS, type Band, type ColoredBand, type Level, type TilePos } from '../core/types';
import { asTileCanvas, drawGearTile, drawSafeTile, hexToNumber, palette, type TileCanvas } from '../fx';

const DEPTH_TILES = 0;
const DEPTH_EXIT = 1;
const EXIT_PULSE_MS = 260;

export class LevelView {
  private readonly staticGfx: Phaser.GameObjects.Graphics;
  private readonly coloredGfx: Phaser.GameObjects.Graphics;
  private readonly exitGfx: Phaser.GameObjects.Graphics;
  private readonly exits: readonly TilePos[];
  private modeKey = '';

  constructor(
    scene: Phaser.Scene,
    private readonly level: Level,
    private readonly tileSize: number,
  ) {
    this.staticGfx = scene.add.graphics().setDepth(DEPTH_TILES);
    this.coloredGfx = scene.add.graphics().setDepth(DEPTH_TILES);
    this.exitGfx = scene.add.graphics().setDepth(DEPTH_EXIT);
    this.exits = this.collectExits();
    this.drawStatic(asTileCanvas(this.staticGfx));
  }

  /** Call every frame: redraws tiles only if the band or grace colour changed. */
  update(band: Band, graceBand: ColoredBand | null, timeMs: number): void {
    const key = `${band}:${graceBand ?? 0}`;
    if (key !== this.modeKey) {
      this.modeKey = key;
      this.drawColored(asTileCanvas(this.coloredGfx), band, graceBand);
    }
    this.drawExits(timeMs);
  }

  destroy(): void {
    this.staticGfx.destroy();
    this.coloredGfx.destroy();
    this.exitGfx.destroy();
  }

  private collectExits(): TilePos[] {
    const found: TilePos[] = [];
    this.forEachTile((tile, col, row) => {
      if (tile.kind === 'exit') found.push({ col, row });
    });
    return found;
  }

  private forEachTile(visit: (tile: Level['tiles'][number], col: number, row: number) => void): void {
    this.level.tiles.forEach((tile, i) => visit(tile, i % this.level.width, Math.floor(i / this.level.width)));
  }

  private drawStatic(g: TileCanvas): void {
    const size = this.tileSize;
    this.forEachTile((tile, col, row) => {
      if (tile.kind === 'empty' || tile.kind === 'colored' || tile.kind === 'exit') return;
      drawSafeTile(g, col * size, row * size, size);
    });
  }

  private drawColored(g: TileCanvas, band: Band, graceBand: ColoredBand | null): void {
    this.coloredGfx.clear();
    const size = this.tileSize;
    this.forEachTile((tile, col, row) => {
      if (tile.kind !== 'colored') return;
      const holds = tile.band === band || tile.band === graceBand;
      drawGearTile(g, BAND_COLORS[tile.band], holds ? 'solid' : 'ghost', col * size, row * size, size);
    });
  }

  private drawExits(timeMs: number): void {
    const g = this.exitGfx;
    g.clear();
    if (this.exits.length === 0) return;
    const style = palette.gears.white.solid;
    const alpha = 0.55 + 0.35 * Math.sin(timeMs / EXIT_PULSE_MS);
    const size = this.tileSize;
    for (const { col, row } of this.exits) {
      g.fillStyle(hexToNumber(style.fill), alpha);
      g.fillRect(col * size, row * size, size, size);
      g.lineStyle(palette.treatment.solid.outlineWidth, hexToNumber(style.outline), 1);
      g.strokeRect(col * size + 1, row * size + 1, size - 2, size - 2);
    }
  }
}

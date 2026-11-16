/**
 * Draws the level on Tilemap layers over `pixel-tileset` (ADR "LevelView moves
 * from per-frame Graphics to Tilemap layers"). A static layer holds the safe
 * tiles; a coloured layer swaps each cell between its solid and ghost index when
 * the answer "does this colour hold the player now" changes (band matches, or
 * the grace colour, and the player's box is not inside that colour: the
 * no-embed rule). The exit door and its glow are sprites from `pixel-tiles`.
 * Nothing is redrawn per frame. Reads sim state, never writes it.
 *
 * Owner: gameplay-engineer [scene].
 */
import type Phaser from 'phaser';
import type { Band, ColoredBand, Level } from '../core/types';
import { PIXEL_KEYS } from '../fx';
import { isEmbedded, type EmbeddedMask } from './embedded';
import { exitFrame, planLevel, type LevelPlan } from './levelTiles';

const DEPTH_TILES = 0;
const DEPTH_EXIT = 1;
const GLOW_ALPHA = 0.47;

interface ExitSprites {
  readonly door: Phaser.GameObjects.Image;
  readonly glow: Phaser.GameObjects.Image;
}

export class LevelView {
  private readonly map: Phaser.Tilemaps.Tilemap;
  private readonly coloredLayer: Phaser.Tilemaps.TilemapLayer;
  private readonly plan: LevelPlan;
  private readonly exits: readonly ExitSprites[];
  private modeKey = '';
  private shownFrame = -1;

  constructor(
    scene: Phaser.Scene,
    level: Level,
    private readonly tileSize: number,
    private readonly reducedMotion = false,
  ) {
    this.plan = planLevel(level);
    this.map = scene.make.tilemap({ tileWidth: tileSize, tileHeight: tileSize, width: level.width, height: level.height });
    const tileset = this.map.addTilesetImage(PIXEL_KEYS.tileset, PIXEL_KEYS.tileset, tileSize, tileSize, 0, 0);
    if (tileset === null) throw new Error(`texture "${PIXEL_KEYS.tileset}" is not loaded (BootScene must load it)`);
    const staticLayer = this.createLayer('static', tileset);
    this.coloredLayer = this.createLayer('colored', tileset);
    this.plan.staticIndices.forEach((index, i) => {
      if (index >= 0) staticLayer.putTileAt(index, i % level.width, Math.floor(i / level.width));
    });
    this.exits = this.plan.exits.map(({ col, row }) => this.addExit(scene, col, row));
  }

  /** Call every frame: swaps cell indices only if the band, grace colour or embedded colours changed. */
  update(band: Band, graceBand: ColoredBand | null, embedded: EmbeddedMask, timeMs: number): void {
    const key = `${band}:${graceBand ?? 0}:${embedded}`;
    if (key !== this.modeKey) {
      this.modeKey = key;
      this.swapColored(band, graceBand, embedded);
    }
    this.animateExits(timeMs);
  }

  destroy(): void {
    for (const e of this.exits) {
      e.door.destroy();
      e.glow.destroy();
    }
    this.map.destroy();
  }

  private createLayer(name: string, tileset: Phaser.Tilemaps.Tileset): Phaser.Tilemaps.TilemapLayer {
    const layer = this.map.createBlankLayer(name, tileset, 0, 0);
    if (layer === null) throw new Error(`could not create tilemap layer "${name}"`);
    return layer.setDepth(DEPTH_TILES);
  }

  private swapColored(band: Band, graceBand: ColoredBand | null, embedded: EmbeddedMask): void {
    for (const cell of this.plan.colored) {
      const holds = (cell.band === band || cell.band === graceBand) && !isEmbedded(embedded, cell.band);
      this.coloredLayer.putTileAt(holds ? cell.solid : cell.ghost, cell.col, cell.row);
    }
  }

  /** The door sits on its tile; the 32 x 32 glow is centred on it (both on whole pixels). */
  private addExit(scene: Phaser.Scene, col: number, row: number): ExitSprites {
    const s = this.tileSize;
    const glow = scene.add
      .image(col * s + s / 2, row * s + s / 2, PIXEL_KEYS.tiles, 'tile/exit/glow_0')
      .setOrigin(0.5)
      .setAlpha(GLOW_ALPHA)
      .setDepth(DEPTH_EXIT);
    const door = scene.add.image(col * s, row * s, PIXEL_KEYS.tiles, 'tile/exit/door_0').setOrigin(0, 0).setDepth(DEPTH_EXIT);
    return { door, glow };
  }

  private animateExits(timeMs: number): void {
    const frame = exitFrame(timeMs, this.reducedMotion);
    if (frame === this.shownFrame) return;
    this.shownFrame = frame;
    for (const e of this.exits) {
      e.door.setFrame(`tile/exit/door_${frame}`);
      e.glow.setFrame(`tile/exit/glow_${frame}`);
    }
  }
}

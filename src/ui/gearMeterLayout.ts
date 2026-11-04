/**
 * Every drawing number of the HUD gear meter, in one place. The view draws a
 * plan built from a model and one of these; nothing else in `src/ui` knows a
 * pixel size. The pixel cutover (PX-9, 480 x 270, bitmap font) adds a second,
 * smaller layout and a compact two-body strip layout here, and the model, the
 * plan and the tests stay as they are.
 *
 * These are UI constants, not tuning (spec: "Layout sizes are UI constants").
 *
 * Owner: ui-engineer.
 */
export interface GearMeterLayout {
  readonly panelW: number;
  readonly panelH: number;
  readonly panelRadius: number;
  readonly panelAlpha: number;
  readonly panelBorderWidth: number;
  /** Left and right padding inside the panel. */
  readonly pad: number;

  /** Cell edge in px. Cells are squares drawn with `drawGearGlyph`. */
  readonly cell: number;
  /** Distance between cell origins. */
  readonly pitch: number;
  readonly cellsX: number;
  readonly cellY: number;
  /** Top of the gear digits under cells 1 to 4. */
  readonly digitY: number;
  readonly digitFontPx: number;

  /** How far the bracket sits outside its cell, and its line widths. */
  readonly bracketOut: number;
  readonly bracketWidth: number;
  readonly pendingWidth: number;
  /** Dash and gap of the pending bracket. */
  readonly pendingDash: readonly [number, number];

  readonly needleTop: number;
  readonly needleH: number;
  readonly needleHalfW: number;

  readonly dragY: number;
  readonly dragH: number;

  /** Key-cap hint columns: width of a column, of one cap, and the gaps. */
  readonly hintW: number;
  readonly hintCapW: number;
  readonly hintCapH: number;
  readonly hintCapGap: number;
  readonly hintArrowY: number;
  readonly hintArrowW: number;
  readonly hintArrowH: number;
  readonly hintFontPx: number;
}

/** Today's 960 x 540 layout, top-left, at most 220 x 64. */
export const GEAR_METER_LAYOUT: GearMeterLayout = {
  panelW: 220,
  panelH: 64,
  panelRadius: 6,
  panelAlpha: 0.92,
  panelBorderWidth: 2,
  pad: 6,

  cell: 24,
  pitch: 30,
  cellsX: 38,
  cellY: 8,
  digitY: 35,
  digitFontPx: 12,

  bracketOut: 3,
  bracketWidth: 2.5,
  pendingWidth: 2,
  pendingDash: [4, 3],

  needleTop: 49,
  needleH: 6,
  needleHalfW: 4,

  dragY: 57,
  dragH: 4,

  hintW: 30,
  hintCapW: 22,
  hintCapH: 14,
  hintCapGap: 2,
  hintArrowY: 42,
  hintArrowW: 10,
  hintArrowH: 6,
  hintFontPx: 11,
};

/**
 * Every drawing number of the HUD gear meter, in one place. The view draws a
 * plan built from a model and one of these; nothing else in `src/ui` knows a
 * pixel size. All numbers are whole pixels in the 480 x 270 game space
 * (docs/tech/adr-pixel-rendering.md, "HUD and text"); text is the 5 x 7 bitmap
 * font, so there are no font sizes here.
 *
 * Two layouts:
 * - `GEAR_METER_LAYOUT`: the full 110 x 32 meter (5, 5 on screen), one body.
 * - `COMPACT_STRIP_LAYOUT`: the 110 x 14 strip for Tandem's two stacked bodies:
 *   a body glyph, five cells and the bracket; no digits, needle, drag bar or key caps.
 *
 * These are UI constants, not tuning (spec: "Layout sizes are UI constants").
 *
 * Owner: ui-engineer.
 */
export interface GlyphSlot {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface GearMeterLayout {
  readonly panelW: number;
  readonly panelH: number;
  readonly panelAlpha: number;
  readonly panelBorderWidth: number;
  /** Extra px of panel colour outside the border, so the meter never touches level geometry beside it. */
  readonly halo: number;
  /** Left and right padding inside the panel. */
  readonly pad: number;

  /** Cell edge in px. Cells are squares. */
  readonly cell: number;
  /** Distance between cell origins. */
  readonly pitch: number;
  readonly cellsX: number;
  readonly cellY: number;
  /** Top of the gear digits under cells 1 to 4. */
  readonly digitY: number;

  /** How far the bracket sits outside its cell, and its line widths (bold when arrived, thin before). */
  readonly bracketOut: number;
  readonly bracketWidth: number;
  readonly bracketThinWidth: number;
  readonly pendingWidth: number;
  /** Dash and gap of the pending bracket. */
  readonly pendingDash: readonly [number, number];
  /** Dash and gap of a ghost cell's rim. */
  readonly ghostDash: readonly [number, number];

  readonly needleTop: number;
  /** Rows of the needle triangle (row r is 2r + 1 px wide). 0 hides the needle. */
  readonly needleH: number;
  readonly needleHalfW: number;

  /** Drag bar row: top and height (the chevron is as tall as the row). */
  readonly dragY: number;
  readonly dragH: number;
  readonly chevronW: number;

  /** Key-cap hint columns: width of a column, of one cap, and the gaps. */
  readonly hintW: number;
  readonly hintCapW: number;
  readonly hintCapH: number;
  readonly hintCapGap: number;
  readonly hintArrowY: number;
  readonly hintArrowW: number;
  readonly hintArrowH: number;

  readonly showDigits: boolean;
  readonly showDrag: boolean;
  readonly showHints: boolean;
  /** Where a Tandem strip draws its body glyph (`glyph/runner`, `glyph/twin`, `glyph/home`); null for none. */
  readonly glyph: GlyphSlot | null;
}

/** The 110 x 32 meter. Rows: border 0, cells 3-11, bold bracket 1-13, digits 15-21, needle 23-25, drag bar 26-30. */
export const GEAR_METER_LAYOUT: GearMeterLayout = {
  panelW: 110,
  panelH: 32,
  panelAlpha: 1,
  panelBorderWidth: 1,
  halo: 2,
  pad: 4,

  cell: 9,
  pitch: 12,
  cellsX: 27,
  cellY: 3,
  digitY: 15,

  bracketOut: 2,
  bracketWidth: 2,
  bracketThinWidth: 1,
  pendingWidth: 1,
  pendingDash: [2, 2],
  ghostDash: [3, 2],

  needleTop: 23,
  needleH: 3,
  needleHalfW: 2,

  dragY: 26,
  dragH: 5,
  chevronW: 3,

  hintW: 16,
  hintCapW: 14,
  hintCapH: 9,
  hintCapGap: 2,
  hintArrowY: 24,
  hintArrowW: 7,
  hintArrowH: 4,

  showDigits: true,
  showDrag: true,
  showHints: true,
  glyph: null,
};

/** The 110 x 14 Tandem strip: glyph at the left, five 8 px cells, bold bracket 1-12. */
export const COMPACT_STRIP_LAYOUT: GearMeterLayout = {
  ...GEAR_METER_LAYOUT,
  panelH: 14,
  cell: 8,
  cellsX: 16,
  cellY: 3,
  digitY: 0,
  needleTop: 0,
  needleH: 0,
  needleHalfW: 0,
  dragY: 0,
  dragH: 0,
  hintArrowY: 0,
  showDigits: false,
  showDrag: false,
  showHints: false,
  glyph: { x: 4, y: 1, w: 7, h: 12 },
};

import { describe, expect, it } from 'vitest';
import { GEAR_METER_AREA, hudLayout } from './GameHud';
import { GEAR_METER_LAYOUT } from '../ui';

describe('hudLayout', () => {
  const layout = hudLayout(480);

  it('centres the title so it clears the gear meter in the top-left', () => {
    expect(layout.title.x).toBe(240);
    expect(layout.title.x).toBeGreaterThan(GEAR_METER_AREA.x + GEAR_METER_AREA.width);
  });

  it('puts messages below the gear meter area', () => {
    expect(layout.messages.y).toBeGreaterThanOrEqual(GEAR_METER_AREA.y + GEAR_METER_AREA.height);
  });
});

describe('pixel layout (480 x 270)', () => {
  it('uses the halved constants', () => {
    expect(GEAR_METER_AREA).toEqual({ x: 5, y: 5, width: 110, height: 32 });
    expect(GEAR_METER_AREA.width).toBe(GEAR_METER_LAYOUT.panelW);
    expect(GEAR_METER_AREA.height).toBe(GEAR_METER_LAYOUT.panelH);
    expect(hudLayout(480).messages).toEqual({ x: 5, y: 42 });
  });
});

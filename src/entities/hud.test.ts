import { describe, expect, it } from 'vitest';
import { formatRunTime, GEAR_METER_AREA, hudLayout, winText } from './GameHud';

describe('winText', () => {
  it.each([
    [775, '0:12.91'],
    [60, '0:01.00'],
    [3601, '1:00.01'],
    [0, '0:00.00'],
  ])('shows %i steps at 60 Hz as %s', (steps, text) => {
    expect(winText(steps, 60)).toBe(`Level complete — ${text} — press R`);
  });

  it('truncates hundredths, never rounds up', () => {
    expect(formatRunTime(119, 60)).toBe('0:01.98');
  });

  it('does not print null if the step count is missing', () => {
    expect(winText(null, 60)).toContain('— ? —');
  });
});

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
    expect(hudLayout(480).messages).toEqual({ x: 5, y: 42 });
  });
});

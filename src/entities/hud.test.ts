import { describe, expect, it } from 'vitest';
import { GEAR_METER_AREA, hudLayout, TITLE_BOUNDS } from './GameHud';
import { blockWidth, fitTitle, titleLeft } from './hudText';
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

describe('title beside the gear meter', () => {
  const left = (title: string) => {
    const { width } = { width: 480 };
    const text = fitTitle(title, width, 3, TITLE_BOUNDS);
    const box = blockWidth(text) + 6;
    return { text, left: titleLeft(width, box, TITLE_BOUNDS), right: titleLeft(width, box, TITLE_BOUNDS) + box };
  };
  const longest = 'w4-03  Moving Bridge  [replay, R restarts]';

  it('never starts under the gear panel, with the longest title and the replay suffix', () => {
    const t = left(longest);
    expect(t.text).toBe(longest);
    expect(t.left).toBeGreaterThanOrEqual(GEAR_METER_AREA.x + GEAR_METER_AREA.width + 5);
    expect(t.right).toBeLessThanOrEqual(480 - 5);
  });
  it('keeps short titles centred', () => {
    expect(left('w1-01  First Steps').left).toBe(Math.floor((480 - (blockWidth('w1-01  First Steps') + 6)) / 2));
  });
  it('drops the replay suffix before it would overflow', () => {
    const long = `w9-99  ${'Very long name '.repeat(3)}[replay, R restarts]`;
    expect(fitTitle(long, 480, 3, TITLE_BOUNDS)).not.toContain('[replay');
  });
});

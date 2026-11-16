import { describe, expect, it } from 'vitest';
import { blockHeight, blockWidth, centeredX, wrapText } from './hudText';

describe('hudText', () => {
  it('measures the widest line at an integer scale', () => {
    expect(blockWidth('ab\nabc')).toBe(17);
    expect(blockWidth('ab', 2)).toBe(22);
    expect(blockHeight('a\nb\nc', 2)).toBe(48);
  });

  it('centres on whole pixels', () => {
    expect(centeredX(480, 101)).toBe(189);
    expect(Number.isInteger(centeredX(481, 100))).toBe(true);
  });

  it('wraps at words and keeps explicit newlines', () => {
    // 5 chars per line = 29 px
    expect(wrapText('aa bb cc', 29)).toBe('aa bb\ncc');
    expect(wrapText('one\ntwo', 460)).toBe('one\ntwo');
  });

  it('cuts words longer than a line', () => {
    expect(wrapText('abcdefghij', 29)).toBe('abcde\nfghij');
  });

  it('never makes a line wider than the limit', () => {
    const out = wrapText('the quick brown fox jumps over the lazy dog and keeps running', 100);
    for (const line of out.split('\n')) expect(blockWidth(line)).toBeLessThanOrEqual(100);
  });
});

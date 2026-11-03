import { describe, expect, it } from 'vitest';
import { FOCUS_PROMPT_TEXT, focusPromptVisible } from './focusPrompt';

describe('focusPromptVisible', () => {
  it('shows only while the page lacks focus', () => {
    expect(focusPromptVisible(false)).toBe(true);
    expect(focusPromptVisible(true)).toBe(false);
  });

  it('names the keyboard so keyboard-only players know what to do', () => {
    expect(FOCUS_PROMPT_TEXT).toMatch(/keyboard/i);
  });
});

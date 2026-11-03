/**
 * The "click to focus" prompt for the itch.io iframe (architecture.md section
 * 5): key events only arrive once the iframe's window has focus. Pure rules;
 * the scene polls `document.hasFocus()` and `GameHud` draws the text.
 * Owner: gameplay-engineer [scene].
 */
export const FOCUS_PROMPT_TEXT = 'Click the game to focus, then use the keyboard';

/** Shown exactly while the page does not have keyboard focus. */
export function focusPromptVisible(pageHasFocus: boolean): boolean {
  return !pageHasFocus;
}

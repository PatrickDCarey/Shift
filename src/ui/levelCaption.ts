/**
 * Display text for a level: label from the id plus the UPPERCASE title,
 * `1-3 RUNWAY`. Shared by the title, level select, pause and results.
 * Pure. Owner: ui-engineer.
 */
import { levelLabel } from '../save/progress';

/** Menu text is UPPERCASE (menu-navigation.md). */
export function levelCaption(id: string, title: string): string {
  const name = title.trim().toUpperCase();
  return name === '' ? levelLabel(id) : `${levelLabel(id)} ${name}`;
}

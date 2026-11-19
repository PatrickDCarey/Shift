/**
 * Settings screen model (docs/design/features/settings.md): SOUND, REDUCED
 * MOTION, REDUCED EFFECTS and BACK. Pure; the scene draws `settingsLayout` and
 * hands each returned action to `applySettingsAction`.
 *
 * Owner: ui-engineer.
 */
import type { SaveStore, Settings } from '../save';
import { applyAudioSettings } from './audioSettings';
import type { AudioSink } from './audioSettings';
import { createList, focusedId, moveList } from './menuFocus';
import type { ListItem, ListState, Transition } from './menuFocus';
import type { MenuIntent } from './menuInput';
import { MARGIN, box, textItem } from './menuLayout';
import type { LayoutItem } from './menuLayout';

export type SettingsItemId = 'sound' | 'motion' | 'effects' | 'back';

export const SETTINGS_HEADING = 'SETTINGS';

const ITEMS: readonly ListItem<SettingsItemId>[] = [
  { id: 'sound', label: 'SOUND' },
  { id: 'motion', label: 'REDUCED MOTION' },
  { id: 'effects', label: 'REDUCED EFFECTS' },
  { id: 'back', label: 'BACK' },
];

/** What each toggle row shows: true = ON. SOUND is the inverse of `settings.muted`. */
export interface SettingsValues {
  readonly sound: boolean;
  readonly motion: boolean;
  readonly effects: boolean;
}

export interface SettingsModel {
  readonly list: ListState<SettingsItemId>;
  readonly values: SettingsValues;
}

export interface SettingsInput {
  readonly settings: Settings;
  /** `prefers-reduced-motion: reduce`; used only while the player has not chosen a value. */
  readonly osReducedMotion: boolean;
  readonly focusId?: SettingsItemId;
}

export type SettingsPatch = Partial<Pick<Settings, 'muted' | 'reducedMotion' | 'reducedMotionChosen' | 'reducedEffects'>>;

export type SettingsAction = { readonly type: 'change'; readonly patch: SettingsPatch } | { readonly type: 'back' };

/** The reduced-motion value the player is effectively living with: their choice if made, else the OS. */
export function shownReducedMotion(settings: Settings, osReducedMotion: boolean): boolean {
  return settings.reducedMotionChosen ? settings.reducedMotion : osReducedMotion;
}

export function createSettingsModel(input: SettingsInput): SettingsModel {
  const { settings } = input;
  return {
    list: createList(ITEMS, input.focusId),
    values: {
      sound: !settings.muted,
      motion: shownReducedMotion(settings, input.osReducedMotion),
      effects: settings.reducedEffects,
    },
  };
}

function flip(model: SettingsModel, id: SettingsItemId): Transition<SettingsModel, SettingsAction> {
  switch (id) {
    case 'sound': {
      const sound = !model.values.sound;
      return { model: { ...model, values: { ...model.values, sound } }, action: { type: 'change', patch: { muted: !sound } } };
    }
    case 'motion': {
      const motion = !model.values.motion;
      return {
        model: { ...model, values: { ...model.values, motion } },
        action: { type: 'change', patch: { reducedMotion: motion, reducedMotionChosen: true } },
      };
    }
    case 'effects': {
      const effects = !model.values.effects;
      return { model: { ...model, values: { ...model.values, effects } }, action: { type: 'change', patch: { reducedEffects: effects } } };
    }
    case 'back':
      return { model, action: { type: 'back' } };
  }
}

/** Enter, Space, Left and Right flip the focused row; Up and Down move; Esc and Backspace go back. */
export function settingsStep(model: SettingsModel, intent: MenuIntent): Transition<SettingsModel, SettingsAction> {
  const id = focusedId(model.list);
  if (intent.kind === 'back') return { model, action: { type: 'back' } };
  if (id === null) return { model, action: null };
  if (intent.kind === 'choose') return flip(model, id);
  if (intent.kind !== 'move') return { model, action: null };
  if (intent.dir === 'up' || intent.dir === 'down') return { model: { ...model, list: moveList(model.list, intent.dir) }, action: null };
  return id === 'back' ? { model, action: null } : flip(model, id);
}

/** Save the change (one write) and, for mute, push it into the audio engine. */
export function applySettingsAction(store: SaveStore, action: SettingsAction, engine?: AudioSink): void {
  if (action.type !== 'change') return;
  const settings = store.updateSettings(action.patch);
  if (action.patch.muted !== undefined) applyAudioSettings(settings, engine);
}

const LABEL_X = 40;
const VALUE_X = 320;
const ROWS_Y = 60;
const ROW_PITCH = 20;
const GLYPH = 9;
const GLYPH_GAP = 6;
const TOGGLES: readonly SettingsItemId[] = ['sound', 'motion', 'effects'];

/** Heading, one label per row, and for each toggle a 9x9 box glyph (`glyph:<id>`) and `ON` / `OFF` (`value:<id>`). */
export function settingsLayout(model: SettingsModel): readonly LayoutItem[] {
  const out: LayoutItem[] = [textItem('heading', SETTINGS_HEADING, MARGIN, MARGIN, 2)];
  model.list.items.forEach((item, index) => {
    const y = ROWS_Y + index * ROW_PITCH;
    out.push(textItem(`item:${item.id}`, item.label, LABEL_X, y, 2));
    if (!TOGGLES.includes(item.id)) return;
    const on = model.values[item.id as keyof SettingsValues];
    out.push(box(`glyph:${item.id}`, VALUE_X, y + 2, GLYPH, GLYPH));
    out.push(textItem(`value:${item.id}`, on ? 'ON' : 'OFF', VALUE_X + GLYPH + GLYPH_GAP, y, 2));
  });
  return out;
}

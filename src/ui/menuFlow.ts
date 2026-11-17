/**
 * How Pause, Results and Controls are launched, what they take and where each
 * choice leads. Pure: targets are `SCENE_KEYS` names mapped by the scene, so
 * this module never imports the scene layer. The game scene uses the launch
 * builders, the event name and the types; the menu scenes use the parsers and
 * outcomes (data crosses a scene boundary, so it is validated on the way in).
 *
 * Contract: docs/production/requests.md, "Batch 6 wave 1".
 *
 * Owner: ui-engineer.
 */
import type { RunRecordResult } from '../save/progress';
import type { PauseItemId } from './pauseModel';
import type { ResultsAction, ResultsInput } from './resultsModel';

/** Emitted on the GAME scene's `events` by Pause when it closes into the game. */
export const PAUSE_RESULT_EVENT = 'redshift:pauseResult';

export interface PauseResult {
  readonly action: 'resume' | 'restart';
}

/** What the game scene hands to `scene.launch('Pause', ...)`. `focusId` is for the return from Controls. */
export interface PauseSceneData {
  readonly levelId: string;
  readonly title: string;
  /** `state.step` at the moment of pausing. */
  readonly step: number;
  readonly stepHz: number;
  readonly focusId?: PauseItemId;
}

export type ControlsSceneData =
  | { readonly from: 'title' }
  | { readonly from: 'pause'; readonly pause: PauseSceneData };

export type FlowTarget = 'game' | 'title' | 'levelSelect' | 'pause' | 'controls';

/** A scene change: start `target` with `data`; `stopGame` first stops the (still running) game scene. */
export interface FlowJump {
  readonly target: FlowTarget;
  readonly data?: object;
  readonly stopGame?: boolean;
}

export type PauseOutcome =
  | { readonly kind: 'report'; readonly result: PauseResult }
  | { readonly kind: 'goto'; readonly jump: FlowJump };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isRate = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

const PAUSE_ITEMS: readonly string[] = ['resume', 'restart', 'controls', 'levels'];

/** Typed builder for the game scene's `scene.launch('Pause', ...)`. */
export function pauseLaunchData(levelId: string, title: string, step: number, stepHz: number): PauseSceneData {
  return { levelId, title, step, stepHz };
}

export function parsePauseData(data: unknown): PauseSceneData | null {
  if (!isObject(data)) return null;
  const { levelId, title, step, stepHz, focusId } = data;
  if (!isText(levelId) || typeof title !== 'string' || !isCount(step) || !isRate(stepHz)) return null;
  const focus = typeof focusId === 'string' && PAUSE_ITEMS.includes(focusId) ? { focusId: focusId as PauseItemId } : {};
  return { levelId, title, step, stepHz, ...focus };
}

/** RESUME and RESTART go back to the game scene; CONTROLS and LEVELS leave. */
export function pauseOutcome(action: PauseItemId, data: PauseSceneData): PauseOutcome {
  switch (action) {
    case 'resume':
      return { kind: 'report', result: { action: 'resume' } };
    case 'restart':
      return { kind: 'report', result: { action: 'restart' } };
    case 'controls':
      return { kind: 'goto', jump: { target: 'controls', data: { from: 'pause', pause: data } } };
    case 'levels':
      return { kind: 'goto', jump: { target: 'levelSelect', data: { focusId: data.levelId }, stopGame: true } };
  }
}

/** A win, as far as the launch needs: `LevelCompleteEvent` fits this. */
export interface WinLike {
  readonly levelId: string;
  readonly title: string;
  readonly result: { readonly wonAtStep: number };
  readonly saved: RunRecordResult;
}

/** Typed builder for the game scene's `scene.launch('Results', ...)`. */
export function resultsLaunchData(win: WinLike, stepHz: number, nextLevelId: string | null): ResultsInput {
  return { levelId: win.levelId, title: win.title, steps: win.result.wonAtStep, stepHz, record: win.saved, nextLevelId };
}

function parseRecord(v: unknown): RunRecordResult | null {
  if (!isObject(v)) return null;
  const { recorded, newBest, firstClear, skipped, best } = v;
  const flags = [recorded, newBest, firstClear, skipped].every((f) => typeof f === 'boolean');
  if (!flags || !(best === null || isCount(best))) return null;
  return { recorded, newBest, firstClear, skipped, best } as RunRecordResult;
}

export function parseResultsData(data: unknown): ResultsInput | null {
  if (!isObject(data)) return null;
  const { levelId, title, steps, stepHz, nextLevelId } = data;
  const record = parseRecord(data.record);
  const nextOk = nextLevelId === null || isText(nextLevelId);
  if (!isText(levelId) || typeof title !== 'string' || !isCount(steps) || !isRate(stepHz) || record === null || !nextOk) {
    return null;
  }
  return { levelId, title, steps, stepHz, record, nextLevelId: nextLevelId as string | null };
}

/** NEXT and RETRY restart the game scene (a fresh run); LEVELS stops it and opens level select on this level. */
export function resultsOutcome(action: ResultsAction, levelId: string): FlowJump {
  switch (action.type) {
    case 'next':
      return { target: 'game', data: { levelId: action.levelId } };
    case 'retry':
      return { target: 'game', data: { levelId } };
    case 'levels':
      return { target: 'levelSelect', data: { focusId: levelId }, stopGame: true };
  }
}

/** Opened from nothing known (a dev start): the title. */
export function parseControlsData(data: unknown): ControlsSceneData {
  if (isObject(data) && data.from === 'pause') {
    const pause = parsePauseData(data.pause);
    if (pause !== null) return { from: 'pause', pause };
  }
  return { from: 'title' };
}

/** Back goes to whoever opened the screen, with focus on CONTROLS. */
export function controlsReturn(data: ControlsSceneData): FlowJump {
  if (data.from === 'pause') return { target: 'pause', data: { ...data.pause, focusId: 'controls' } };
  return { target: 'title', data: { focusId: 'controls' } };
}

/**
 * Run tokens of a solution file (docs/tech/level-format.md section 4):
 * `<count><buttons>`, for example `40R`, `1R+`, `30.`. Parsing gives specific
 * reasons for malformed tokens, because level-designer reads them.
 */
import {
  EMPTY_INPUT,
  INPUT_BUTTONS,
  INPUT_LETTERS,
  INPUT_NONE_LETTER,
  type InputFrame,
  type InputRun,
} from '../types';
import { MAX_REPLAY_STEPS } from './limits';

export type TokenResult =
  | { readonly ok: true; readonly run: InputRun }
  | { readonly ok: false; readonly message: string };

const BUTTON_LETTERS: string = INPUT_BUTTONS.map((b) => INPUT_LETTERS[b]).join('');
const LETTER_LIST = `${[...BUTTON_LETTERS].join(' ')}`;

/** Letters of the held buttons in canonical order, or `.` when nothing is held. */
export function frameLetters(frame: InputFrame): string {
  const letters = INPUT_BUTTONS.filter((b) => frame[b]).map((b) => INPUT_LETTERS[b]);
  return letters.length === 0 ? INPUT_NONE_LETTER : letters.join('');
}

export function formatRunToken(run: InputRun): string {
  return `${run.count}${frameLetters(run.frame)}`;
}

/** Copies exactly the six buttons, so recorder extras never leak into a run. */
export function normalizeFrame(frame: InputFrame): InputFrame {
  return {
    left: frame.left === true,
    right: frame.right === true,
    jump: frame.jump === true,
    shiftUp: frame.shiftUp === true,
    shiftDown: frame.shiftDown === true,
    restart: frame.restart === true,
  };
}

function bad(token: string, reason: string): TokenResult {
  return { ok: false, message: `malformed run token '${token}': ${reason}` };
}

/** Frame for a canonical letter string such as `R+`, or an error reason. */
function frameFromLetters(letters: string): InputFrame | string {
  if (letters === INPUT_NONE_LETTER) return EMPTY_INPUT;
  const unknown = [...letters].find((c) => !BUTTON_LETTERS.includes(c));
  if (unknown !== undefined) return `unknown button '${unknown}' (use ${LETTER_LIST} or '${INPUT_NONE_LETTER}')`;
  const held = new Set(letters);
  const frame = normalizeFrame(
    Object.fromEntries(INPUT_BUTTONS.map((b) => [b, held.has(INPUT_LETTERS[b])])) as unknown as InputFrame,
  );
  if (frameLetters(frame) !== letters) {
    return `buttons must appear at most once, in the order ${LETTER_LIST}`;
  }
  return frame;
}

export function parseRunToken(token: string): TokenResult {
  const digits = /^[0-9]*/.exec(token)?.[0] ?? '';
  const rest = token.slice(digits.length);
  if (digits === '') return bad(token, "start with a step count, for example '30R'");
  if (digits.startsWith('0')) return bad(token, 'the count must be a positive integer without leading zeros');
  if (digits.length > 7 || Number(digits) > MAX_REPLAY_STEPS) {
    return { ok: false, message: `run token '${token}': count ${digits} is too large (a solution has at most ${MAX_REPLAY_STEPS} steps)` };
  }
  if (rest === '') return bad(token, `add the buttons held (${LETTER_LIST}) or '${INPUT_NONE_LETTER}' for nothing held`);
  if (rest.includes(INPUT_NONE_LETTER) && rest !== INPUT_NONE_LETTER) {
    return bad(token, `'${INPUT_NONE_LETTER}' means nothing held and cannot be combined with buttons`);
  }
  const frame = frameFromLetters(rest);
  return typeof frame === 'string' ? bad(token, frame) : { ok: true, run: { count: Number(digits), frame } };
}

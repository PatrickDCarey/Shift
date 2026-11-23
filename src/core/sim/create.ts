/**
 * Fresh-load state (GDD §4.12): standing on the bottom edge of the `@` cell,
 * startGear, band white, facing right, every timer and buffer cleared.
 */
import { EMPTY_INPUT, type Level, type PlayerState, type SimParams, type SimState, type TilePos } from '../types';
import { supported } from './collision';
import { gateFor } from './gating';
import { slabUnder } from './movers';

export function spawnBody(cell: TilePos, level: Level, params: SimParams): PlayerState {
  const x = cell.col + 0.5;
  const y = cell.row + 1;
  const gate = gateFor(level, params, x, y, 0, null);
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    gear: params.startGear,
    band: 0,
    facing: 1,
    moveDir: 0,
    grounded: supported(level, params, x, y, gate) || (level.movers !== undefined && slabUnder(level, params, 0, gate, x, y) !== null),
    coyoteSteps: 0,
    jumpBufferSteps: 0,
    shiftBufferSteps: 0,
    shiftBufferNet: 0,
    graceSteps: 0,
    graceBand: null,
    airDistance: 0,
    home: false,
  };
}

export const spawnPlayer = (level: Level, params: SimParams): PlayerState => spawnBody(level.start, level, params);

export function createSim(level: Level, params: SimParams): SimState {
  return {
    step: 0,
    status: 'playing',
    wonAtStep: null,
    respawnInSteps: 0,
    player: spawnPlayer(level, params),
    twin: level.twinStart ? spawnBody(level.twinStart, level, params) : null,
    prevInput: { ...EMPTY_INPUT },
    dirPriority: 0,
    events: [],
  };
}

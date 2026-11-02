/**
 * Public entry of the src/core/level lane: level and solution parsers (LF and CRLF), input-log codec, runInputLog, verifySolution (replay test), loadLevels.
 *
 * Owner: gameplay-engineer (level lane). Export ONLY the names in
 * LANE_EXPORTS.level (src/core/contracts/lanes.ts), with those signatures;
 * tests/arch/lane-contracts.test.ts checks it. Files in this folder may import ../types only; the sim arrives as an injected SimApi.
 * See docs/tech/architecture.md section 3.5.
 */
export { encodeRuns, expandRuns } from './codec';
export { loadLevels } from './loadLevels';
export { parseLevel } from './parseLevel';
export { runInputLog, verifySolution } from './replay';
export { formatSolution, parseSolution } from './solutionFile';

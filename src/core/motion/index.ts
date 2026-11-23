/**
 * Public entry of the src/core/motion lane: pure speed maths: grounded acceleration/braking/skid, bands, segment rates, air drag. No state, no collisions.
 *
 * Owner: gameplay-engineer (motion lane). Export ONLY the names in
 * LANE_EXPORTS.motion (src/core/contracts/lanes.ts), with those signatures;
 * tests/arch/lane-contracts.test.ts checks it. Files in this folder may import ../types only.
 * See docs/tech/architecture.md section 3.5.
 */
export { bandForSpeed } from './bands';
export { airDrag } from './drag';
export { groundSpeed } from './ground';
export { segmentRates } from './rates';
export { moverCorners, moverCycle, moverOffset, nextShotIn, shotsAt, sweepFront } from './paths';

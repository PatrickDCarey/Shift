# Feature: Camera look-ahead

_Owner: design-lead. Written 2026-11-24 (B12-C3 triage, `decisions.md` "Batch 12 cold playtest triage" item 5). **Priority: Should** (cut freely at freeze; nothing else depends on it). Lane: [scene] (render only; no sim, contract or level-format change)._

## Rule

When one body is followed, the camera's x target sits ahead of it, in the direction it is moving, by an offset that grows with speed: `offset = cameraLookAheadTiles × min(|vx| / redSpeed, 1)`, eased as the camera already is. At red speed going right, the view shows about 21 tiles ahead instead of 15, so the next bridge's colour is on screen before the brake point.

## Edge cases

- **Standing or turning:** the offset eases back toward 0 (or toward the new direction) at the camera's existing easing. It does not snap.
- **Level bounds:** clamped as today. A short level never scrolls because of the offset.
- **Tandem:** unchanged. Midpoint framing, one-home framing and the 28-tile edge-arrow rule do not use look-ahead.
- **Respawn / R:** the offset resets to 0 with the camera. There is no pan at respawn (`clarity-fixes.md`: no opening pan).
- **Reduced motion:** same offset, with the same easing as the camera already has under reduced motion.
- **Hints, HUD, exit arrow and sweep marker:** unchanged. The sweep marker and the exit edge arrow are still drawn against the view edges.
- **Vertical:** none. Levels are ≤ 15 rows and do not scroll vertically.

## Tuning

- `cameraLookAheadTiles`: **6** (proposed). Tech-lead adds the key to `Tuning` and the schema, then design adds the value to `tuning.json`. The scene reads `redSpeed` (or the band-4 threshold) from tuning as today.

## Acceptance (qa-tester)

1. On the w4-04 recording replay, at every step where the runner is right of x 18 and before the brake pad's last tile (x 29), the view's right edge is ≥ the blue bridge's first column (30) before the runner reaches x 21.
2. Standing still for 60 steps: the view is centred on the body, as before, within 1 px.
3. A Tandem level (w3-03 replay): the camera x is the same as before the change, every frame.
4. No level's camera ever leaves its bounds. `npx vitest run src/entities` and the e2e camera checks are green.

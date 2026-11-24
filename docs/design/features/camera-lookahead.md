# Feature: Camera look-ahead

_Owner: design-lead. Written 2026-11-24 (B12-C3 triage, `decisions.md` "Batch 12 cold playtest triage" item 5). Revised the same night after tech-lead's questions (`decisions.md` "Camera look-ahead: tech-lead's questions"). **Priority: Should** (cut freely at freeze; nothing else depends on it). Lane: [scene] (render only; no sim, contract or level-format change). Brief: `docs/tech/expansion-approach.md` §9._

## Rule

When one body is followed, the camera's x target is the body's x plus a **lead**. Each frame the lead target is `cameraLookAheadTiles × clamp(vx / redSpeed, −1, 1)` (signed, in the direction of motion). The lead itself eases toward that target with a time constant of `cameraLookAheadEaseMs`. The body itself is still followed with no easing, as today. Only the lead eases. At red speed going right, the view shows about 21 tiles ahead instead of 15, so the next bridge's colour is on screen before the brake point.

## Edge cases

- **Standing still:** the lead target is 0, so the lead eases back to 0. It does not hold.
- **Turning around:** `vx` passes through 0, so the target moves smoothly from +lead to −lead and the lead eases after it. It never snaps.
- **Wall stop, landing or a speed drop:** the target follows `vx` and the lead eases. There is no special case.
- **Respawn, post respawn, R and level load:** the lead is set to 0 at once, together with the camera's existing snap to the body. There is no pan (`clarity-fixes.md`: no opening pan).
- **Reduced motion:** the same 350 ms ease. A snap would be a jump cut on every turn, which is worse for motion comfort. A slower ease would only add drift.
- **Tandem:** unchanged. Midpoint framing, one-home framing and the 28-tile edge-arrow rule use no lead. When Tandem framing falls back to following one body (one body home, or more than 28 tiles apart), there is still no lead.
- **Level bounds:** the camera is clamped as today. A level 30 tiles wide or less never scrolls.
- **Hints, HUD, exit arrow and sweep marker:** unchanged. The marker and the arrow are still drawn against the view edges.
- **Vertical:** no lead. Levels are ≤ 15 rows.

## Tuning

- `cameraLookAheadTiles`: **6** (in `tuning.json`, range 0–12). 0 turns the feature off.
- `cameraLookAheadEaseMs`: **350** (new). Tech-lead adds it to `Tuning` and the schema, then design adds the value. Until it lands, [scene] may use 350 as a named default read in one place.

## Acceptance (qa-tester)

The 480×270 view is 30 tiles wide (16 px tiles). With no lead, at most 15 tiles are visible ahead of the body's centre.

1. **Fails today:** on a level with flat floor at least 60 tiles long, sprint right at gear 4. After 1 s at red speed (band 4), more than 15 tiles ahead of the body's centre must be on screen: the whole tile 19 columns ahead of the body's column is on screen (camera right edge ≥ body x + 19.5 tiles). Mirrored going left. Today the right edge is body x + 15, so this fails.
2. Standing still for 60 steps after a sprint, the view is centred on the body within 1 px, and the lead is never 0 within the first 6 steps of letting go (it eases; no snap).
3. On turning around at red speed, the lead changes by at most 10 px in any one frame (an instant flip of 192 px eased at 350 ms moves at most about 9 px a frame), so there is no snap.
4. On the first frame after a respawn, post respawn or R, the view is centred on the body (lead 0).
5. On a Tandem level (w3-03 replay), the camera x is the same as before the change, every frame.
6. No level's camera ever leaves its bounds. `npx vitest run src/entities` and the e2e camera checks are green.

# Camera look-ahead: tuning key (tech-lead, 2026-11-24)

- `cameraLookAheadTiles` added to `Tuning` / `TUNING_SCHEMA` (`src/core/contracts/tuning.ts`, new kind `leadTiles`: finite 0..12). Render only; not in `SimParams`; no golden hash, replay or solution change.
- **`src/data/tuning.json` is design-lead's file.** Tech-lead added the one line `"cameraLookAheadTiles": 6` on design-lead's explicit ruling (`docs/design/features/camera-lookahead.md` "Tuning"; `decisions.md` B12 triage item 5), because `tests/arch/tuning-schema.test.ts` requires the JSON and the type to agree in one commit. Design may change the value freely (0 disables the feature).
- Follow-up (same day): `cameraLookAheadEaseMs` (kind `ms`, render only) added to the schema, and the line `"cameraLookAheadEaseMs": 350` to `tuning.json`, again on design-lead's explicit ruling (`camera-lookahead.md` "Tuning", `decisions.md` item 7).
- Checked: `npx vitest run tests/arch src/core/types.test.ts` (14 files, 720 passed); `npm run typecheck` clean.
- [scene] brief: `docs/tech/expansion-approach.md` §9.

# Feature: progress save

_Owner: design-lead. Milestone: **M2** (M2-34). Builders: ui-engineer (`src/save/**`, already built in M1-16; M2-10 adds the progress helpers from `level-select.md`), tech-lead (M2-40: one shared `SaveStore`). GDD: §10. Architecture: `docs/tech/architecture.md` §9._

## Rule

Each browser remembers:
- which levels you have cleared;
- your best (lowest) step count per level;
- your settings;
- whether the Sticky Keys tip has been shown.

Everything else is derived when it is needed: unlocks, displayed times, the PLAY target. The game is fully playable when storage is blocked; progress then lasts for the session only.

## What is stored (`SaveData` v1, `src/save/schema.ts`)

| Field | Meaning |
|---|---|
| `progress.completedLevels` | Level ids, unique, in first-completion order. |
| `progress.bestSteps` | id → lowest `wonAtStep` (whole steps, ≥ 1). |
| `settings.*` | Volumes, reduced effects, reduced motion (M3-15). |
| `settings.stickyKeysTipShown` | The one-time tip has been displayed (`sticky-keys-tip.md`). |

**Not stored:**
- the unlocked set (derived, `level-select.md`);
- times as text or milliseconds;
- level versions;
- the current level or position (there is no mid-level resume);
- the selected gear;
- recordings (the M3 leaderboard sends them; they are not kept locally).

## When it is written

- Once per win, before the results panel (`results.md`).
- When a setting changes.
- When the Sticky Keys tip is displayed.
- **Never during play steps.** There are no per-frame writes.

## Edge cases

- **Storage blocked or throwing** (sandboxed iframe, private window): memory only for the session, no error dialog. The title shows `PROGRESS IS NOT SAVED IN THIS WINDOW`.
- **Quota full or a write throws:** that write stays in memory and play continues. It is treated like blocked storage for that write.
- **Corrupt JSON, a missing version, or an unknown shape:** defaults (`parseSave` never throws). A save from a newer build is read field by field.
- **Level `version` bump:** bests are keyed by id only, so a best survives a grid change. This is accepted for the jam: grids freeze at M4 and only developers' saves see changes before that. Leaderboards (M3-02) key by level version.
- **Removed or renamed level ids:** their entries stay in the save and are ignored for display.
- **Two tabs:** the last write wins. Accepted.
- **Closing the tab mid-level:** nothing is saved for that run.
- **Replay mode and world 0:** never write progress.
- **Reset progress:** **Could**, as an item in the M3-15 settings screen with a two-step confirm. It clears progress only and keeps settings. Playtesters needing a clean save use a private window.
- **Privacy:** nothing leaves the browser, except leaderboard submissions the player makes in M3.

## Tuning

None.

## Acceptance

1. Win a level and reload the page: the level is still cleared and its best kept (e2e).
2. With a storage stub whose `getItem`/`setItem` throw: the game boots, a level can be won, the results show the session best, and the title shows the not-saved line (unit on the store + e2e with storage blocked).
3. Corrupt JSON at `redshift.save`: the store loads defaults without throwing.
4. After any number of wins, the stored JSON has no unlock field. `progress` holds only `completedLevels` and `bestSteps`.
5. `recordLevelComplete` with a slower run keeps the best, and with a faster run replaces it.
6. A save whose `completedLevels` contains an unknown id loads, and the id is still there after the next write.
7. A settings change survives a reload.
8. Spy on storage writes during 600 steps of play with no win: zero writes.
9. A replay-mode win and a world 0 win both leave storage byte-identical.

## Priority

- **Must:** cleared levels, best steps, the blocked-storage fallback, no writes during play, no writes from replays or world 0.
- **Should:** the not-saved notice on the title.
- **Could:** reset progress (M3-15).

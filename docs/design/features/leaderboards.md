# Feature: leaderboards

_Owner: design-lead. Milestone: **M3** (M3-02). Priority: **Should** (GDD §10); the game ships offline-only if USER-2 is skipped. Builders: backend-engineer (M3-11 `submit-run`, M3-12 deploy, M3-13 `src/net`), ui-engineer (M3-14 panel and name entry, M3-15 settings), tech-lead (M3-04 payload types). Related: `results.md` (the panel this sits beside), `progress-save.md` (what stays local), `menu-navigation.md` (fresh-press rule, no Shift). Table: `backend/migrations/0001_runs.sql`._

## Rule

Each level has one public board per level version. Runs are **ranked by steps** (lower is better) and **shown as time**. A run is posted only after the player has chosen a name, and only when it is their first clear or a new best. The board never blocks, delays or interrupts play: offline, slow or broken, the game behaves exactly as it does without leaderboards.

## Time vs steps

- **The ranked value is `wonAtStep`**, the same number the results panel shows as time. Steps are exact and deterministic; times are only for display.
- **Displayed as `formatTime(steps, stepHz)`** (`M:SS.ss`, hundredths, truncated; `level-select.md`). At 60 Hz two different step counts never show the same time (one step is 1.67 hundredths), so equal displayed times always mean equal steps.
- **Ties:** equal steps rank by submission order (earlier first), then id. This is the existing index order.
- **The clock runs from spawn, idle time included** (decision 2026-11-03, now confirmed for boards). Death and restart reset the step counter (`safe-tiles-and-reset.md`), so only the winning attempt counts. No "first input" rule: it would need a definition that a replay can reproduce, and standing still at the start only costs the player.
- **Tandem:** the step both bodies are home, as on the results panel.

## Which runs are posted

- Only when **all** hold: leaderboards are configured (env present), a name is set, the run is a `FIRST CLEAR` or `NEW BEST` (the same test as the results marker), the level is not world 0, and the game is not in replay mode. (e2e runs mock the endpoints with Playwright routes, so a QA build may post to a mock but is never pointed at the real project.)
- A run that was not posted (no name yet, or offline) is **not queued**. The player posts again by beating that time later. (A retry queue is Could.)
- The payload is level id, level version, steps, the display name and the input log of the winning attempt (`RunResult.solution`, run-length format, `level-format.md` §4). Nothing else: no device id, no wall-clock time, no save contents.

## Names

- **1 to 12 characters**, after trimming. The table allows 24; 12 keeps a board row inside the panel at 1× (rank, name, time = 23 glyphs = 138 px).
- **Characters:** `A`–`Z`, `0`–`9`, space and `-`. Letters are upper case only: the pixel font's menus are upper case, and typing needs no Shift (menus never use Shift, `menu-navigation.md`). Lower-case key presses type the upper-case letter.
- No leading or trailing space, no two spaces in a row (the entry field refuses the key).
- **The allow-list as one pattern (SEC-2, 2026-11-05):** a name is valid if it matches `^[A-Z0-9-]+( [A-Z0-9-]+)*$` and is 1 to 12 characters long. The client, the SQL check and the edge function all use this pattern (shared constant via M3-04). The server never trims or upper-cases: it rejects anything that doesn't match, with code `name`.
- **Blocked names:** the server checks a short blocklist after normalising (`0→O`, `1→I`, `3→E`, `4→A`, `5→S`, `7→T`, spaces and `-` removed), and rejects a match with code `name`. The client does not ship the list. _(Matching rule, 2026-11-16:)_ the list has two parts. **Contains** terms (long, unambiguous) reject a name whose normalised form contains them anywhere. **Whole** terms (short words that hide inside ordinary words, such as `ASS` in `CLASS`) reject only a normalised name equal to the term. The terms themselves go to backend-engineer by request line and live only in `backend/functions/submit-run/rules.ts`.
- Names are not unique and not owned. Two players may both be `ACE`. Accepted for a jam; there are no accounts.
- **Stored locally** as `settings.leaderboardName` (string or absent). Clearing it in settings stops posting.

## Name entry

- Opened only by choosing **POST** on the board (below) or **NAME** in settings. Never opens by itself.
- A 12-cell field at 2×, the allowed characters listed under it at 1× (`A-Z 0-9 SPACE -`), a caret. Inside the field **every letter key types**, including Q, E, Z, X and W, A, S, D; this is the one screen where gear and move keys don't navigate. Backspace deletes, Enter confirms, Esc cancels.
- Enter with an empty field does nothing.
- On confirm the name is saved and the pending run is posted. A `name` rejection reopens the field with the muted line `NAME NOT ALLOWED` and the text kept.
- The fresh-press rule applies when the field opens: the Enter that chose POST does not confirm.

## The board panel (beside the results panel)

The results panel (`results.md`) shifts left; the board sits to its right on the same `ui.panel` backing, at most 160 × 140 px, 1× text.

- **Header:** `BOARD` and the level label.
- **Rows:** the **top 5**: rank, name, time. Each name appears **once per board, at its best run** (the query returns each display name's best row).
- **You:** if this run was posted and is outside the top 5, a sixth row after a gap: `23 ACE 0:14.02`. The player's row (in or out of the top 5) uses the focus text colour and the star icon.
- **States:**
  - **configured off** (no env): no board panel at all, the results panel stays centred, and nothing anywhere mentions leaderboards;
  - **loading:** `…` in the rows area for up to the request timeout (3 s, backend constant);
  - **offline or error:** one muted line `BOARD OFFLINE`; no retry item, no error dialog; the next results panel tries again;
  - **empty board:** `NO TIMES YET`;
  - **no name set:** rows show as normal and an extra item **POST** joins NEXT / RETRY / LEVELS (last in the list, never focused first);
  - **rejected run** (floor time, rate limit, bad payload): the run is simply not shown as yours, with the muted line `NOT POSTED`. No reason text except for `name`.
- **Focus starts on NEXT** as today. Up/Down move through NEXT, RETRY, LEVELS, POST. The board rows are not focusable.
- Submitting starts when the panel is shown (after the 0.6 s beat) and never delays any item: choosing NEXT while a request is in flight just drops the result.

## Level select

- Cells show the local best only (as in M2). A board's #1 time on the detail line is **Could**.

## Server rules (M3-11)

- **Floor time:** a run with fewer steps than the level's floor is rejected (`floor`). Floor = 85% of the level's **fastest known** step count, rounded down. level-designer records the fastest known count per level in `levels/README.md` (the minimum winning step count seen in the sweeps); backend-engineer bakes the table into the function at deploy. A level with no recorded figure has no floor.
- **Version:** the function accepts the version of the level it knows and rejects others (`version`), so an old cached build can't post to a new board.
- **Rate limit:** must never touch a normal player. At least 20 submissions per minute per IP are accepted (the shortest level takes over 5 s); above that, `rate`.
- **Input log:** stored, never served to clients (already in the migration). Server replay is v2 (`verified`); it is not needed for M3.
- **Response:** `{ ok: true, rank, total }` or `{ ok: false, code: 'name' | 'floor' | 'version' | 'rate' | 'invalid' }`. The client shows `rank` in the "you" row.

## Edge cases

- **Network drops between submit and fetch:** the board shows `BOARD OFFLINE` even if the submit succeeded. Accepted.
- **Two tabs, same name:** both post; the board shows that name once, at its best.
- **Name changed later:** new runs post under the new name; old rows keep the old name. No rename on the server.
- **Storage blocked:** the name lasts for the session.
- **Level version bump before M4:** a new empty board; old rows stay in the table and are not queried.
- **Muted or reduced effects:** no effect on the board.
- **Keys held through the win:** the fresh-press rule covers POST like every other item.

## Tuning

None in `tuning.json` (not gameplay). Constants with their owners: request timeout 3 s and board size 5 (`src/net`, ui), name length 12 and charset (shared constant from `src/core/types.ts` via M3-04 so client and server agree), floor factor 0.85 and rate limit (backend).

## Acceptance

1. With no Supabase env, a win shows the results panel centred and no board, and the network log is empty (e2e).
2. With the network blocked (route abort), a win shows `BOARD OFFLINE` within 3 s and NEXT works immediately (e2e).
3. Slow server (5 s delay): NEXT chosen at 0.7 s starts the next level at once; the late response causes no error and no draw (e2e, mocked).
4. A run that is neither a first clear nor a new best sends no request (spy).
5. Replay mode and world 0 never send a request (spy).
6. With no name set, POST appears as the last item and focus starts on NEXT; choosing POST opens name entry; a name entered and confirmed is saved and the run is posted once (mocked).
7. Name entry: Q, E, Z, X and A, D type letters; Shift does nothing; a 13th character is refused; a leading space and a double space are refused; Enter on empty does nothing; Esc cancels and nothing is posted.
8. A `name` rejection reopens the field with `NAME NOT ALLOWED` and the text kept (mocked).
9. Board rows: 5 rows sorted by steps then submission order; the same name appears once at its best; the player's row outside the top 5 shows as a sixth row with the returned rank (mocked).
10. Times on the board equal `formatTime(steps)`: 775 → `0:12.91`.
11. Server (unit, M3-11): floor = floor(0.85 × fastest known); a run one step under it is rejected `floor`, one at it is accepted; a wrong version is rejected `version`; names failing length, charset, spacing or the normalised blocklist are rejected `name` (`ACE` ok, `A  CE`, ` ACE`, 13 chars, lower case all rejected). Blocklist: `SH1T`, `F-UCK` and `ASS` rejected; `CLASS`, `GRAPE`, `COCKPIT` and `BASS` accepted.
12. Server (unit): 20 submissions in one minute from one IP all accepted; the 21st-plus may be `rate`.
13. The client never sends or reads `input_log` in a select (`select=*` refused by the column grants; integration test from M1-19).
14. Settings: clearing the name stops posting (spy) and POST appears again on the next win.

## Priority

- **Should** as a whole (GDD §10).
- Inside it, **Must if leaderboards ship:** offline-first behaviour (checks 1–3, 5), name rules (7, 11), posting only with a name (6), floor time and rate limit (11, 12), no `input_log` to clients (13).
- **Should:** the "you" row outside the top 5, `NAME NOT ALLOWED` text, settings NAME item.
- **Could:** retry queue for unposted runs, a board #1 time in level select, server replay verification (v2).

# M1 gate: by-hand checks (M1-55)

**Update 2026-11-13: the owner signed off M1 and deferred these five checks to the M2 gate, to be done on the pixel build (480x270, integer zoom).** They are now part of the M2 gate. Everything below stays valid, with these differences: the game is 480x270 shown at 2x in the 960x540 embed, the gear meter and text are the pixel bitmap font, and check 3 (greyscale) should also look at the pixel patterns. Nothing here is claimed done.

Owner: the human (USER-9). QA does not run these and claims none done. Tick each box, note the date and browser, then say "M1 signed off".

## Start the build
From the project root (Node 22.12 or newer):

    npm run build
    npm run preview

Open http://localhost:4173/?level=w0-02 (the M1 room). Click the game once so it has focus. Press R to restart at any time.
For the F3 and SFX checks you can use `npm run dev` and http://localhost:5173/?level=w0-02 instead.

## 1. Keyboard-only run of w0-02 (no mouse after the first click)
Do the run three times, once per binding set:
- Shift keys: Left Shift down, Right Shift up.
- Q and E: Q down, E up.
- Z and X: Z down, X up.
Move with A/D or the arrows, jump with Space, W or Up. Pause with Esc or P.

Pass: each time you reach the exit and see the "Level complete" banner. Every gear change shows on the meter. No dead key. (Windows may offer the Sticky Keys prompt on five Shift presses: the game's tip should appear once; dismiss it.)

- [ ] Shift keys  - [ ] Q/E  - [ ] Z/X

## 2. SFX listen
Headphones or speakers on, volume up. In w0-02 do each: jump, land, shift up, shift down, die (touch a wrong-color tile), win, pause and resume.

Pass: each action makes its own sound, no sound clips or crackles, none is missing, nothing plays twice per action, and no sound plays while paused.

- [ ] done

## 3. Greyscale look at the gear meter
Chromium: open DevTools (F12), More tools, Rendering, "Emulate vision deficiencies" = Achromatopsia. (Or set the OS color filter to Greyscale.) Play the first 20 seconds of w0-02, shifting through all four gears.

Pass: you can tell the four gears apart on the meter and on the tiles by pattern or glyph alone, and you can tell which gear is selected and which cell is lit.

- [ ] done (reset the emulation afterwards)

## 4. 60 fps from the F3 overlay
Use the dev server (`npm run dev`, http://localhost:5173/?level=w0-02). Press F3 to show the overlay (if nothing appears, record that and note it: the overlay may not be wired in this build). Close other heavy tabs. Run for 30 seconds, including a fast gear-4 run.

Pass: the FPS reads 58 or higher most of the time (brief dips under 55 are OK, sustained ones are not). Write down the reading and the machine.

- [ ] FPS: ____  Machine: ____________

## 5. Non-Chromium browser
Open http://localhost:4173/?level=w0-02 in Firefox (and Safari if you have it). Run the preview build, not dev.

Pass: it loads with no blank canvas, keyboard works (move, jump, gears with Shift and Q/E and Z/X), sound plays after the first key press, you can finish w0-02, and Esc pauses. Note any difference in speed or look.

- [ ] Firefox  - [ ] Safari (optional)

## Sign-off
All boxes ticked, no blocker or major in `docs/qa/bugs.md`: tell the orchestrator "M1 signed off". Record any problem as a line to qa-tester.

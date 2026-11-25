// Clip definitions. plan(rec) returns plan(step, obs) -> buttons for the next sim step, or null to stop.
// Buttons: R L J (held), + (Right Shift) - (Left Shift), ! (restart). Steps count from the first frame after R (kinetic step = step).

/** Follow the recording from `from` to `to` (a `lead` of idle steps is put in front of it: only for levels whose clocks do not matter, or a
 *  multiple of the emitter period); after a win keep rolling `tail` frames. Steps before `from` are run uncaptured. */
function recorded(level, from, to, tail = 30, lead = 0) {
  return { level, from, plan: (rec) => { let after = 0; return (step, o) => {
    if (o.status === 'won') return ++after > tail ? null : '';
    if (step >= to + lead) return after++ >= tail ? null : '';
    return step < lead ? '' : (rec[step - lead] ?? '');
  }; } };
}

/** Follow the recording up to `until(o)`, then hand over to `then(o, n)` (n = frames since the handover); null stops. */
function scripted(level, from, { follow, until, then }) {
  return { level, from, plan: (rec) => { let n = -1; return (step, o) => {
    if (n < 0 && until(o, step)) n = 0;
    if (n < 0) return follow ? follow(rec, step, o) : '';
    return then(o, n++);
  }; } };
}

export const CLIPS = {
  // 1: walk blue onto the bridge, let go mid-bridge, turn white, fall through.
  'shot-01-w1-01-fall-through': scripted('w1-01', 0, {
    follow: (rec, step) => (step < 90 ? '' : 'R'),
    until: (o) => o.x >= 5.8,
    then: (o, n) => (n > 100 ? null : ''),
  }),
  'shot-02-w1-03-runway': recorded('w1-03', 0, 283, 90, 90),
  'shot-03-w1-05-red-wall': recorded('w1-05', 0, 139, 70, 90),
  'shot-04-w2-02-coast': recorded('w2-02', 0, 182, 70, 90),
  'shot-05-w3-03-gear-split': recorded('w3-03', 0, 220, 0, 90),
  // 6a: green walker stops on the level green slab, turns white, drops through.
  'shot-06a-w4-03-slab-fail': scripted('w4-03', 0, {
    follow: (rec, step) => (step === 0 ? '+' : step < 70 ? '' : 'R'),
    until: (o) => o.x >= 13.6,
    then: (o, n) => (n > 120 ? null : ''),
  }),
  'shot-06b-w4-03-slab-cross': recorded('w4-03', 0, 215, 60),
  'shot-07a-w5-01-bolt': recorded('w5-01', 0, 182, 60, 64),
  'shot-07b-w5-03-hurdle': recorded('w5-03', 120, 340, 0),
  // 8: follow w2-05 past post 1 (lit at step ~467), stop on the blue bridge to fall, die, respawn at the post.
  'shot-08-w2-05-checkpoint': (() => { let dead = false, back = 0; return scripted('w2-05', 340, {
    follow: (rec, step) => rec[step] ?? '',
    until: (o) => o.x >= 83,
    then: (o) => { if (o.status !== 'playing') dead = true; if (dead && o.status === 'playing') back++; return back > 130 ? null : ''; },
  }); })(),
  // 9a-c: w5-05 beats. a: red coast over the yellow fountain; b: walking up the rising lift under white bolts; c: blue walk to the exit.
  'shot-09a-w5-05-red-coast': recorded('w5-05', 170, 345, 30),
  'shot-09b-w5-05-lift': recorded('w5-05', 1080, 1260, 0),
  'shot-09c-w5-05-walk-home': recorded('w5-05', 3550, 99999, 90),
  // bonus: w4-04 Outrun, the saw-toothed front close behind the runner.
  'shot-10-w4-04-outrun-sweep': recorded('w4-04', 930, 1090, 0),
};

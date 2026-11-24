// The client cannot import the edge function (Deno), so its run-length cap is kept equal by test.
// Owner: backend-engineer.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAX_RUN_STEPS as SERVER_CAP } from '../backend/functions/submit-run/rules';
import { MAX_RUN_STEPS as CLIENT_CAP } from '../src/net/submitPolicy';

describe('run-length cap parity', () => {
  it('client and edge function use the same MAX_RUN_STEPS', () => {
    expect(CLIENT_CAP).toBe(SERVER_CAP);
  });
  it('validate.ts has no private copy of the cap', () => {
    const src = readFileSync('src/net/validate.ts', 'utf8');
    expect(src).not.toMatch(/36_?000/);
    expect(src).toContain("from './submitPolicy'");
  });
  it('the migration range matches', () => {
    const sql = readFileSync('backend/migrations/0002_submit_run.sql', 'utf8');
    expect(sql).toContain(`steps between 1 and ${SERVER_CAP}`);
  });
});

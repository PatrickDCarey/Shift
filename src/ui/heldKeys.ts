/**
 * Tracks which `KeyboardEvent.code`s are down, for `stepMenuInput`. Ignores
 * auto-repeat (so a key held while a scene opens is never seen as fresh) and
 * forgets everything on blur. Mutable on purpose: one per scene, fed by DOM
 * events.
 *
 * Owner: ui-engineer.
 */
export class HeldKeys {
  private readonly down = new Set<string>();

  keyDown(code: string, repeat = false): void {
    if (!repeat) this.down.add(code);
  }

  keyUp(code: string): void {
    this.down.delete(code);
  }

  clear(): void {
    this.down.clear();
  }

  snapshot(): ReadonlySet<string> {
    return new Set(this.down);
  }
}

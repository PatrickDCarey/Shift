// Unit tests for the itch.io zip writer. Owner: backend-engineer.
// Not picked up by `npm test` until vitest.config.ts includes `scripts/**/*.test.ts` (requests.md).
import { describe, expect, it } from 'vitest';
import { createZip, readZip } from './zip.mjs';

const bytes = (text: string): Uint8Array => new TextEncoder().encode(text);

describe('createZip / readZip', () => {
  it('round-trips compressible and incompressible files', () => {
    const noise = Uint8Array.from({ length: 64 }, (_, i) => (i * 97 + 13) % 256);
    const zip = createZip([
      { name: 'index.html', data: bytes('<html>'.repeat(200)) },
      { name: 'assets/a.bin', data: noise },
      { name: 'empty.txt', data: new Uint8Array() },
    ]);
    const files = readZip(zip);
    expect(files.map((f) => f.name)).toEqual(['assets/a.bin', 'empty.txt', 'index.html']);
    expect(files[0]?.data.equals(Buffer.from(noise))).toBe(true);
    expect(files[1]?.data.length).toBe(0);
    expect(files[2]?.data.toString()).toBe('<html>'.repeat(200));
  });

  it('is byte-identical for the same files in any input order', () => {
    const a = { name: 'a.txt', data: bytes('a') };
    const b = { name: 'b/c.txt', data: bytes('bc') };
    expect(createZip([a, b]).equals(createZip([b, a]))).toBe(true);
  });

  it('keeps non-ASCII names', () => {
    expect(readZip(createZip([{ name: 'ünï/ß.txt', data: bytes('x') }]))[0]?.name).toBe('ünï/ß.txt');
  });

  it.each(['', '/abs.txt', 'dir/', 'a\\b.txt','../up.txt', 'a/../b.txt', 'a//b.txt', './a.txt', 'C:/x.txt'])(
    'rejects the unsafe name %j',
    (name) => {
      expect(() => createZip([{ name, data: bytes('x') }])).toThrow(/unsafe zip entry name/);
    },
  );

  it('rejects duplicate names', () => {
    const f = { name: 'a.txt', data: bytes('x') };
    expect(() => createZip([f, f])).toThrow(/duplicate/);
  });

  it('detects a corrupted file', () => {
    const zip = Buffer.from(createZip([{ name: 'a.txt', data: bytes('hello') }]));
    const at = zip.indexOf('hello');
    expect(at).toBeGreaterThan(0); // tiny files are stored, so the text is visible
    zip[at] = 0x48;
    expect(() => readZip(zip)).toThrow(/checksum mismatch/);
  });

  it('rejects data that is not a zip', () => {
    expect(() => readZip(bytes('definitely not a zip file at all'))).toThrow(/not a zip/);
  });
});

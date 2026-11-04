/**
 * Test-only helper: read the committed PNG sheets in `assets/art/pixel/` back into rasters, so a
 * test can compare the pixels (not just a hash in a JSON file) with what the code bakes. Reads the
 * files that `build.mjs` writes (RGBA8, no interlace, filter 0). Owner: art-director.
 */
import { createRaster, type Raster } from './raster';

const inlined = import.meta.glob('/assets/art/pixel/*.png', { query: '?inline', import: 'default', eager: true }) as Record<string, string>;

/** Names of the committed PNG files, e.g. `pixel-font.png`. */
export function committedPngNames(): string[] {
  return Object.keys(inlined).map((p) => p.slice(p.lastIndexOf('/') + 1)).sort();
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function readCommittedPng(name: string): Promise<Raster> {
  const url = inlined[`/assets/art/pixel/${name}`];
  if (!url) throw new Error(`no committed PNG ${name}`);
  const b64 = url.slice(url.indexOf(',') + 1);
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const view = new DataView(bin.buffer);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  const idat: Uint8Array[] = [];
  let pos = 8;
  while (pos < bin.length) {
    const len = view.getUint32(pos);
    const type = String.fromCharCode(...bin.subarray(pos + 4, pos + 8));
    if (type === 'IDAT') idat.push(bin.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const joined = new Uint8Array(idat.reduce((n, c) => n + c.length, 0));
  let off = 0;
  for (const c of idat) {
    joined.set(c, off);
    off += c.length;
  }
  const raw = await inflate(joined);
  const out = createRaster(width, height);
  const stride = width * 4 + 1;
  for (let y = 0; y < height; y++) out.data.set(raw.subarray(y * stride + 1, (y + 1) * stride), y * width * 4);
  return out;
}

// Minimal zip writer and reader for the itch.io package (no dependencies).
// Owner: backend-engineer. Why not `zip` or `Compress-Archive`: neither exists on every
// machine this repo is built on, and Windows PowerShell 5.1 writes backslash paths that
// itch.io's unzipper rejects. This writer always emits forward slashes, sorted entries,
// UTF-8 names and a fixed timestamp, so the same build gives the same bytes.

import { crc32, deflateRawSync, inflateRawSync } from 'node:zlib';

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_END = 0x06054b50;
const VERSION_NEEDED = 20;
const MADE_BY_UNIX = (3 << 8) | VERSION_NEEDED;
const FLAG_UTF8 = 0x0800;
const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;
const DOS_TIME = 0; // 00:00:00
const DOS_DATE = (0 << 9) | (1 << 5) | 1; // 1980-01-01
const FILE_ATTR = (0o100644 << 16) >>> 0;
const MAX_ENTRIES = 0xfffe;
const MAX_SIZE = 0xfffffffe; // no zip64: the game is a few MB
const MAX_NAME_BYTES = 0xffff;
/** Default cap on one inflated entry in `readZip`. */
const DEFAULT_MAX_ENTRY_BYTES = 256 * 1024 * 1024;

/** Reject names that could escape the extraction folder or confuse an unzipper. */
function checkName(name) {
  const bad =
    name.length === 0 ||
    Buffer.byteLength(name, 'utf8') > MAX_NAME_BYTES ||
    name.includes('\\') ||
    name.includes('\0') ||
    name.includes(':') ||
    name.startsWith('/') ||
    name.endsWith('/') ||
    name.split('/').some((part) => part === '' || part === '.' || part === '..');
  if (bad) throw new Error(`unsafe zip entry name: ${JSON.stringify(name.slice(0, 80))}`);
}

function localHeader(nameBytes, method, crc, csize, usize) {
  const h = Buffer.alloc(30);
  h.writeUInt32LE(SIG_LOCAL, 0);
  h.writeUInt16LE(VERSION_NEEDED, 4);
  h.writeUInt16LE(FLAG_UTF8, 6);
  h.writeUInt16LE(method, 8);
  h.writeUInt16LE(DOS_TIME, 10);
  h.writeUInt16LE(DOS_DATE, 12);
  h.writeUInt32LE(crc, 14);
  h.writeUInt32LE(csize, 18);
  h.writeUInt32LE(usize, 22);
  h.writeUInt16LE(nameBytes.length, 26);
  h.writeUInt16LE(0, 28);
  return h;
}

function centralHeader(nameBytes, method, crc, csize, usize, offset) {
  const h = Buffer.alloc(46);
  h.writeUInt32LE(SIG_CENTRAL, 0);
  h.writeUInt16LE(MADE_BY_UNIX, 4);
  h.writeUInt16LE(VERSION_NEEDED, 6);
  h.writeUInt16LE(FLAG_UTF8, 8);
  h.writeUInt16LE(method, 10);
  h.writeUInt16LE(DOS_TIME, 12);
  h.writeUInt16LE(DOS_DATE, 14);
  h.writeUInt32LE(crc, 16);
  h.writeUInt32LE(csize, 20);
  h.writeUInt32LE(usize, 24);
  h.writeUInt16LE(nameBytes.length, 28);
  h.writeUInt32LE(FILE_ATTR, 38);
  h.writeUInt32LE(offset, 42);
  return h;
}

function endRecord(count, centralSize, centralOffset) {
  const e = Buffer.alloc(22);
  e.writeUInt32LE(SIG_END, 0);
  e.writeUInt16LE(count, 8);
  e.writeUInt16LE(count, 10);
  e.writeUInt32LE(centralSize, 12);
  e.writeUInt32LE(centralOffset, 16);
  return e;
}

/**
 * @param {ReadonlyArray<{ name: string, data: Uint8Array }>} entries
 * @returns {Buffer}
 */
export function createZip(entries) {
  if (entries.length > MAX_ENTRIES) throw new Error(`too many entries: ${entries.length}`);
  const sorted = [...entries].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const seen = new Set();
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const { name, data } of sorted) {
    checkName(name);
    if (seen.has(name)) throw new Error(`duplicate zip entry: ${name}`);
    seen.add(name);
    const raw = Buffer.from(data);
    if (raw.length > MAX_SIZE) throw new Error(`file too large for zip: ${name}`);
    const deflated = deflateRawSync(raw, { level: 9 });
    const useDeflate = deflated.length < raw.length;
    const body = useDeflate ? deflated : raw;
    const method = useDeflate ? METHOD_DEFLATE : METHOD_STORE;
    const nameBytes = Buffer.from(name, 'utf8');
    const crc = crc32(raw);
    const local = localHeader(nameBytes, method, crc, body.length, raw.length);
    chunks.push(local, nameBytes, body);
    central.push(centralHeader(nameBytes, method, crc, body.length, raw.length, offset), nameBytes);
    offset += local.length + nameBytes.length + body.length;
    if (offset > MAX_SIZE) throw new Error('zip too large (no zip64 support)');
  }

  const centralBytes = Buffer.concat(central);
  return Buffer.concat([...chunks, centralBytes, endRecord(sorted.length, centralBytes.length, offset)]);
}

/**
 * Read a zip made by `createZip` (or any zip without zip64, spanning or encryption),
 * checking every entry's CRC. Used for the package self-check and in tests; for zips this
 * repo built itself. `maxEntryBytes` stops a hostile zip from inflating without limit.
 * @param {Uint8Array} bytes
 * @param {{ maxEntryBytes?: number }} [options]
 * @returns {{ name: string, data: Buffer }[]}
 */
export function readZip(bytes, { maxEntryBytes = DEFAULT_MAX_ENTRY_BYTES } = {}) {
  const buf = Buffer.from(bytes);
  const endAt = buf.length - 22;
  if (endAt < 0 || buf.readUInt32LE(endAt) !== SIG_END) throw new Error('not a zip (no end record)');
  const count = buf.readUInt16LE(endAt + 10);
  let at = buf.readUInt32LE(endAt + 16);
  const out = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(at) !== SIG_CENTRAL) throw new Error('corrupt central directory');
    const method = buf.readUInt16LE(at + 10);
    const crc = buf.readUInt32LE(at + 16);
    const csize = buf.readUInt32LE(at + 20);
    const usize = buf.readUInt32LE(at + 24);
    const nameLen = buf.readUInt16LE(at + 28);
    const extraLen = buf.readUInt16LE(at + 30);
    const commentLen = buf.readUInt16LE(at + 32);
    const localAt = buf.readUInt32LE(at + 42);
    const name = buf.toString('utf8', at + 46, at + 46 + nameLen);
    at += 46 + nameLen + extraLen + commentLen;

    if (buf.readUInt32LE(localAt) !== SIG_LOCAL) throw new Error(`corrupt local header: ${name}`);
    const dataAt = localAt + 30 + buf.readUInt16LE(localAt + 26) + buf.readUInt16LE(localAt + 28);
    const body = buf.subarray(dataAt, dataAt + csize);
    let data;
    if (method === METHOD_STORE) data = Buffer.from(body);
    else if (method === METHOD_DEFLATE) data = inflateRawSync(body, { maxOutputLength: Math.max(1, maxEntryBytes) });
    else throw new Error(`unsupported compression method ${method}: ${name}`);
    if (data.length !== usize || crc32(data) !== crc) throw new Error(`checksum mismatch: ${name}`);
    out.push({ name, data });
  }
  return out;
}

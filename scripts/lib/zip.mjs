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

/** Reject names that could escape the extraction folder or confuse an unzipper. */
function checkName(name) {
  const bad =
    name.length === 0 ||
    name.includes('\\') ||
    name.startsWith('/') ||
    name.endsWith('/') ||
    /^[A-Za-z]:/.test(name) ||
    name.split('/').some((part) => part === '' || part === '.' || part === '..');
  if (bad) throw new Error(`unsafe zip entry name: ${JSON.stringify(name)}`);
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

    const local = Buffer.alloc(30);
    local.writeUInt32LE(SIG_LOCAL, 0);
    local.writeUInt16LE(VERSION_NEEDED, 4);
    local.writeUInt16LE(FLAG_UTF8, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, nameBytes, body);

    const head = Buffer.alloc(46);
    head.writeUInt32LE(SIG_CENTRAL, 0);
    head.writeUInt16LE(MADE_BY_UNIX, 4);
    head.writeUInt16LE(VERSION_NEEDED, 6);
    head.writeUInt16LE(FLAG_UTF8, 8);
    head.writeUInt16LE(method, 10);
    head.writeUInt16LE(DOS_TIME, 12);
    head.writeUInt16LE(DOS_DATE, 14);
    head.writeUInt32LE(crc, 16);
    head.writeUInt32LE(body.length, 20);
    head.writeUInt32LE(raw.length, 24);
    head.writeUInt16LE(nameBytes.length, 28);
    head.writeUInt32LE(FILE_ATTR, 38);
    head.writeUInt32LE(offset, 42);
    central.push(head, nameBytes);

    offset += local.length + nameBytes.length + body.length;
    if (offset > MAX_SIZE) throw new Error('zip too large (no zip64 support)');
  }

  const centralBytes = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(SIG_END, 0);
  end.writeUInt16LE(sorted.length, 8);
  end.writeUInt16LE(sorted.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, centralBytes, end]);
}

/**
 * Read a zip made by `createZip` (or any zip without zip64, spanning or encryption),
 * checking every entry's CRC. Used for the package self-check and in tests.
 * @param {Uint8Array} bytes
 * @returns {{ name: string, data: Buffer }[]}
 */
export function readZip(bytes) {
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
    else if (method === METHOD_DEFLATE) data = inflateRawSync(body);
    else throw new Error(`unsupported compression method ${method}: ${name}`);
    if (data.length !== usize || crc32(data) !== crc) throw new Error(`checksum mismatch: ${name}`);
    out.push({ name, data });
  }
  return out;
}

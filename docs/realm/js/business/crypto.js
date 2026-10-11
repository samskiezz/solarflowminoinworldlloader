/**
 * Encrypted business snapshots. A built model (or raw export) is gzipped and
 * sealed with AES-256-GCM under a key derived from a passphrase with
 * PBKDF2-SHA256, so a customer-bearing snapshot can sit in Drive, in email
 * or on a USB stick without exposing anything. Runs on WebCrypto in the
 * browser and in Node (globalThis.crypto, CompressionStream), the same bytes
 * either side.
 *
 * Envelope: { kind, v, kdf, iterations, salt, iv, gzip, data } (base64 fields).
 */
export const SNAPSHOT_KIND = 'solarflow-business-snapshot';
export const ITERATIONS = 310000;

const subtle = () => { const c = globalThis.crypto; if (!c || !c.subtle) throw new Error('WebCrypto is not available here'); return c.subtle; };
const enc = new TextEncoder(); const dec = new TextDecoder();
export function toB64(bytes) { let s = ''; const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
export function fromB64(s) { const bin = atob(s); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }

async function deriveKey(passphrase, salt, iterations) {
    const base = await subtle().importKey('raw', enc.encode(String(passphrase).normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
    return subtle().deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function pipe(bytes, Stream, format) {
    if (typeof Stream !== 'function') return null;
    const stream = new Blob([bytes]).stream().pipeThrough(new Stream(format));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}
export async function gzip(bytes) { return (await pipe(bytes, globalThis.CompressionStream, 'gzip')) || null; }
export async function gunzip(bytes) { const out = await pipe(bytes, globalThis.DecompressionStream, 'gzip'); if (!out) throw new Error('gzip is not supported here'); return out; }

export function isEncrypted(json) { return Boolean(json && typeof json === 'object' && json.kind === SNAPSHOT_KIND && typeof json.data === 'string' && json.salt && json.iv); }

/** Seal any JSON value under a passphrase. */
export async function encryptJson(value, passphrase, { iterations = ITERATIONS, compress = true } = {}) {
    if (!passphrase || String(passphrase).length < 8) throw new Error('Use a passphrase of at least 8 characters');
    const plain = enc.encode(JSON.stringify(value));
    const packed = compress ? await gzip(plain) : null;
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16)); const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt, iterations);
    const cipher = await subtle().encrypt({ name: 'AES-GCM', iv }, key, packed || plain);
    return { kind: SNAPSHOT_KIND, v: 1, kdf: 'PBKDF2-SHA256', iterations, cipher: 'AES-256-GCM', gzip: Boolean(packed), salt: toB64(salt), iv: toB64(iv), bytes: plain.length, createdAt: new Date().toISOString(), data: toB64(cipher) };
}
/** Open a sealed snapshot. Throws on a wrong passphrase or a tampered file. */
export async function decryptJson(envelope, passphrase) {
    if (!isEncrypted(envelope)) throw new Error('Not an encrypted snapshot');
    const key = await deriveKey(passphrase, fromB64(envelope.salt), envelope.iterations || ITERATIONS);
    let plain;
    try { plain = new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: fromB64(envelope.iv) }, key, fromB64(envelope.data))); } catch { throw new Error('Wrong passphrase (or the file is damaged)'); }
    if (envelope.gzip) plain = await gunzip(plain);
    return JSON.parse(dec.decode(plain));
}
/** A memorable random passphrase: five words and a number. */
export function randomPassphrase(random = () => globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296) {
    const words = ['amber', 'basalt', 'cobalt', 'delta', 'ember', 'flint', 'granite', 'harbour', 'indigo', 'jasper', 'kestrel', 'lantern', 'meadow', 'nimbus', 'orchid', 'pepper', 'quartz', 'ripple', 'saffron', 'timber', 'umber', 'velvet', 'willow', 'yarrow', 'zephyr', 'copper', 'falcon', 'maple', 'summit', 'tundra'];
    const pick = () => words[Math.floor(random() * words.length) % words.length];
    return `${pick()}-${pick()}-${pick()}-${pick()}-${pick()}-${Math.floor(random() * 900) + 100}`;
}

export const FEATURES = [
    { id: 'biz.crypto.roundtrip', title: 'A snapshot seals with AES-256-GCM under a PBKDF2 passphrase, gzipped, and opens again byte for byte', test: async () => { const value = { version: 1, jobs: [{ id: 'SM8-1', customer: 'Jane Example' }], sites: [], note: 'x'.repeat(5000) }; const env = await encryptJson(value, 'correct horse battery', { iterations: 2000 }); const back = await decryptJson(env, 'correct horse battery'); return isEncrypted(env) && env.gzip && env.data.length < 5000 && !JSON.stringify(env).includes('Jane') && JSON.stringify(back) === JSON.stringify(value); } },
    { id: 'biz.crypto.wrongKey', title: 'A wrong passphrase or a tampered envelope is refused, never half-decrypted', test: async () => { const env = await encryptJson({ a: 1 }, 'passphrase-one', { iterations: 2000 }); let wrong = null; try { await decryptJson(env, 'passphrase-two'); } catch (e) { wrong = e.message; } const tampered = { ...env, data: env.data.slice(0, -4) + 'AAAA' }; let bad = null; try { await decryptJson(tampered, 'passphrase-one'); } catch (e) { bad = e.message; } let short = null; try { await encryptJson({}, 'abc'); } catch (e) { short = e.message; } return /Wrong passphrase/.test(wrong) && /Wrong passphrase/.test(bad) && /at least 8/.test(short) && !isEncrypted({ data: 'x' }); } },
    { id: 'biz.crypto.passphrase', title: 'Generated passphrases are five words and a number', test: () => /^[a-z]+-[a-z]+-[a-z]+-[a-z]+-[a-z]+-\d{3}$/.test(randomPassphrase()) && randomPassphrase(() => 0) === 'amber-amber-amber-amber-amber-100' }
];

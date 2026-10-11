/** Serial number register: validation, duplicate detection and counts against the design (STC evidence). */

export const SERIAL_PATTERN = /^[A-Z0-9][A-Z0-9\-_./]{4,39}$/i;

export function normaliseSerial(raw) { return String(raw || '').trim().toUpperCase().replace(/\s+/g, ''); }

export function validateSerial(raw) {
    const serial = normaliseSerial(raw);
    if (!serial) return { ok: false, serial, reason: 'empty' };
    if (serial.length < 5) return { ok: false, serial, reason: 'too short' };
    if (!SERIAL_PATTERN.test(serial)) return { ok: false, serial, reason: 'invalid characters' };
    return { ok: true, serial };
}

/** Parse pasted/scanned text (one serial per line or comma separated). */
export function parseSerialList(text) {
    const parts = String(text || '').split(/[\n,;\t]+/).map(normaliseSerial).filter(Boolean);
    const seen = new Set(); const valid = []; const invalid = []; const duplicates = [];
    for (const p of parts) {
        const v = validateSerial(p);
        if (!v.ok) { invalid.push({ serial: p, reason: v.reason }); continue; }
        if (seen.has(v.serial)) { duplicates.push(v.serial); continue; }
        seen.add(v.serial); valid.push(v.serial);
    }
    return { valid, invalid, duplicates };
}

export function registerStatus(register = {}, design = {}) {
    const required = { module: Number(design.moduleCount) || 0, inverter: design.inverterId ? 1 : (Number(design.inverterCount) || 0), battery: design.batteryId || design.batteryUsableKwh ? 1 : 0 };
    const counts = { module: (register.module || []).length, inverter: (register.inverter || []).length, battery: (register.battery || []).length };
    const all = [...(register.module || []), ...(register.inverter || []), ...(register.battery || [])];
    const dupes = all.filter((s, i) => all.indexOf(s) !== i);
    const issues = [];
    for (const k of Object.keys(required)) {
        if (required[k] && counts[k] < required[k]) issues.push(`${required[k] - counts[k]} ${k} serial${required[k] - counts[k] === 1 ? '' : 's'} missing (${counts[k]}/${required[k]})`);
        if (required[k] && counts[k] > required[k]) issues.push(`${counts[k] - required[k]} extra ${k} serial${counts[k] - required[k] === 1 ? '' : 's'} recorded`);
    }
    if (dupes.length) issues.push(`Duplicate serials: ${[...new Set(dupes)].join(', ')}`);
    return { required, counts, issues, complete: issues.length === 0 && all.length > 0 };
}

export function serialsCsv(register = {}) {
    const rows = ['category,serial'];
    for (const [cat, list] of Object.entries(register)) for (const s of list || []) rows.push(`${cat},${s}`);
    return rows.join('\n');
}

export const FEATURES = [
    { id: 'serials.validate', title: 'Serial format validation', test: () => validateSerial(' ab-12345 ').ok && validateSerial('abc').reason === 'too short' && validateSerial('ab 12#').ok === false },
    { id: 'serials.parse', title: 'Parse pasted lists with duplicates and invalids', test: () => { const r = parseSerialList('SN0001\nSN0002, sn0001\nxx\n'); return r.valid.length === 2 && r.duplicates.length === 1 && r.invalid.length === 1; } },
    { id: 'serials.status', title: 'Register status against the design', test: () => { const s = registerStatus({ module: ['A1234', 'B1234'], inverter: [] }, { moduleCount: 3, inverterId: 'I' }); return s.issues.length === 2 && !s.complete && registerStatus({ module: ['A1234'], inverter: ['I1234'] }, { moduleCount: 1, inverterId: 'I' }).complete; } },
    { id: 'serials.duplicatesAcross', title: 'Duplicates across categories are flagged', test: () => registerStatus({ module: ['X1234'], inverter: ['X1234'] }, { moduleCount: 1, inverterId: 'I' }).issues.some((i) => /Duplicate/.test(i)) },
    { id: 'serials.csv', title: 'Serial CSV export', test: () => serialsCsv({ module: ['A1'], battery: ['B1'] }).split('\n').length === 3 }
];

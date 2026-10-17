/**
 * Google Drive import: the "Handover Documents" folder holds one folder per
 * customer. Each becomes a handover pack; its files are checked against the
 * documents a compliant Australian solar/battery handover needs, and packs
 * are matched to installed sites by customer name.
 */
import { clean } from './schema.js';

export const REQUIRED_PACK_DOCS = [
    { id: 'ccew', label: 'Certificate of Compliance Electrical Work (CCEW)', re: /ccew|certificate of compliance|compliance cert/i },
    { id: 'commissioning', label: 'Commissioning / test results sheet', re: /commission|test (?:sheet|result)|inspection/i },
    { id: 'stc', label: 'STC assignment form', re: /stc|assignment form|small[- ]scale/i },
    { id: 'warranty', label: 'Warranty documents', re: /warrant/i },
    { id: 'manual', label: 'System manual / user guide', re: /manual|user guide|operating/i },
    { id: 'photos', label: 'Installation photos', re: /photo|img_|\.jpe?g$|\.heic$|\.png$/i },
    { id: 'sld', label: 'Single line / wiring diagram', re: /single line|sld|wiring|schematic|diagram/i },
    { id: 'dnsp', label: 'Network connection approval', re: /dnsp|network|connection approval|permission to connect/i },
    { id: 'invoice', label: 'Invoice / receipt', re: /invoice|receipt|inv-/i },
    { id: 'safety', label: 'Shutdown procedure / safety labels sheet', re: /shutdown|safety|label/i }
];

export function normaliseName(name) { return clean(name).toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim(); }

export function packChecklist(files = []) {
    const names = files.map((f) => f.title || f.name || '');
    const present = REQUIRED_PACK_DOCS.map((d) => ({ ...d, present: names.some((n) => d.re.test(n)), matches: names.filter((n) => d.re.test(n)).length }));
    const missing = present.filter((p) => !p.present).map((p) => p.label);
    return { items: present, missing, score: Math.round((present.filter((p) => p.present).length / present.length) * 100), fileCount: files.length, unknownFiles: files.length === 0 };
}

export function importDrive({ root = null, folders = [], files = {} } = {}, { sites = [] } = {}) {
    const packs = folders.filter((f) => /folder/.test(f.mimeType || 'folder')).map((f) => {
        const list = files[f.id] || null; const check = list ? packChecklist(list) : { items: [], missing: [], score: null, fileCount: null, unknownFiles: true };
        const site = matchSite(f.title, sites);
        return { id: f.id, customer: clean(f.title), key: normaliseName(f.title), created: f.createdTime || null, modified: f.modifiedTime || null, url: f.viewUrl || `https://drive.google.com/drive/folders/${f.id}`, owner: f.owner || null, siteId: site ? site.id : null, ...check, source: 'drive' };
    });
    const byKey = new Map(); for (const p of packs) { const k = p.key; if (byKey.has(k)) byKey.get(k).duplicate = true; byKey.set(k, p); }
    const covered = new Set(packs.map((p) => p.siteId).filter(Boolean));
    const installed = sites.filter((s) => s.installed);
    const uncovered = installed.filter((s) => !covered.has(s.id));
    const scored = packs.filter((p) => p.score != null);
    return { root, packs, stats: { packs: packs.length, matched: covered.size, installedSites: installed.length, uncovered: uncovered.length, uncoveredSites: uncovered.map((s) => s.id), duplicates: packs.filter((p) => p.duplicate).length, incomplete: scored.filter((p) => p.score < 100).length, avgScore: scored.length ? Math.round(scored.reduce((s, p) => s + p.score, 0) / scored.length) : null } };
}

export function matchSite(name, sites = []) {
    const key = normaliseName(name); if (!key) return null;
    const parts = key.split(' ').filter((w) => w.length > 2);
    let best = null, bestScore = 0;
    for (const s of sites) { const c = normaliseName(s.customer || ''); if (!c) continue; if (c === key) return s; const cparts = c.split(' '); const hit = parts.filter((p) => cparts.includes(p)).length; const score = hit / Math.max(parts.length, cparts.length); if (score > bestScore && hit >= Math.min(2, parts.length)) { best = s; bestScore = score; } }
    return bestScore >= 0.5 ? best : null;
}

const F = (id, title, extra = {}) => ({ id, title, mimeType: 'application/vnd.google-apps.folder', createdTime: '2026-09-01T00:00:00Z', ...extra });
export const FEATURES = [
    { id: 'biz.drive.checklist', title: 'A handover pack is scored against the ten documents a compliant handover needs', test: () => { const c = packChecklist([{ title: 'CCEW 12345.pdf' }, { title: 'Commissioning sheet.pdf' }, { title: 'IMG_0001.jpg' }, { title: 'Warranty Inverter.pdf' }]); return c.score === 40 && c.missing.includes('STC assignment form') && c.items.find((i) => i.id === 'photos').present; } },
    { id: 'biz.drive.match', title: 'Packs match installed sites by customer name, tolerant of brackets and order', test: () => { const sites = [{ id: 's1', customer: 'Alex Fictional', installed: true }, { id: 's2', customer: 'Jane Example', installed: true }]; return matchSite('Alex Fictional (Northside)', sites)?.id === 's1' && matchSite('Example Jane', sites)?.id === 's2' && matchSite('Nobody Here', sites) === null; } },
    { id: 'biz.drive.coverage', title: 'Coverage: installed sites without a pack, duplicate and incomplete packs', test: () => { const sites = [{ id: 's1', customer: 'Alex Fictional', installed: true }, { id: 's2', customer: 'Jane Example', installed: true }, { id: 's3', customer: 'Not Installed', installed: false }]; const r = importDrive({ folders: [F('a', 'Alex Fictional (Northside)'), F('b', 'Alex Fictional (Southside)'), F('c', 'Someone Else')], files: { a: [{ title: 'CCEW.pdf' }] } }, { sites }); return r.stats.packs === 3 && r.stats.uncovered === 1 && r.stats.uncoveredSites[0] === 's2' && r.stats.duplicates === 1 && r.stats.incomplete === 1 && r.packs[2].siteId === null; } }
];

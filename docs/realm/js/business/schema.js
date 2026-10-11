/**
 * Business model schema and parsers.
 *
 * The real business lives in ServiceM8 (jobs, staff, schedule), Xero
 * (invoices, bills, P&L, bank), Google Workspace (mail, handover packs,
 * calendar) and the bank feed. Every connector is normalised into the one
 * model described by emptyModel(); the parsers here turn the free-text
 * conventions used in those systems (job descriptions with "Customer Name:"
 * lines, invoice references like "SM8-1234- 5 Sun St Suburb NSW 2000") into
 * structured fields. Pure functions, no DOM, so they run in Node and the
 * browser alike.
 */

export const MODEL_VERSION = 1;

export function emptyModel() {
    return {
        version: MODEL_VERSION, generatedAt: null, company: { name: '', domains: [], timezone: 'Australia/Sydney' },
        sources: {}, // connector -> { syncedAt, count, note }
        customers: [], sites: [], jobs: [], staff: [], invoices: [], bills: [], unreconciled: [], bank: { accounts: [], transactions: [] },
        finance: { pnl: null, position: null, cash: null, ar: null, ap: null, topCustomers: [] },
        threads: [], documents: [], events: [], market: null
    };
}

/* ---------- text helpers ---------- */
const STREET_ABBR = { street: 'st', road: 'rd', avenue: 'ave', av: 'ave', place: 'pl', drive: 'dr', crescent: 'cres', cr: 'cres', court: 'ct', parade: 'pde', circuit: 'cct', boulevard: 'blvd', bvd: 'blvd', close: 'cl', lane: 'ln', terrace: 'tce', highway: 'hwy', grove: 'gr', esplanade: 'esp', square: 'sq', parkway: 'pkwy' };
const STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'];

export function clean(text) { return String(text ?? '').replace(/\s+/g, ' ').trim(); }

/** Parse an Australian street address into parts; tolerant of missing state/postcode. */
const STREET_TYPES = /^(st|street|rd|road|ave|av|avenue|pl|place|dr|drive|cres|cr|crescent|ct|court|pde|parade|cct|circuit|blvd|bvd|boulevard|cl|close|ln|lane|tce|terrace|hwy|highway|gr|grove|esp|esplanade|sq|square|pkwy|parkway|way|rise|walk|loop|row|mews|circle|cir|crt|bvde|promenade|track|trail)\.?$/i;
export function parseAddress(text) {
    const raw = clean(text).replace(/,?\s*Australia$/i, '').replace(/\s*\([^)]*\)\s*$/, '');
    if (!raw) return { raw: '', line1: '', suburb: '', state: '', postcode: '', key: '' };
    let rest = raw, state = '', postcode = '';
    const tail = rest.match(/[,\s]+(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)\b[,\s]*(\d{4})?\s*$/i);
    if (tail) { state = tail[1].toUpperCase(); postcode = tail[2] || ''; rest = rest.slice(0, tail.index); }
    else { const pc = rest.match(/[,\s]+(\d{4})\s*$/); if (pc) { postcode = pc[1]; rest = rest.slice(0, pc.index); } }
    rest = rest.replace(/[,\s]+$/, '');
    let line1 = rest, suburb = '';
    if (rest.includes(',')) { const parts = rest.split(',').map(clean).filter(Boolean); suburb = parts.length > 1 ? parts.pop() : ''; line1 = parts.join(', '); }
    else { const words = rest.split(' '); let idx = -1; for (let i = words.length - 1; i >= 1; i--) if (STREET_TYPES.test(words[i])) { idx = i; break; } if (idx >= 0 && idx < words.length - 1) { if (/^(n|s|e|w|north|south|east|west)$/i.test(words[idx + 1]) && idx + 1 < words.length - 1) idx++; line1 = words.slice(0, idx + 1).join(' '); suburb = words.slice(idx + 1).join(' '); } }
    return { raw, line1: clean(line1), suburb: titleCase(suburb), state, postcode, key: addressKey(line1, suburb) };
}

export function titleCase(s) { return clean(s).toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()); }

/** Stable key for matching the same site across systems. */
export function addressKey(line1, suburb = '') {
    const norm = clean(`${line1} ${suburb}`).toLowerCase().replace(/[^a-z0-9/ ]/g, ' ').replace(/\b(unit|u|lot|apt)\s+(\d+[a-z]?)\s*\/?\s*/g, '$2/').split(' ').filter(Boolean).map((w) => STREET_ABBR[w] || w);
    return norm.join(' ');
}

export function daysBetween(a, b = new Date()) { const da = new Date(a); const db = new Date(b); if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null; return Math.round((db - da) / 86400000); }
export function isoDay(d) { const x = new Date(d); return Number.isNaN(x.getTime()) ? null : x.toISOString().slice(0, 10); }
export function businessDaysBetween(a, b = new Date()) { let d = new Date(a); const end = new Date(b); if (Number.isNaN(d.getTime()) || Number.isNaN(end.getTime()) || d > end) return 0; let n = 0; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); while (d <= end) { const wd = d.getDay(); if (wd !== 0 && wd !== 6) n++; d.setDate(d.getDate() + 1); } return n; }
export function money(n) { return Math.round(Number(n || 0) * 100) / 100; }
export function emailDomain(addr) { const m = String(addr || '').toLowerCase().match(/@([a-z0-9.-]+)/); return m ? m[1] : ''; }
export function emailAddress(s) { const m = String(s || '').toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+/); return m ? m[0] : ''; }

/* ---------- ServiceM8 job descriptions ---------- */
const DESC_FIELDS = [
    ['customer', /^(?:customer(?:'s)?\s*name|client(?:'s)?\s*name|owner'?s?\s*name|name|customer|client)\s*:\s*(.+)$/i],
    ['address', /^address\s*:\s*(.+)$/i], ['phone', /^(?:contact\s*(?:number|no\.?)|phone|mobile)\s*:\s*(.+)$/i], ['email', /^email(?:\s*address)?\s*:\s*(.+)$/i],
    ['installedDate', /^installed\s*date\s*:\s*(.+)$/i], ['salesman', /^sales(?:man|person)\s*:\s*(.+)$/i], ['coupling', /^ac\s*or\s*dc\s*coupling\s*:\s*(.+)$/i],
    ['nmi', /^nmi\s*:\s*(.+)$/i], ['phase', /^phase(?:s)?\s*:\s*(.+)$/i], ['roof', /^roof\s*type\s*:\s*(.+)$/i], ['backup', /^circuit\s*back\s*ups?\s*:\s*(.+)$/i], ['notes', /^notes?\s*:\s*(.+)$/i],
    ['configuration', /^system\s*configuration\s*:\s*(.+)$/i], ['inverter', /^inverter\s*:\s*(.+)$/i], ['battery', /^battery(?:\s*storage)?\s*:\s*(.+)$/i], ['panels', /^solar\s*panels?\s*:\s*(.+)$/i], ['other', /^other\s*components?\s*:\s*(.+)$/i], ['team', /^team\s*(?:on\s*site|onsite)\s*:\s*(.+)$/i],
    ['project', /^project\s*#?\s*:\s*(.+)$/i], ['openSolar', /^opensolar\s*project\s*id\s*:\s*(.+)$/i], ['postcode', /^post\s*code\s*:\s*(.+)$/i], ['order', /^order\s*#?\s*:\s*(.+)$/i]
];

export function parseJobDescription(desc) {
    const out = { marker: null, lines: [] };
    for (const rawLine of String(desc || '').split(/\r?\n/)) {
        const line = clean(rawLine); if (!line) continue;
        out.lines.push(line);
        if (/^\*+/.test(line) && !out.marker) { out.marker = line.replace(/^\*+\s*/, '').trim(); continue; }
        for (const [key, re] of DESC_FIELDS) { const m = line.match(re); if (m && out[key] === undefined) { out[key] = clean(m[1]); break; } }
    }
    if (out.team) out.team = out.team.split(/[,&/]|\band\b/).map(clean).filter(Boolean);
    if (out.phase) out.phase = Number(String(out.phase).match(/\d/)?.[0]) || out.phase;
    if (out.customer && /^\d+$/.test(out.customer)) delete out.customer; // a bare number is an order id, not a name
    return out;
}

/** What kind of ServiceM8 job is this? Internal tasks do not become sites. */
export function jobKind({ title = '', description = '', address = '' } = {}) {
    const d = `${title}\n${description}`.toLowerCase(); const first = clean(description.split(/\r?\n/)[0] || '').toLowerCase();
    if (/\(test\)|test test|^test$|form test/.test(d)) return 'test';
    if (/^sales work/.test(first)) return 'sales';
    if (/load up materials|trade counter pick ?up|pick ?up from|deliver \d|pick ?up tyres|pickup details/.test(first)) return 'logistics';
    if (/meeting|call old parks|follow up with/.test(first)) return 'admin';
    if (/site (visit|inspection)|^\*?site visit/.test(first)) return 'site-visit';
    if (/fit off|fit-off|sign off|final visit|earth rod|connector replacement|ct issues|fixing job|special hook rail/.test(first)) return 'service';
    if (/battery only|battery fit off/.test(first)) return 'battery';
    if (/ev and sub main|ev charger/.test(first)) return 'ev';
    if (/customer profile/.test(first) && !/inverter|panels/.test(d)) return 'profile';
    if (!clean(address)) return 'untitled';
    return 'install';
}

export function partnerOf(title) {
    const t = String(title || '').toLowerCase();
    if (!t || /project solar/.test(t)) return 'retail';
    if (/defended/.test(t)) return 'Defended Energy';
    if (/energy bite/.test(t)) return 'Energy Bite';
    if (/autra/.test(t)) return 'Autra Batteries';
    if (/solahart/.test(t)) return 'Solahart';
    return titleCase(t.replace(/\s*(pty\.?\s*ltd\.?|p\/l)\s*$/i, ''));
}

/* ---------- system specs ---------- */
export function systemFromText({ inverter = '', battery = '', panels = '', configuration = '' } = {}) {
    const sys = { inverterKw: null, inverterModel: clean(inverter) || null, batteryKwh: null, batteryModel: clean(battery) || null, panelCount: null, panelW: null, pvKw: null, hybrid: /hybrid|battery/i.test(`${configuration} ${battery}`) };
    const inv = clean(inverter).match(/(\d+(?:\.\d+)?)\s*k(?:w|-?eta|tl|h)?\b/i) || clean(inverter).match(/GW(\d+(?:\.\d+)?)K/i) || clean(inverter).match(/H3-(\d+(?:\.\d+)?)/i) || clean(inverter).match(/(\d+(?:\.\d+)?)\s*kW/i);
    if (inv) sys.inverterKw = Number(inv[1]);
    const p = clean(panels).match(/(\d+)\s*x\s*.*?(\d{3})\s*w/i) || clean(panels).match(/(\d+)\s*x\s*[^\d]*(\d{3})/i);
    if (p) { sys.panelCount = Number(p[1]); sys.panelW = Number(p[2]); sys.pvKw = Math.round(sys.panelCount * sys.panelW / 10) / 100; }
    const b = clean(battery);
    if (b && !/^none$/i.test(b)) {
        const per = b.match(/(\d+(?:\.\d+)?)\s*-?\s*(?:kwh|bat)/i); const stacks = b.match(/(\d+)\s*stacks?/i) || b.match(/x\s*(\d+)\s*$/);
        const kwhEach = per ? Number(per[1]) : null; const n = stacks ? Number(stacks[1]) : 1;
        if (kwhEach) sys.batteryKwh = Math.round(kwhEach * n * 10) / 10;
    }
    return sys;
}

/* ---------- Xero references ---------- */
export function parseInvoiceReference(ref) {
    const r = clean(ref); if (!r) return { jobNumber: null, address: null };
    const m = r.match(/SM8\s*-\s*(\d+)\s*-?\s*(.*)$/i);
    if (m) return { jobNumber: m[1], address: clean(m[2]) || null };
    return { jobNumber: null, address: /\d/.test(r) ? r : null };
}

/* ---------- email classification ---------- */
export const EMAIL_RULES = [
    ['legal', /\b(we act for|solicitor|lawyer|legal notice|fair trading|ncat|tribunal|letter of demand)\b/i, null],
    ['complaint', /\b(complaint|not working|fault|stopped working|unhappy|disappointed|urgent|damage|leak|tripping)\b/i, null],
    ['lead', /\b(quote request|request for quote|rfq|interested in|looking for solar|get a quote|enquiry|inquiry|tender)\b/i, null],
    ['quote', /\b(proposal|quotation|quote #?\d|before signing|revised proposal|opensolar)\b/i, null],
    ['supplier', null, /osw\.energy|tradezone|solahart|netcc|rs solar|supplier|wholesale|trina|goodwe|fox|sigenergy|sungrow/i],
    ['dnsp', null, /ausgrid|endeavourenergy|essentialenergy|evoenergy|energex|sapower|powercor|jemena|ausnet|citipower/i],
    ['finance', null, /plenti|greendeal|brighte|humm|stripe|xero|nab\.com|anz\.com|commbank|westpac|zeller|budgetdirect|asic/i],
    ['finance', /\b(finance approval|loan|rebate|green deal|invoice (?:due|overdue)|remittance|payment received)\b/i, null],
    ['monitoring', null, /isolarcloud|goodwe|sems|fox-?ess|enphase|solaredge|fronius|sungrow|sigen/i],
    ['handover', /\b(handover|hand over|warranty|certificate|ccew|coc|compliance)\b/i, null],
    ['scheduling', /\b(install date|booking|reschedule|schedule|appointment|confirm(?:ed)? (?:the )?date)\b/i, null],
    ['marketing', null, /mailchimp|hubspot|notice\.|newsletter|marketing|indicreative|@email\.|bulldogs|origin\.com\.au|updates\.nab/i],
    ['notification', null, /noreply|no-reply|notifications?@|pandadoc|transvirtual|ailo|waster|microsoftonline|docs@|calendar-notification/i]
];
export function classifyEmail({ sender = '', subject = '', snippet = '', to = [] } = {}) {
    const text = `${subject} ${snippet}`;
    for (const [cat, textRe, senderRe] of EMAIL_RULES) {
        if (textRe && textRe.test(text)) return cat;
        if (senderRe && senderRe.test(sender)) return cat;
    }
    return /@(gmail|hotmail|outlook|yahoo|icloud|bigpond|live|optusnet)\./i.test(sender) ? 'customer' : 'other';
}

export function extractJobNumber(text) { const m = String(text || '').match(/\bSM8\s*-?\s*(\d{3,4})\b/i) || String(text || '').match(/\bjob\s*#?\s*(\d{3,4})\b/i); return m ? m[1] : null; }
export function extractAddress(text) {
    const m = String(text || '').match(/\b(\d+[a-zA-Z]?(?:\/\d+)?\s+[A-Z][A-Za-z']+(?:\s[A-Z][A-Za-z']+)?\s(?:St|Street|Rd|Road|Ave|Avenue|Pl|Place|Dr|Drive|Cres|Crescent|Ct|Court|Pde|Parade|Cct|Circuit|Blvd|Cl|Close|Way|Ln|Lane|Tce|Gr|Grove)\b(?:\s(?:N|S|E|W|North|South|East|West)\b)?(?:,?\s+[A-Z][a-z]+(?:\s[A-Z][a-z]+){0,2})?(?:,?\s+(?:NSW|VIC|QLD|SA|WA|TAS|ACT|NT)\b(?:\s+\d{4})?)?)/);
    return m ? clean(m[1]) : null;
}

export const FEATURES = [
    { id: 'biz.schema.address', title: 'Australian addresses parse into street, suburb, state and postcode with a stable match key', test: () => { const a = parseAddress('13 Example Ave\nWollstonecraft NSW 2065'); const b = parseAddress('13 Example Avenue, Wollstonecraft, NSW 2065, Australia'); const c = parseAddress('Unit 9 19 Sample rd chipping Norton NSW 2170'); return a.suburb === 'Wollstonecraft' && a.postcode === '2065' && a.state === 'NSW' && a.key === b.key && c.key === '9/19 sample rd chipping norton' && parseAddress('').key === ''; } },
    { id: 'biz.schema.description', title: 'ServiceM8 job descriptions yield customer, contact, NMI, system and team fields', test: () => { const d = parseJobDescription('***battery only\n\nCustomer Name: Test Person\nAddress: 2 Example Ave Suburb, NSW 2000 (2 storey)\nContact Number: 0400000000\nEmail Address: test@example.com\nNMI: 4101234567\nPhase: 3\nSystem Configuration: Solar & Battery\nInverter: GoodWe GW15K-ETA-G20 x 1\nBattery Storage: GoodWe GW8.3-BAT-D-G21 5 Stack x 1\nSolar Panels: 30 x TSM-475NEG9RH.28 Trina Vertex S+ 475 W\nTeam onsite: Harrison, Oskar'); return d.marker === 'battery only' && d.customer === 'Test Person' && d.nmi === '4101234567' && d.phase === 3 && d.team.length === 2 && d.email === 'test@example.com'; } },
    { id: 'biz.schema.system', title: 'System sizes derive from inverter, battery and panel strings', test: () => { const s = systemFromText({ inverter: 'GoodWe GW15K-ETA-G20 x 1', battery: 'GoodWe GW8.3-BAT-D-G21 5 Stack x 1', panels: '30 x TSM-475NEG9RH.28 Trina Vertex S+ 475 W', configuration: 'Solar & Battery' }); const n = systemFromText({ battery: 'None' }); return s.inverterKw === 15 && s.batteryKwh === 41.5 && s.panelCount === 30 && s.pvKw === 14.25 && s.hybrid && n.batteryKwh === null; } },
    { id: 'biz.schema.kind', title: 'Internal tasks, site visits, sales and test jobs are told apart from real installs', test: () => jobKind({ description: 'Sales Work' }) === 'sales' && jobKind({ description: '• Load up materials for the week' }) === 'logistics' && jobKind({ description: '***site visit' }) === 'site-visit' && jobKind({ title: 'PROJECT SOLAR (test)', description: 'Inverter: Test test test', address: '1 A St' }) === 'test' && jobKind({ description: 'Customer Name: A', address: '1 A St Suburb NSW 2000' }) === 'install' && jobKind({ description: '***fit off', address: '1 A St' }) === 'service' },
    { id: 'biz.schema.partner', title: 'Job titles map to the channel partner or retail', test: () => partnerOf('Defended Energy Electrical Pty Ltd') === 'Defended Energy' && partnerOf('Project Solar Group Pty Ltd') === 'retail' && partnerOf('') === 'retail' && partnerOf('Energy Bite Pty Ltd') === 'Energy Bite' && partnerOf('Acme Pty Ltd') === 'Acme' },
    { id: 'biz.schema.invoiceRef', title: 'Xero invoice references link back to the ServiceM8 job and site', test: () => { const r = parseInvoiceReference('SM8- 1315- 2 Example Ave Greenwich, NSW 2065'); const p = parseInvoiceReference('67 Demo Ave Erina'); return r.jobNumber === '1315' && r.address === '2 Example Ave Greenwich, NSW 2065' && p.jobNumber === null && p.address === '67 Demo Ave Erina' && parseInvoiceReference('').address === null; } },
    { id: 'biz.schema.email', title: 'Emails classify into legal, complaint, lead, quote, supplier, DNSP, finance, monitoring and noise', test: () => classifyEmail({ sender: 'admin@law.example', subject: 'Solar system', snippet: 'We act for the owner' }) === 'legal' && classifyEmail({ sender: 'noreply@builder.example', subject: 'Quote Request - Solar/PV System' }) === 'lead' && classifyEmail({ sender: 'invoices.au@osw.energy', subject: 'Invoice' }) === 'supplier' && classifyEmail({ sender: 'CustomerNetworkSupport@endeavourenergy.com.au', subject: 'Application' }) === 'dnsp' && classifyEmail({ sender: 'message@isolarcloud.au', subject: 'Alarm' }) === 'monitoring' && classifyEmail({ sender: 'someone@gmail.com', subject: 'Hello' }) === 'customer' && classifyEmail({ sender: 'remind@notice.alibaba.com', subject: 'Deals' }) === 'marketing' },
    { id: 'biz.schema.extract', title: 'Job numbers and street addresses can be lifted out of free text', test: () => extractJobNumber('Re: SM8-1253 invoice') === '1253' && extractAddress('Thanks for the proposal for the system at 151 Sample Rd, Moorebank (Quote #1)') === '151 Sample Rd, Moorebank' && extractJobNumber('nothing') === null },
    { id: 'biz.schema.dates', title: 'Day and business-day arithmetic', test: () => daysBetween('2026-10-01', '2026-10-11') === 10 && businessDaysBetween('2026-10-09', '2026-10-13') === 2 && isoDay('2026-10-11T13:00:00Z') === '2026-10-11' && daysBetween('bad') === null }
];

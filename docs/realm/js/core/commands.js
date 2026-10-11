/**
 * Command palette and slash console. Commands are registered by every
 * window and by the app; the palette fuzzy-searches them, the console
 * parses `/command args`.
 */
export function fuzzyScore(query, text) {
    const q = String(query).toLowerCase().trim();
    const t = String(text).toLowerCase();
    if (!q) return 1;
    if (t === q) return 100;
    if (t.startsWith(q)) return 80;
    if (t.includes(q)) return 60;
    // subsequence match
    let ti = 0; let matched = 0;
    for (const ch of q) { const idx = t.indexOf(ch, ti); if (idx === -1) return 0; matched += idx === ti ? 2 : 1; ti = idx + 1; }
    return Math.min(50, 10 + matched);
}

export function parseSlash(input) {
    const text = String(input || '').trim();
    if (!text.startsWith('/')) return null;
    const [name, ...rest] = text.slice(1).split(/\s+/);
    const args = []; const flags = {};
    for (const token of rest) {
        const m = token.match(/^--?([\w-]+)(?:=(.*))?$/);
        if (m) flags[m[1]] = m[2] === undefined ? true : coerce(m[2]); else args.push(coerce(token));
    }
    return { name: name.toLowerCase(), args, flags, raw: text };
}
function coerce(v) { if (v === 'true') return true; if (v === 'false') return false; const n = Number(v); return v !== '' && Number.isFinite(n) ? n : v; }

export class CommandRegistry {
    constructor({ bus = null } = {}) { this.commands = new Map(); this.bus = bus; this.recent = []; }

    register(cmd) {
        if (!cmd.id || typeof cmd.run !== 'function') throw new Error('command needs id and run');
        this.commands.set(cmd.id, { title: cmd.id, keywords: [], category: 'General', aliases: [], ...cmd });
        return () => this.commands.delete(cmd.id);
    }
    registerAll(list) { for (const c of list) this.register(c); return list.length; }
    get(id) { return this.commands.get(id) || [...this.commands.values()].find((c) => c.aliases.includes(id)) || null; }
    list() { return [...this.commands.values()]; }

    search(query, limit = 12) {
        const scored = [];
        for (const cmd of this.commands.values()) {
            const score = Math.max(fuzzyScore(query, cmd.title), fuzzyScore(query, cmd.id) * 0.9, ...cmd.keywords.map((k) => fuzzyScore(query, k) * 0.8));
            if (score > 0) scored.push({ cmd, score: score + (this.recent.includes(cmd.id) ? 5 : 0) });
        }
        return scored.sort((a, b) => b.score - a.score || a.cmd.title.localeCompare(b.cmd.title)).slice(0, limit).map((s) => s.cmd);
    }

    async run(id, args = [], flags = {}) {
        const cmd = this.get(id);
        if (!cmd) return { ok: false, message: `Unknown command: ${id}` };
        try {
            const result = await cmd.run({ args, flags });
            this.recent = [id, ...this.recent.filter((r) => r !== id)].slice(0, 10);
            if (this.bus) this.bus.emit('command', { id, args, flags });
            return { ok: true, message: typeof result === 'string' ? result : (result && result.message) || `${cmd.title} done`, result };
        } catch (error) { return { ok: false, message: error.message || String(error) }; }
    }

    /** Execute a console line: `/open crew` or plain text (returns null). */
    async exec(line) {
        const parsed = parseSlash(line);
        if (!parsed) return null;
        if (parsed.name === 'help') return { ok: true, message: this.list().filter((c) => c.console !== false).map((c) => `/${c.id}${c.usage ? ` ${c.usage}` : ''} – ${c.title}`).sort().join('\n') };
        return this.run(parsed.name, parsed.args, parsed.flags);
    }
}

export const FEATURES = [
    { id: 'core.cmd.fuzzy', title: 'Fuzzy scoring (exact > prefix > contains > subsequence)', test: () => fuzzyScore('crew', 'crew') > fuzzyScore('cre', 'crew') && fuzzyScore('cre', 'crew') > fuzzyScore('rew', 'crew') && fuzzyScore('cw', 'crew') > 0 && fuzzyScore('xyz', 'crew') === 0 },
    { id: 'core.cmd.parse', title: 'Slash command parsing with args and flags', test: () => { const p = parseSlash('/job new "Ann" 6.6 --postcode=2000 --rush'); return p.name === 'job' && p.args[2] === 6.6 && p.flags.postcode === 2000 && p.flags.rush === true && parseSlash('hello') === null; } },
    { id: 'core.cmd.registerRun', title: 'Register and run commands', test: async () => { const r = new CommandRegistry(); r.register({ id: 'ping', title: 'Ping', run: ({ args }) => `pong ${args[0]}` }); const out = await r.run('ping', [1]); const bad = await r.run('nope'); return out.ok && out.message === 'pong 1' && !bad.ok; } },
    { id: 'core.cmd.search', title: 'Palette search ranks recent commands higher', test: async () => { const r = new CommandRegistry(); r.registerAll([{ id: 'open-crew', title: 'Open crew', keywords: ['party'], run: () => {} }, { id: 'open-codex', title: 'Open codex', run: () => {} }]); const byKeyword = r.search('party')[0].id === 'open-crew'; await r.run('open-codex'); return byKeyword && r.search('open')[0].id === 'open-codex'; } },
    { id: 'core.cmd.exec', title: 'Console executes slash lines and lists help', test: async () => { const r = new CommandRegistry(); r.register({ id: 'time', title: 'Set speed', usage: '<speed>', run: ({ args }) => `speed ${args[0]}` }); const a = await r.exec('/time fast'); const help = await r.exec('/help'); return a.message === 'speed fast' && help.message.includes('/time <speed>') && (await r.exec('plain')) === null; } },
    { id: 'core.cmd.aliases', title: 'Command aliases', test: async () => { const r = new CommandRegistry(); r.register({ id: 'inventory', title: 'Inv', aliases: ['bag', 'vault'], run: () => 'ok' }); return (await r.run('bag')).ok; } },
    { id: 'core.cmd.errors', title: 'Command errors are reported, not thrown', test: async () => { const r = new CommandRegistry(); r.register({ id: 'boom', title: 'Boom', run: () => { throw new Error('kaboom'); } }); const out = await r.run('boom'); return !out.ok && out.message === 'kaboom'; } }
];

/**
 * Memory stream (Park et al. 2023): time-stamped observations with an
 * importance score, retrieval by recency × importance × relevance, and
 * rule-based reflection that synthesises higher-level insights.
 */

const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'and', 'on', 'in', 'for', 'at', 'is', 'was', 'with', 'by', 'from', 'that', 'this', 'it']);

export function tokenize(text) {
    return String(text || '').toLowerCase().replace(/[^a-z0-9/.: -]/g, ' ').split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t));
}

/** Importance heuristic 1–10 from keywords (no LLM needed). */
export function scoreImportance(text, kind = 'observation') {
    const t = String(text).toLowerCase();
    let score = 3;
    if (kind === 'reflection') score = 7;
    if (kind === 'plan') score = 5;
    if (/\b(fail|defect|non-compliant|unsafe|fire|shock|rectif)/.test(t)) score += 4;
    if (/\b(pass|compliant|approved|complete|commission)/.test(t)) score += 2;
    if (/\b(customer|owner|inspector|dnsp)/.test(t)) score += 1;
    if (/\b(learned|realised|pattern|always|never)/.test(t)) score += 2;
    return Math.max(1, Math.min(10, score));
}

export class MemoryStream {
    constructor({ capacity = 500, reflectionThreshold = 40, now = () => Date.now() } = {}) {
        this.capacity = capacity;
        this.reflectionThreshold = reflectionThreshold;
        this.now = now;
        this.records = [];
        this.importanceSinceReflection = 0;
        this.lastReflectionAt = -Infinity;
        this.reflectionCooldownMs = 6 * 3600000;
        this.counter = 0;
    }

    add(text, { kind = 'observation', importance, tags = [], at, source = null } = {}) {
        const record = {
            id: `m${++this.counter}`,
            text: String(text).slice(0, 500),
            kind,
            tags: Array.from(new Set(tags.map(String))),
            importance: importance ?? scoreImportance(text, kind),
            at: at ?? this.now(),
            source,
            accessedAt: at ?? this.now(),
            tokens: tokenize(text)
        };
        this.records.push(record);
        if (kind !== 'reflection') this.importanceSinceReflection += record.importance;
        if (this.records.length > this.capacity) this.records.splice(0, this.records.length - this.capacity);
        return record;
    }

    /** Retrieve the most relevant memories for a query. */
    retrieve(query, { limit = 5, now, weights = { recency: 1, importance: 1, relevance: 1 } } = {}) {
        const at = now ?? this.now();
        const qTokens = new Set(tokenize(query));
        const hourMs = 3600000;
        const scored = this.records.map((r) => {
            const ageHours = Math.max(0, (at - r.accessedAt) / hourMs);
            const recency = Math.pow(0.995, ageHours);
            const importance = r.importance / 10;
            let overlap = 0;
            for (const t of r.tokens) if (qTokens.has(t)) overlap++;
            const relevance = qTokens.size ? overlap / Math.sqrt(qTokens.size * Math.max(1, r.tokens.length)) : 0;
            const score = weights.recency * recency + weights.importance * importance + weights.relevance * relevance * 3;
            return { record: r, score, recency, importance, relevance };
        });
        scored.sort((a, b) => b.score - a.score);
        const top = scored.slice(0, limit);
        for (const s of top) s.record.accessedAt = at;
        return top.map((s) => ({ ...s.record, score: Math.round(s.score * 1000) / 1000 }));
    }

    recent(limit = 10) {
        return this.records.slice(-limit).reverse();
    }

    byKind(kind) {
        return this.records.filter((r) => r.kind === kind);
    }

    /** Should the agent reflect? (sum of importance since last reflection exceeds threshold) */
    shouldReflect(now = this.now()) {
        return this.importanceSinceReflection >= this.reflectionThreshold && now - this.lastReflectionAt >= this.reflectionCooldownMs;
    }

    /**
     * Rule-based reflection: find repeated tags/keywords among recent important
     * memories and write an insight. Returns the reflection records created.
     */
    reflect({ now, window = 30 } = {}) {
        const at = now ?? this.now();
        const recent = this.records.filter((r) => r.kind !== 'reflection').slice(-window);
        const reflections = [];
        const tagCounts = {};
        for (const r of recent) for (const tag of r.tags) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        const failures = recent.filter((r) => /\b(fail|defect|non-compliant)/i.test(r.text));
        if (failures.length >= 2) {
            const common = Object.entries(tagCounts).filter(([tag]) => failures.some((f) => f.tags.includes(tag))).sort((a, b) => b[1] - a[1])[0];
            reflections.push(this.add(`I keep finding defects${common ? ` around ${common[0]}` : ''} (${failures.length} recently). I should check that area first on the next job.`, { kind: 'reflection', tags: common ? [common[0], 'quality'] : ['quality'], at, importance: 8 }));
        }
        const wins = recent.filter((r) => /\b(pass|compliant|complete)/i.test(r.text));
        if (wins.length >= 3) {
            reflections.push(this.add(`My recent work is passing verification (${wins.length} successes). My process is working; I can take on harder tasks.`, { kind: 'reflection', tags: ['confidence'], at, importance: 6 }));
        }
        const topTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0];
        if (topTag && topTag[1] >= 4) {
            const phrases = { rest: 'resting', break: 'taking breaks', study: 'studying the standards', design: 'design work', install: 'installation work', commission: 'commissioning', social: 'talking with the crew', assignment: 'taking on assignments', calculate: 'calculations', battery: 'battery work', stc: 'certificate paperwork', grid: 'network applications', handover: 'handovers', inspect: 'inspections', audit: 'audits', mentor: 'mentoring', reflect: 'reflecting' };
            const what = phrases[topTag[0]] || topTag[0];
            const idle = ['rest', 'break'].includes(topTag[0]);
            reflections.push(this.add(idle ? `I have been ${what} a lot lately (${topTag[1]} times). Once I am recharged I should ask for a task.` : `Most of my recent time has gone into ${what} (${topTag[1]} times). I am building depth there.`, { kind: 'reflection', tags: [topTag[0], idle ? 'motivation' : 'focus'], at, importance: 5 }));
        }
        const studied = tagCounts.study || 0;
        if (studied >= 2 && failures.length === 0) reflections.push(this.add(`Studying is paying off: ${studied} sessions and no defects since. I should keep a clause handy before each task.`, { kind: 'reflection', tags: ['study', 'growth'], at, importance: 5 }));
        // Never repeat a thought already written recently.
        const existing = new Set(this.records.filter((r) => r.kind === 'reflection').slice(-10, -reflections.length || undefined).map((r) => r.text));
        for (const r of [...reflections]) if (existing.has(r.text)) { this.records.splice(this.records.indexOf(r), 1); reflections.splice(reflections.indexOf(r), 1); }
        this.importanceSinceReflection = 0;
        this.lastReflectionAt = at;
        return reflections;
    }

    toJSON() {
        return { capacity: this.capacity, reflectionThreshold: this.reflectionThreshold, counter: this.counter, importanceSinceReflection: this.importanceSinceReflection, records: this.records.map(({ tokens, ...r }) => r) };
    }

    static fromJSON(data, options = {}) {
        const stream = new MemoryStream({ capacity: data.capacity, reflectionThreshold: data.reflectionThreshold, ...options });
        stream.counter = data.counter || 0;
        stream.importanceSinceReflection = data.importanceSinceReflection || 0;
        stream.records = (data.records || []).map((r) => ({ ...r, tokens: tokenize(r.text) }));
        return stream;
    }
}

export const FEATURES = [
    { id: 'memory.tokenize', title: 'Tokeniser with stop words', test: () => tokenize('The isolator failed the test').join(',') === 'isolator,failed,test' },
    { id: 'memory.scoreImportance', title: 'Importance heuristic', test: () => scoreImportance('DC isolator failed inspection') > scoreImportance('Walked to the van') },
    { id: 'memory.addAndRecent', title: 'Add memories and list recent', test: () => { const m = new MemoryStream({ now: () => 1000 }); m.add('a'); m.add('b'); return m.recent(1)[0].text === 'b' && m.records.length === 2; } },
    { id: 'memory.retrieve', title: 'Retrieval by relevance/recency/importance', test: () => { const m = new MemoryStream({ now: () => 0 }); m.add('Checked battery clearance at the garage', { at: 0 }); m.add('Lunch at the cafe', { at: 0 }); m.add('Battery isolator failed inspection', { at: 0 }); const r = m.retrieve('battery clearance', { now: 0, limit: 2 }); return r[0].text.includes('clearance') && r.every((x) => x.text.toLowerCase().includes('battery')); } },
    { id: 'memory.capacity', title: 'Capacity bound', test: () => { const m = new MemoryStream({ capacity: 3, now: () => 0 }); for (let i = 0; i < 5; i++) m.add('x' + i); return m.records.length === 3 && m.records[0].text === 'x2'; } },
    { id: 'memory.reflect', title: 'Reflection synthesises insights from failures', test: () => { const m = new MemoryStream({ now: () => 0, reflectionThreshold: 10 }); m.add('DC isolator failed inspection', { tags: ['isolator'] }); m.add('Second isolator defect found', { tags: ['isolator'] }); const ok = m.shouldReflect(); const r = m.reflect({ now: 0 }); return ok && r.length >= 1 && r[0].kind === 'reflection' && r[0].text.includes('isolator') && !m.shouldReflect(); } },
    { id: 'memory.serialise', title: 'Serialise and restore', test: () => { const m = new MemoryStream({ now: () => 0 }); m.add('hello world', { tags: ['t'] }); const back = MemoryStream.fromJSON(JSON.parse(JSON.stringify(m.toJSON())), { now: () => 0 }); return back.records[0].tokens.includes('hello') && back.counter === 1; } }
];

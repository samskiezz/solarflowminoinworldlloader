/**
 * Social media import (Facebook Pages + Instagram Business, read via the
 * Graph API): accounts, posts with engagement, comments and inbox
 * conversations, the questions nobody answered, posting cadence and the
 * best times to post. Plus the minions' drafts: posts written from real
 * installed jobs (suburb, system, never the customer's name), seasonal and
 * market posts, and suggested replies – all of which wait for approval.
 */
import { clean, daysBetween } from './schema.js';

const LEAD_RE = /\b(price|pricing|quote|how much|cost|interested|install(?:ing)? (?:at|in) my|dm|message me|call me|can you do|do you service|available)\b/i;
const QUESTION_RE = /\?|\b(how|what|when|where|which|can you|do you)\b/i;

export function normalisePost(raw, account) {
    const ig = account.platform === 'instagram';
    const likes = ig ? (raw.like_count || 0) : (raw.reactions?.summary?.total_count ?? raw.likes?.summary?.total_count ?? 0);
    const comments = ig ? (raw.comments_count || 0) : (raw.comments?.summary?.total_count ?? 0);
    const shares = ig ? ((account.mediaInsights || {})[raw.id]?.shares || 0) : (raw.shares?.count || 0);
    const reach = ig ? ((account.mediaInsights || {})[raw.id]?.reach ?? null) : null;
    const saved = ig ? ((account.mediaInsights || {})[raw.id]?.saved ?? null) : null;
    const at = raw.timestamp || raw.created_time || null;
    return { id: raw.id, platform: account.platform, accountId: account.id, accountName: account.username || account.name || account.platform, text: clean(raw.caption || raw.message || raw.story || ''), at, url: raw.permalink || raw.permalink_url || null, image: raw.media_url || raw.thumbnail_url || raw.full_picture || null, type: raw.media_type || (raw.full_picture ? 'PHOTO' : 'STATUS'), likes, comments, shares, reach, saved, engagement: likes + comments + shares };
}
export function normaliseComment(raw, account, posts) {
    const ig = account.platform === 'instagram';
    const postId = raw.postId || raw.mediaId; const post = posts.find((p) => p.id === postId) || null;
    const author = ig ? (raw.username || '') : (raw.from?.name || raw.from?.id || '');
    const ownId = ig ? (account.username || '') : String(account.id);
    const byUs = ig ? author === account.username : String(raw.from?.id || '') === String(account.id);
    const replies = ig ? (raw.replies?.data || []) : (raw.comments?.data || []);
    const answered = byUs || replies.some((r) => (ig ? r.username === ownId : String(r.from?.id || '') === ownId));
    const text = clean(raw.text || raw.message || '');
    return { id: raw.id, platform: account.platform, accountId: account.id, postId, postText: post ? post.text.slice(0, 80) : '', author, byUs, text, at: raw.timestamp || raw.created_time || null, likes: raw.like_count || 0, replies: replies.length, answered, lead: !byUs && LEAD_RE.test(text), question: !byUs && QUESTION_RE.test(text), url: post?.url || null };
}
export function normaliseConversation(raw, account) {
    const last = (raw.messages?.data || [])[0] || null; const from = last?.from || {};
    const fromUs = String(from.id || '') === String(account.id);
    const other = (raw.participants?.data || []).find((p) => String(p.id) !== String(account.id)) || null;
    return { id: raw.id, platform: account.platform, accountId: account.id, with: other ? other.name || other.email || other.id : 'unknown', at: raw.updated_time || last?.created_time || null, snippet: clean(raw.snippet || last?.message || ''), unread: raw.unread_count || 0, messages: raw.message_count || 0, lastFromUs: fromUs, unanswered: !fromUs && Boolean(last), lead: !fromUs && LEAD_RE.test(raw.snippet || last?.message || ''), canReply: raw.can_reply !== false };
}

export function socialStats(accounts, posts, comments, conversations, { now = new Date() } = {}) {
    const weeks = 8; const recent = posts.filter((p) => p.at && daysBetween(p.at, now) <= weeks * 7);
    const lastPost = posts[0] || null;
    const followers = accounts.reduce((n, a) => n + (a.followers || 0), 0);
    const engagements = recent.map((p) => p.engagement);
    const avgEngagement = engagements.length ? Math.round(engagements.reduce((a, b) => a + b, 0) / engagements.length * 10) / 10 : 0;
    const engagementRate = followers && engagements.length ? Math.round((avgEngagement / followers) * 10000) / 100 : null;
    const byHour = {}; const byDay = {};
    for (const p of posts) { if (!p.at) continue; const d = new Date(p.at); const h = d.getUTCHours(); const w = d.getUTCDay(); byHour[h] = byHour[h] || { n: 0, e: 0 }; byHour[h].n++; byHour[h].e += p.engagement; byDay[w] = byDay[w] || { n: 0, e: 0 }; byDay[w].n++; byDay[w].e += p.engagement; }
    const best = (map) => Object.entries(map).filter(([, v]) => v.n >= 2).map(([k, v]) => [Number(k), v.e / v.n]).sort((a, b) => b[1] - a[1])[0] || null;
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const unanswered = comments.filter((c) => !c.byUs && !c.answered && (c.question || c.lead));
    const byPlatform = {}; for (const a of accounts) byPlatform[a.platform] = { accounts: (byPlatform[a.platform]?.accounts || 0) + 1, followers: (byPlatform[a.platform]?.followers || 0) + (a.followers || 0), posts: posts.filter((p) => p.platform === a.platform).length };
    return { accounts: accounts.length, followers, posts: posts.length, postsPerWeek: Math.round((recent.length / weeks) * 10) / 10, lastPostDays: lastPost && lastPost.at ? daysBetween(lastPost.at, now) : null, avgEngagement, engagementRate, bestHourUtc: best(byHour) ? best(byHour)[0] : null, bestDay: best(byDay) ? DAYS[best(byDay)[0]] : null,
        comments: comments.length, unansweredComments: unanswered.length, leadComments: comments.filter((c) => c.lead && !c.answered).length, conversations: conversations.length, unansweredMessages: conversations.filter((c) => c.unanswered).length, leadMessages: conversations.filter((c) => c.lead && c.unanswered).length, byPlatform, topPosts: [...posts].sort((a, b) => b.engagement - a.engagement).slice(0, 5).map((p) => ({ id: p.id, platform: p.platform, text: p.text.slice(0, 90), engagement: p.engagement, url: p.url })) };
}

/** The minions' draft posts. Install showcases never name the customer: suburb + system only. */
export function draftPosts({ jobs = [], sites = [], posts = [], market = null, stats = null, now = new Date() } = {}) {
    const drafts = []; const posted = posts.map((p) => p.text.toLowerCase());
    const recentInstalls = jobs.filter((j) => j.isSite && ['claim', 'handover', 'complete'].includes(j.stage) && j.system && (j.system.pvKw || j.system.batteryKwh) && j.editDate && daysBetween(j.editDate, now) <= 45).slice(0, 6);
    for (const j of recentInstalls) {
        const sub = j.address?.suburb || 'the neighbourhood'; const parts = [];
        if (j.system.pvKw) parts.push(`${j.system.pvKw} kW of solar${j.system.panels ? ` (${j.system.panels} panels)` : ''}`); if (j.system.batteryKwh) parts.push(`${j.system.batteryKwh} kWh of battery storage`);
        if (posted.some((t) => t.includes(sub.toLowerCase()) && t.includes(String(j.system.pvKw || j.system.batteryKwh)))) continue;
        drafts.push({ id: `install:${j.id}`, kind: 'install', owner: 'PRISM', platforms: ['facebook', 'instagram'], basis: `Job #${j.number} in ${sub} (customer not named)`, text: `Another ${sub} home switched on ☀️ ${parts.join(' and ')}${j.system.inverter ? ` with a ${j.system.inverter}` : ''}, installed by our own licensed crew. ${j.system.batteryKwh ? 'Evening peak covered, blackout backup sorted.' : 'Daytime power from the roof, lower bills from day one.'} Thinking about your roof? Message us for a free design.`, hashtags: ['#solar', `#${sub.replace(/\s+/g, '').toLowerCase()}`, '#battery', '#sydneysolar', '#cleanenergy'], needsImage: true, jobId: j.id });
    }
    if (market) {
        const stc = market.stc?.price; const bat = market.batteryStcFactor?.value;
        if (stc) drafts.push({ id: 'market:stc', kind: 'market', owner: 'CIPHER', platforms: ['facebook'], basis: `Market assumptions as of ${market.asOf}`, text: `Quick numbers for anyone weighing up solar this quarter: STCs are trading around $${stc} each, which still knocks thousands off a typical system, and the battery rebate factor sits at ${bat} STC per kWh. Both move over time – if you have a quote in hand, send it over and we will sanity-check it against today's rates.`, hashtags: ['#solarrebate', '#stc', '#batteryrebate'], needsImage: false });
        const watch = (market.watchlist || []).filter((w) => w.status !== 'verify').slice(0, 2);
        for (const w of watch) drafts.push({ id: `market:${w.id || w.title}`, kind: 'product', owner: 'RUNE', platforms: ['facebook', 'instagram'], basis: `Watchlist: ${w.title || w.id}`, text: `New on our radar: ${w.title || w.id}. ${w.note || w.why || 'We are testing it for the next round of installs.'} Want to know if it suits your home? Ask below.`, hashtags: ['#solartech', '#newproducts'], needsImage: true });
    }
    const month = now.getUTCMonth();
    const seasonal = [[9, 'Spring sun is back – the best months of generation are ahead. A panel clean and a quick check of the monitoring app now pays off all summer. Ask us about a system health check.'], [11, 'Heading into summer: batteries earn their keep on the hot evenings when the grid is most expensive. If your system has no storage yet, this is the time to size one.'], [2, 'Autumn is quote season – install lead times are shortest before winter. Lock in a design now and be generating before the cold snaps.'], [5, 'Winter tip: shorter days mean less solar, so shift the dishwasher and washing to midday and let the battery carry the evening.']];
    const s = seasonal.find(([m]) => Math.abs(m - month) <= 1); if (s && !posted.some((t) => t.includes(s[1].slice(0, 20).toLowerCase()))) drafts.push({ id: `season:${s[0]}`, kind: 'seasonal', owner: 'QUILL', platforms: ['facebook', 'instagram'], basis: 'Seasonal tip', text: s[1], hashtags: ['#solartips', '#energy'], needsImage: true });
    if (stats && stats.unansweredComments) drafts.push({ id: 'engage:answer', kind: 'engagement', owner: 'ECHO', platforms: [], basis: `${stats.unansweredComments} unanswered questions`, text: `Reply to the ${stats.unansweredComments} open questions in the Social inbox before posting anything new – answered comments lift every later post.`, hashtags: [], needsImage: false, action: true });
    return drafts;
}
/** A suggested reply for an open comment or message. */
export function suggestReply(item, { company = 'the team' } = {}) {
    const t = item.text || item.snippet || '';
    if (item.lead || LEAD_RE.test(t)) return `Thanks for reaching out! Every home is a bit different, so we price from a quick roof and bill check – send us your address and a recent bill by message and ${company} will come back with a design and a firm number.`;
    if (/warranty|fault|not working|error|broken|stopped/i.test(t)) return `Sorry to hear that – we will sort it. Please message us the address and what the inverter display or app shows and we will book a technician.`;
    if (/battery/i.test(t)) return `Good question. Battery sizing depends on your evening usage and whether you want backup – send us a bill and we will size it properly rather than guess.`;
    if (QUESTION_RE.test(t)) return `Great question – happy to help. Message us a few details about your home and we will answer properly.`;
    return `Thank you! Really appreciate the support.`;
}

export function importSocial({ accounts = [] } = {}, { now = new Date() } = {}) {
    const posts = []; const comments = []; const conversations = [];
    for (const a of accounts) {
        const list = (a.platform === 'instagram' ? a.media : a.posts) || [];
        const ps = list.map((p) => normalisePost(p, a)); posts.push(...ps);
        for (const c of a.comments || []) comments.push(normaliseComment(c, a, ps));
        for (const c of a.conversations || []) conversations.push(normaliseConversation(c, a));
    }
    posts.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0)); comments.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0)); conversations.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
    const accts = accounts.map((a) => ({ id: a.id, platform: a.platform, name: a.username || a.name, url: a.url, followers: a.followers ?? null, rating: a.rating ?? null, ratings: a.ratings || 0, posts: (a.platform === 'instagram' ? a.media : a.posts || []).length }));
    return { accounts: accts, posts, comments, conversations, stats: socialStats(accts, posts, comments, conversations, { now }) };
}

const SAMPLE = () => ({ accounts: [
    { platform: 'facebook', id: '100', name: 'Example Solar Co', url: 'https://facebook.com/examplesolar', followers: 1200, rating: 4.9, ratings: 31, posts: [{ id: '100_1', message: 'Another Penrith home switched on: 10 kW and a battery', created_time: '2026-09-20T03:00:00+0000', permalink_url: 'https://facebook.com/100_1', reactions: { summary: { total_count: 40 } }, comments: { summary: { total_count: 3 } }, shares: { count: 2 } }, { id: '100_2', message: 'Open Saturday', created_time: '2026-08-01T03:00:00+0000', reactions: { summary: { total_count: 5 } }, comments: { summary: { total_count: 0 } } }],
        comments: [{ id: 'c1', postId: '100_1', message: 'How much for a 10kW system?', from: { id: '555', name: 'Sam Visitor' }, created_time: '2026-09-21T00:00:00+0000' }, { id: 'c2', postId: '100_1', message: 'Looks great', from: { id: '556', name: 'Pat Fan' }, created_time: '2026-09-21T01:00:00+0000', comments: { data: [{ id: 'c2r', message: 'Thanks Pat!', from: { id: '100' } }] } }],
        conversations: [{ id: 'm1', updated_time: '2026-10-01T00:00:00+0000', unread_count: 1, message_count: 2, snippet: 'Hi, can you quote my place in Ryde?', participants: { data: [{ id: '100', name: 'Example Solar Co' }, { id: '777', name: 'Lee Prospect' }] }, messages: { data: [{ id: 'mm', from: { id: '777', name: 'Lee Prospect' }, created_time: '2026-10-01T00:00:00+0000', message: 'Hi, can you quote my place in Ryde?' }] } }] },
    { platform: 'instagram', id: '200', username: 'examplesolar', followers: 800, media: [{ id: '200_1', caption: 'Battery day in Blacktown', media_type: 'IMAGE', permalink: 'https://instagram.com/p/x', timestamp: '2026-09-25T03:00:00+0000', like_count: 60, comments_count: 1 }], comments: [{ id: 'ic1', mediaId: '200_1', text: 'Do you service the Hills?', username: 'northhome', timestamp: '2026-09-26T00:00:00+0000' }], mediaInsights: { '200_1': { reach: 900, saved: 4, shares: 3 } } }
] });
export const SAMPLE_SOCIAL = SAMPLE;
export const FEATURES = [
    { id: 'biz.social.import', title: 'Facebook pages and Instagram accounts import into one feed of posts, comments and messages with engagement', test: () => { const r = importSocial(SAMPLE(), { now: new Date('2026-10-12') }); const ig = r.posts.find((p) => p.platform === 'instagram'); return r.accounts.length === 2 && r.posts.length === 3 && r.posts[0].id === '200_1' && ig.engagement === 64 && ig.reach === 900 && r.comments.length === 3 && r.conversations.length === 1 && r.stats.followers === 2000; } },
    { id: 'biz.social.unanswered', title: 'Unanswered questions and price enquiries in comments and messages are found and flagged as leads', test: () => { const r = importSocial(SAMPLE(), { now: new Date('2026-10-12') }); const c1 = r.comments.find((c) => c.id === 'c1'); const c2 = r.comments.find((c) => c.id === 'c2'); const ic = r.comments.find((c) => c.id === 'ic1'); return c1.lead && !c1.answered && c2.answered && ic.question && !ic.answered && r.stats.unansweredComments === 2 && r.stats.leadComments === 2 && r.conversations[0].unanswered && r.conversations[0].lead && r.stats.leadMessages === 1; } },
    { id: 'biz.social.stats', title: 'Cadence, engagement rate and best posting day/hour are measured from the history', test: () => { const r = importSocial(SAMPLE(), { now: new Date('2026-10-12') }); const s = r.stats; return s.postsPerWeek > 0 && s.lastPostDays === 17 && s.avgEngagement > 0 && s.engagementRate > 0 && s.topPosts[0].id === '200_1' && s.byPlatform.facebook.followers === 1200; } },
    { id: 'biz.social.drafts', title: 'Minions draft posts from recent installs (suburb and system, never the customer), the market and the season, plus suggested replies', test: () => { const jobs = [{ id: 'SM8-1', number: '1', isSite: true, stage: 'complete', editDate: '2026-10-01', address: { suburb: 'Greenwich' }, system: { pvKw: 13.2, batteryKwh: 16, panels: 30, inverter: 'Hybrid 10K' }, customer: 'Jane Example' }]; const d = draftPosts({ jobs, posts: [], market: { asOf: '2026-10-01', stc: { price: 38 }, batteryStcFactor: { value: 8.4 }, watchlist: [{ id: 'w1', title: 'New 16 kWh stack', note: 'Cheaper per kWh.' }] }, stats: { unansweredComments: 2 }, now: new Date('2026-10-12') }); const inst = d.find((x) => x.kind === 'install'); return inst && /Greenwich/.test(inst.text) && /13.2 kW/.test(inst.text) && !/Jane/.test(inst.text) && inst.hashtags.includes('#greenwich') && d.some((x) => x.kind === 'market') && d.some((x) => x.kind === 'product') && d.some((x) => x.kind === 'seasonal') && d.some((x) => x.kind === 'engagement') && /bill/.test(suggestReply({ text: 'how much?', lead: true })) && /technician/.test(suggestReply({ text: 'inverter not working' })); } }
];

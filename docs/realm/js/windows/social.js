/** Social: Facebook and Instagram as the crew sees them – reach, cadence, every open question, the posts the minions drafted, and the approval queue. */
import { h, button, badge, empty, toast, progressBar } from '../core/ui.js';
import { section, row, grid, statCard } from './_shared.js';
import { needsModel, link, fmtDate, makeBusinessCtx, table as dataTable } from './_business.js';
import { suggestReply } from '../business/social.js';
import { openWindow, q, qa, fire } from './_testing.js';

export function def(ctx) {
    return {
        id: 'social', title: 'Social media', icon: '📣', hotkey: 'Shift+J', width: 1000, height: 680,
        tabs: [{ id: 'overview', label: 'Overview', icon: '📣' }, { id: 'inbox', label: 'Inbox', icon: '💬' }, { id: 'drafts', label: 'Drafts', icon: '✍️' }, { id: 'queue', label: 'Queue', icon: '🚀' }, { id: 'posts', label: 'Posts', icon: '🗂' }],
        render(body, { tab }) { if (needsModel(ctx, body)) return; ({ inbox: renderInbox, drafts: renderDrafts, queue: renderQueue, posts: renderPosts }[tab] || renderOverview)(body, ctx); }
    };
}
const PLAT = { facebook: 'FB', instagram: 'IG' };
const platBadge = (p) => badge(PLAT[p] || p, p === 'instagram' ? 'accent' : 'neutral');
const owner = (ctx, id) => ctx.world.agent(id);

function renderOverview(body, ctx) {
    const m = ctx.business.model; const s = m.stats.social || {}; const soc = m.social || { accounts: [] };
    if (!soc.accounts.length) { body.append(section('No social accounts connected', h('p', { class: 'muted' }, 'Add a Meta access token on the server (META_ACCESS_TOKEN) and sync: the crew reads every page and Instagram account the token can see – posts, comments, messages and insights – and drafts posts from real installs.'), row(button('Settings › Business', () => ctx.open('settings', { tab: 'business' }), { small: true })))); return; }
    const inbox = ctx.business.socialInbox(); const drafts = ctx.business.socialDrafts();
    body.append(section('Accounts', grid(Math.min(4, soc.accounts.length + 1), ...soc.accounts.map((a) => statCard(`${a.platform === 'instagram' ? '@' : ''}${a.name || a.platform}`, `${(a.followers ?? 0).toLocaleString()}`, `${a.posts} posts${a.rating ? ` · ★ ${a.rating} (${a.ratings})` : ''}`)), statCard('Total reach', `${(s.followers || 0).toLocaleString()}`, 'followers across accounts'))));
    body.append(section('Health', grid(4, statCard('Posts / week', s.postsPerWeek ?? '–', `last post ${s.lastPostDays ?? '–'} d ago`, s.lastPostDays >= 14 ? 'var(--bad)' : s.lastPostDays >= 7 ? 'var(--warn)' : null), statCard('Engagement', s.engagementRate != null ? `${s.engagementRate} %` : '–', `${s.avgEngagement ?? 0} per post`, s.engagementRate != null && s.engagementRate < 1 ? 'var(--warn)' : null), statCard('Open enquiries', String(inbox.length), `${inbox.filter((x) => x.lead).length} price / quote leads`, inbox.some((x) => x.lead) ? 'var(--bad)' : null), statCard('Drafts ready', String(drafts.filter((d) => d.status === 'draft').length), `${drafts.filter((d) => d.status === 'approved').length} approved · ${drafts.filter((d) => d.status === 'published').length} posted`)),
        h('p', { class: 'muted small' }, s.bestDay ? `Best day to post so far: ${s.bestDay}${s.bestHourUtc != null ? ` around ${(s.bestHourUtc + 10) % 24}:00 Sydney time` : ''}.` : 'Not enough history to pick the best posting time yet.'),
        row(button('Answer enquiries', () => ctx.wm.setTab('social', 'inbox'), { kind: inbox.length ? 'primary' : '', small: true }), button('Review drafts', () => ctx.wm.setTab('social', 'drafts'), { small: true }), ...soc.accounts.filter((a) => a.url).map((a) => link(`Open ${a.platform}`, a.url)))));
    const top = s.topPosts || [];
    if (top.length) body.append(section('Top posts', h('ul', { class: 'notes' }, top.map((p) => h('li', {}, platBadge(p.platform), ' ', p.text || '(photo)', ' ', badge(`${p.engagement} engagements`, 'ok'), ' ', link('open', p.url))))));
    const who = ['PRISM', 'ECHO', 'QUILL', 'CIPHER', 'RUNE'].map((id) => owner(ctx, id)).filter(Boolean);
    body.append(section('The social crew', h('p', { class: 'muted small' }, who.map((a) => `${a.name} (${{ PRISM: 'cadence and engagement', ECHO: 'replies to comments and messages', QUILL: 'install stories and tips', CIPHER: 'market and rebate posts', RUNE: 'new products' }[a.id]})`).join(' · ')), h('p', { class: 'muted small' }, 'Every draft is written from real jobs (suburb and system, never a customer name) and waits for your approval. Publishing only happens through your server, only when it allows it, and only for approved drafts.')));
}

function renderInbox(body, ctx) {
    const inbox = ctx.business.socialInbox(); const company = ctx.business.model.company.name;
    body.append(section(`${inbox.length} comments and messages waiting for a reply`, grid(3, statCard('Price / quote leads', inbox.filter((x) => x.lead).length, '', inbox.some((x) => x.lead) ? 'var(--bad)' : null), statCard('Questions', inbox.filter((x) => !x.lead).length), statCard('Direct messages', inbox.filter((x) => x.kind === 'message').length))));
    if (!inbox.length) { body.append(empty('Every comment and message has an answer. Nice.')); return; }
    body.append(h('div', { class: 'social-inbox' }, inbox.map((x) => {
        const reply = h('textarea', { class: 'input reply', rows: 3 }, suggestReply(x, { company }));
        return h('div', { class: `card social-item ${x.lead ? 'lead' : ''}` }, row(platBadge(x.platform), badge(x.kind, 'neutral'), x.lead ? badge('lead', 'bad') : null, h('strong', {}, x.from || 'someone'), h('span', { class: 'muted small' }, fmtDate(x.at)), x.url ? link('open', x.url) : null),
            h('div', { class: 'social-body' }, x.body), x.postText ? h('div', { class: 'muted small' }, `on: ${x.postText}`) : null,
            h('div', { class: 'muted small' }, 'Echo suggests:'), reply,
            row(button('Copy reply', async () => { try { await navigator.clipboard.writeText(reply.value); toast('Reply copied – paste it on the post', { kind: 'ok' }); } catch { toast('Select and copy the text', { kind: 'warn' }); } }, { small: true }), button('Mark replied', () => { ctx.business.markReplied(x.id); ctx.refresh('social'); }, { kind: 'primary', small: true }), x.lead ? button('Create lead job', () => { const job = ctx.world.addJob({ customer: x.from || 'Social lead', address: '', postcode: '', systemKw: 0 }); job.source = 'social'; job.notes = `${x.platform} ${x.kind}: ${x.body}`; ctx.setCurrentJob(job.id); ctx.saveWorld(); toast(`Lead job ${job.id} created`, { kind: 'ok' }); ctx.open('jobs', { tab: 'detail' }); }, { small: true }) : null));
    })));
}

function draftCard(ctx, d, { queue = false } = {}) {
    const own = owner(ctx, d.owner);
    const text = h('textarea', { class: 'input draft-text', rows: 5, onchange: () => ctx.business.editDraft(d.id, { text: text.value }) }, d.text);
    const tags = h('input', { type: 'text', class: 'input', value: (d.hashtags || []).join(' '), onchange: () => ctx.business.editDraft(d.id, { hashtags: tags.value.split(/\s+/).filter(Boolean) }) });
    const img = h('input', { type: 'url', class: 'input draft-image', placeholder: 'Public image URL (needed for Instagram)', value: d.imageUrl || '', onchange: () => ctx.business.editDraft(d.id, { imageUrl: img.value.trim() }) });
    const fb = h('input', { type: 'checkbox', checked: (d.platforms || []).includes('facebook') ? '' : null }); const ig = h('input', { type: 'checkbox', checked: (d.platforms || []).includes('instagram') ? '' : null });
    const savePlat = () => ctx.business.editDraft(d.id, { platforms: [fb.checked ? 'facebook' : null, ig.checked ? 'instagram' : null].filter(Boolean) }); fb.onchange = savePlat; ig.onchange = savePlat;
    const status = { draft: 'neutral', approved: 'accent', published: 'ok', dismissed: 'bad' }[d.status];
    return h('div', { class: `card social-draft status-${d.status}` }, row(badge(d.kind, 'neutral'), badge(d.status, status), h('strong', {}, own ? `${own.name} wrote:` : ''), h('span', { class: 'muted small' }, d.basis), d.jobId && ctx.job(d.jobId) ? button('Open job', () => { ctx.setCurrentJob(d.jobId); ctx.open('jobs', { tab: 'detail' }); }, { small: true }) : null),
        text, row(h('label', { class: 'field inline' }, h('span', { class: 'field-label' }, 'Hashtags'), tags)), row(h('label', { class: 'field inline' }, fb, ' Facebook'), h('label', { class: 'field inline' }, ig, ' Instagram'), img, d.needsImage ? h('span', { class: 'muted small' }, 'add a site photo') : null),
        d.results ? h('div', { class: 'muted small' }, `Posted ${fmtDate(d.publishedAt)}: ${d.results.map((r) => `${r.platform} ${r.error ? `✗ ${r.error}` : '✓'}`).join(' · ')}`) : null,
        row(...(d.status === 'draft' || d.status === 'dismissed' ? [button('Approve', () => { ctx.business.approveDraft(d.id); toast('Approved – it is in the queue', { kind: 'ok' }); ctx.refresh('social'); }, { kind: 'primary', small: true })] : []),
            ...(d.status === 'approved' ? [button(queue ? 'Publish now' : 'Publish', async () => { try { const r = await ctx.business.publishDraft(d.id); toast(`Published: ${(r.results || []).map((x) => x.platform).join(', ')}`, { kind: 'ok' }); ctx.saveWorld(); } catch (e) { toast(e.message, { kind: 'warn', timeout: 6000 }); } ctx.refresh('social'); }, { kind: 'primary', small: true }), button('Copy text', async () => { try { await navigator.clipboard.writeText(`${text.value}\n\n${tags.value}`); toast('Copied – paste it into the app', { kind: 'ok' }); } catch { toast('Select and copy', { kind: 'warn' }); } }, { small: true })] : []),
            ...(d.status !== 'published' && d.status !== 'dismissed' ? [button('Dismiss', () => { ctx.business.dismissDraft(d.id); ctx.refresh('social'); }, { small: true })] : [])));
}
function renderDrafts(body, ctx) {
    const drafts = ctx.business.socialDrafts().filter((d) => d.status === 'draft' || d.status === 'dismissed');
    body.append(section(`${drafts.filter((d) => d.status === 'draft').length} drafts waiting for your approval`, h('p', { class: 'muted small' }, 'Written by the crew from recent installs, the market assumptions and the season. Edit the copy, pick the platforms, add a photo URL, then approve. Nothing is posted until you say so.'), drafts.length ? h('div', { class: 'social-drafts' }, drafts.map((d) => draftCard(ctx, d))) : empty('No drafts right now – the crew writes new ones as installs complete.')));
}
function renderQueue(body, ctx) {
    const all = ctx.business.socialDrafts(); const approved = all.filter((d) => d.status === 'approved'); const published = all.filter((d) => d.status === 'published');
    const allow = ctx.business.model.social?.allowPublish;
    body.append(section(`${approved.length} approved, ready to publish`, h('p', { class: 'muted small' }, allow ? 'The server allows publishing: "Publish now" posts through the Meta API on your behalf.' : 'The server has publishing switched off (META_ALLOW_PUBLISH). Copy the text and post it from the Facebook or Instagram app, or switch it on and sync.'), approved.length ? h('div', { class: 'social-drafts' }, approved.map((d) => draftCard(ctx, d, { queue: true }))) : empty('Nothing approved yet.')));
    if (published.length) body.append(section(`${published.length} published`, h('div', { class: 'social-drafts' }, published.map((d) => draftCard(ctx, d)))));
}
function renderPosts(body, ctx) {
    const posts = ctx.business.model.social?.posts || [];
    body.append(section(`${posts.length} posts`, dataTable({ columns: [{ key: 'at', label: 'When', render: (v) => fmtDate(v) }, { key: 'platform', label: '', render: (v) => platBadge(v) }, { key: 'text', label: 'Post', render: (v) => (v || '(photo)').slice(0, 100) }, { key: 'likes', label: 'Likes', align: 'right' }, { key: 'comments', label: 'Comments', align: 'right' }, { key: 'shares', label: 'Shares', align: 'right' }, { key: 'reach', label: 'Reach', align: 'right', render: (v) => (v == null ? '–' : String(v)) }, { key: 'url', label: '', render: (v) => link('open', v) }], rows: posts, pageSize: 25, searchKeys: ['text', 'platform'], initialSort: { key: 'at', dir: 'desc' } })));
}

export const FEATURES = [
    { id: 'win.social.overview', title: 'Overview shows every account with followers, cadence, engagement, open enquiries and drafts ready', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.stat').length >= 7 && /Open enquiries/.test(b.textContent) && /Top posts/.test(b.textContent); t.done(); return ok; } },
    { id: 'win.social.inbox', title: 'Inbox lists unanswered comments and messages, leads first, with a suggested reply, mark-replied and lead-job creation', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'inbox' }); const items = qa(b, '.social-item'); const first = items[0]; const lead = first.classList.contains('lead') && /bill/.test(q(first, 'textarea').value); qa(first, 'button').find((x) => x.textContent === 'Create lead job').click(); const job = t.ctx.world.jobs.find((j) => j.source === 'social'); const b2 = openWindow(t.ctx, def(t.ctx), { tab: 'inbox' }); qa(b2, '.social-item')[0].querySelector('button.primary, .btn-primary') ; qa(b2, 'button').find((x) => x.textContent === 'Mark replied').click(); const after = t.ctx.business.socialInbox().length; const ok = items.length === 3 && lead && job && after === 2; t.done(); return Boolean(ok); } },
    { id: 'win.social.drafts', title: 'Drafts can be edited, given platforms and an image, approved into the queue or dismissed', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'drafts' }); const cards = qa(b, '.social-draft'); const first = cards[0]; const ta = q(first, 'textarea.draft-text'); ta.value = 'New copy'; fire(ta, 'change'); const img = q(first, 'input.draft-image'); img.value = 'https://img.example/x.jpg'; fire(img, 'change'); qa(first, 'button').find((x) => x.textContent === 'Approve').click(); const d = t.ctx.business.socialDrafts()[0]; const b2 = openWindow(t.ctx, def(t.ctx), { tab: 'drafts' }); qa(b2, '.social-draft')[0] && qa(qa(b2, '.social-draft')[0], 'button').find((x) => x.textContent === 'Dismiss').click(); const states = t.ctx.business.socialDrafts().map((x) => x.status); const ok = cards.length >= 2 && d.status === 'approved' && d.text === 'New copy' && d.imageUrl === 'https://img.example/x.jpg' && states.includes('dismissed'); t.done(); return ok; } },
    { id: 'win.social.queue', title: 'Queue shows approved drafts with publish/copy and explains when the server has publishing off', dom: true, test: () => { const t = makeBusinessCtx(); const id = t.ctx.business.socialDrafts()[0].id; t.ctx.business.approveDraft(id); const b = openWindow(t.ctx, def(t.ctx), { tab: 'queue' }); const ok = qa(b, '.social-draft.status-approved').length === 1 && /switched off|allows publishing/.test(b.textContent) && qa(b, 'button').some((x) => /Publish now/.test(x.textContent)); t.done(); return ok; } },
    { id: 'win.social.posts', title: 'Posts tab lists the history across platforms with engagement and links', dom: true, test: () => { const t = makeBusinessCtx(); const b = openWindow(t.ctx, def(t.ctx), { tab: 'posts' }); const ok = qa(b, 'tbody tr').length === 3 && /Battery day/.test(b.textContent); t.done(); return ok; } }
];

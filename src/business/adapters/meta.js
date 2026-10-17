/**
 * Meta (Facebook Pages + Instagram Business) via the Graph API.
 *
 * Reading (always): each page's profile and follower count, recent posts
 * with likes/comments/shares, the comments on them, the page inbox
 * conversations (metadata + last message), the linked Instagram business
 * account, its media with like/comment counts and the comments on recent
 * media, plus page/media insights where the token allows them.
 *
 * Publishing (only when META_ALLOW_PUBLISH=true AND an admin approves a
 * draft in the Social window): a text/link/photo post to a page, or an
 * image post to Instagram (container then publish). Nothing is ever
 * published automatically.
 *
 * Token: a long-lived user token or a system-user token with
 * pages_show_list, pages_read_engagement, pages_read_user_content,
 * read_insights, instagram_basic, instagram_manage_comments,
 * instagram_manage_insights, pages_messaging (inbox) and, for publishing,
 * pages_manage_posts + instagram_content_publish.
 */
'use strict';

const { fetchJson } = require('../http');

const VERSION = 'v21.0';
const BASE = `https://graph.facebook.com/${VERSION}`;

function isConfigured(cfg) { return Boolean(cfg.accessToken); }
const q = (params) => Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
async function get(path, params, token, fetchFn) { return fetchJson(`${BASE}/${path}?${q({ ...params, access_token: token })}`, { fetchFn }); }
async function post(path, body, token, fetchFn) { return fetchJson(`${BASE}/${path}`, { method: 'POST', form: true, body: { ...body, access_token: token }, fetchFn }); }
/** Follow `paging.next` up to `maxPages` pages. */
async function paged(path, params, token, fetchFn, { maxPages = 5, limit = 100 } = {}) {
    const out = []; let res = await get(path, { ...params, limit }, token, fetchFn); let pages = 1;
    while (res) { out.push(...(res.data || [])); const next = res.paging && res.paging.next; if (!next || pages >= maxPages) break; res = await fetchJson(next, { fetchFn }); pages++; }
    return out;
}
const soft = async (fn, fallback, log, what) => { try { return await fn(); } catch (e) { log(`meta: ${what} unavailable (${e.message.split('\n')[0]})`); return fallback; } };

/** Pages the token can see (with page tokens); falls back to the configured ids with the user token. */
async function resolvePages(cfg, fetchFn, log) {
    const wanted = (cfg.pageIds || []).map(String);
    const mine = await soft(() => paged('me/accounts', { fields: 'id,name,access_token,instagram_business_account{id,username}' }, cfg.accessToken, fetchFn), [], log, 'me/accounts');
    const pages = mine.filter((p) => !wanted.length || wanted.includes(String(p.id))).map((p) => ({ id: p.id, name: p.name, token: p.access_token || cfg.accessToken, igId: p.instagram_business_account && p.instagram_business_account.id }));
    for (const id of wanted) if (!pages.find((p) => String(p.id) === id)) pages.push({ id, name: null, token: cfg.accessToken, igId: null });
    return pages;
}

async function pullPage(page, cfg, fetchFn, log) {
    const info = await get(page.id, { fields: 'id,name,link,fan_count,followers_count,category,about,instagram_business_account{id,username},rating_count,overall_star_rating' }, page.token, fetchFn);
    const posts = await soft(() => paged(`${page.id}/posts`, { fields: 'id,message,story,created_time,permalink_url,full_picture,shares,is_published,likes.summary(true).limit(0),comments.summary(true).limit(0),reactions.summary(true).limit(0)' }, page.token, fetchFn, { maxPages: Math.ceil((cfg.maxPosts || 200) / 100) }), [], log, `posts for ${page.id}`);
    const comments = [];
    for (const p of posts.slice(0, cfg.maxCommentPosts || 40)) {
        const list = await soft(() => paged(`${p.id}/comments`, { fields: 'id,message,created_time,from,comment_count,like_count,parent{id},comments.limit(10){id,message,from,created_time}', filter: 'stream' }, page.token, fetchFn, { maxPages: 2 }), [], log, `comments on ${p.id}`);
        for (const c of list) comments.push({ ...c, postId: p.id });
    }
    const insights = await soft(() => get(`${page.id}/insights`, { metric: 'page_impressions,page_post_engagements,page_fans,page_views_total', period: 'week' }, page.token, fetchFn), null, log, `insights for ${page.id}`);
    const conversations = await soft(() => paged(`${page.id}/conversations`, { fields: 'id,updated_time,unread_count,message_count,participants,snippet,can_reply,messages.limit(1){id,from,created_time,message}', platform: 'messenger' }, page.token, fetchFn, { maxPages: 2 }), [], log, `inbox for ${page.id}`);
    const out = { platform: 'facebook', id: info.id, name: info.name, url: info.link, followers: info.followers_count ?? info.fan_count ?? null, category: info.category || null, rating: info.overall_star_rating ?? null, ratings: info.rating_count ?? 0, posts, comments, conversations, insights: insights ? insights.data : null };
    const igId = (info.instagram_business_account && info.instagram_business_account.id) || page.igId;
    let ig = null;
    if (igId) ig = await soft(() => pullInstagram(igId, page.token, cfg, fetchFn, log), null, log, `instagram ${igId}`);
    return { page: out, instagram: ig };
}

async function pullInstagram(igId, token, cfg, fetchFn, log) {
    const info = await get(igId, { fields: 'id,username,name,followers_count,follows_count,media_count,profile_picture_url,biography,website' }, token, fetchFn);
    const media = await paged(`${igId}/media`, { fields: 'id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count,media_url,thumbnail_url' }, token, fetchFn, { maxPages: Math.ceil((cfg.maxPosts || 200) / 100) });
    const comments = [];
    for (const m of media.slice(0, cfg.maxCommentPosts || 40)) {
        const list = await soft(() => paged(`${m.id}/comments`, { fields: 'id,text,username,timestamp,like_count,replies.limit(10){id,text,username,timestamp}' }, token, fetchFn, { maxPages: 2 }), [], log, `ig comments on ${m.id}`);
        for (const c of list) comments.push({ ...c, mediaId: m.id });
    }
    const insights = await soft(() => get(`${igId}/insights`, { metric: 'reach,profile_views,accounts_engaged', period: 'day', metric_type: 'total_value' }, token, fetchFn), null, log, `ig insights ${igId}`);
    const mediaInsights = {};
    for (const m of media.slice(0, cfg.maxInsightPosts || 30)) { const r = await soft(() => get(`${m.id}/insights`, { metric: m.media_type === 'VIDEO' || m.media_product_type === 'REELS' ? 'reach,saved,shares,plays' : 'reach,saved,shares' }, token, fetchFn), null, () => {}, ''); if (r && r.data) mediaInsights[m.id] = Object.fromEntries(r.data.map((d) => [d.name, (d.values && d.values[0] && d.values[0].value) ?? d.total_value?.value ?? null])); }
    return { platform: 'instagram', id: info.id, username: info.username, name: info.name, url: info.username ? `https://www.instagram.com/${info.username}/` : null, followers: info.followers_count ?? null, following: info.follows_count ?? null, mediaCount: info.media_count ?? null, media, comments, insights: insights ? insights.data : null, mediaInsights };
}

async function pull(cfg, { fetchFn = globalThis.fetch, log = () => {} } = {}) {
    const pages = await resolvePages(cfg, fetchFn, log);
    if (!pages.length) throw new Error('meta: no pages visible to this token (set META_PAGE_IDS or grant pages_show_list)');
    const accounts = [];
    for (const page of pages) { const r = await pullPage(page, cfg, fetchFn, log); accounts.push(r.page); if (r.instagram) accounts.push(r.instagram); }
    for (const igId of cfg.igUserIds || []) if (!accounts.find((a) => a.platform === 'instagram' && String(a.id) === String(igId))) { const ig = await soft(() => pullInstagram(igId, cfg.accessToken, cfg, fetchFn, log), null, log, `instagram ${igId}`); if (ig) accounts.push(ig); }
    log(`meta: ${accounts.length} accounts, ${accounts.reduce((n, a) => n + (a.posts || a.media || []).length, 0)} posts, ${accounts.reduce((n, a) => n + (a.comments || []).length, 0)} comments`);
    return { syncedAt: new Date().toISOString(), accounts, allowPublish: Boolean(cfg.allowPublish) };
}

/** Publish an approved draft. Facebook: text (+link) or a photo by URL. Instagram: an image by public URL with a caption. */
async function publish(cfg, draft, { fetchFn = globalThis.fetch, log = () => {} } = {}) {
    if (!cfg.allowPublish) throw new Error('publishing is disabled (set META_ALLOW_PUBLISH=true)');
    const pages = await resolvePages(cfg, fetchFn, log);
    const results = [];
    const targets = draft.platforms && draft.platforms.length ? draft.platforms : ['facebook'];
    for (const page of pages.filter((p) => !draft.pageId || String(p.id) === String(draft.pageId))) {
        if (targets.includes('facebook')) {
            const r = draft.imageUrl ? await post(`${page.id}/photos`, { url: draft.imageUrl, caption: draft.text }, page.token, fetchFn) : await post(`${page.id}/feed`, { message: draft.text, link: draft.link || undefined }, page.token, fetchFn);
            results.push({ platform: 'facebook', pageId: page.id, id: r.post_id || r.id });
        }
        if (targets.includes('instagram')) {
            const igId = page.igId || (await get(page.id, { fields: 'instagram_business_account{id}' }, page.token, fetchFn)).instagram_business_account?.id;
            if (!igId) { results.push({ platform: 'instagram', pageId: page.id, error: 'no Instagram business account linked to this page' }); continue; }
            if (!draft.imageUrl) { results.push({ platform: 'instagram', pageId: page.id, error: 'Instagram needs an image URL' }); continue; }
            const container = await post(`${igId}/media`, { image_url: draft.imageUrl, caption: draft.text }, page.token, fetchFn);
            const pub = await post(`${igId}/media_publish`, { creation_id: container.id }, page.token, fetchFn);
            results.push({ platform: 'instagram', igId, id: pub.id });
        }
        if (draft.pageId) break;
    }
    log(`meta: published draft ${draft.id || ''} to ${results.length} target(s)`);
    return { publishedAt: new Date().toISOString(), results };
}

module.exports = { isConfigured, pull, publish, resolvePages, BASE, VERSION };

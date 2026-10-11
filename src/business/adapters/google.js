/**
 * Google Workspace (read-only): Gmail thread metadata, the handover folder in
 * Drive and calendar events. Two credential paths:
 *   - a service-account key with domain-wide delegation acting as GOOGLE_IMPERSONATE
 *     (with GOOGLE_ALL_USERS the Admin Directory lists the workspace users and
 *     each mailbox is read the same way, metadata only)
 *   - an OAuth client with a refresh token for one mailbox
 * Scopes (all read-only): gmail.readonly, drive.metadata.readonly,
 * calendar.readonly, admin.directory.user.readonly.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const { fetchJson } = require('../http');

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/drive.metadata.readonly', 'https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/admin.directory.user.readonly'];
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

function isConfigured(cfg) { return Boolean((cfg.serviceAccount && cfg.subject) || (cfg.oauthClientId && cfg.oauthClientSecret && cfg.oauthRefreshToken)); }

function loadServiceAccount(value) { const text = value.trim().startsWith('{') ? value : fs.readFileSync(value, 'utf8'); return JSON.parse(text); }
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Signed JWT assertion for a service account, optionally acting as a workspace user. */
function serviceAccountAssertion(key, subject, { now = Math.floor(Date.now() / 1000), scopes = SCOPES } = {}) {
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: key.private_key_id }));
    const claims = b64url(JSON.stringify({ iss: key.client_email, sub: subject || undefined, scope: scopes.join(' '), aud: TOKEN_URL, iat: now, exp: now + 3600 }));
    const sig = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claims}`), key.private_key);
    return `${header}.${claims}.${b64url(sig)}`;
}

async function accessToken(cfg, fetchFn, subject = cfg.subject) {
    if (cfg.serviceAccount) { const key = loadServiceAccount(cfg.serviceAccount); const res = await fetchJson(TOKEN_URL, { method: 'POST', form: true, body: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: serviceAccountAssertion(key, subject) }, fetchFn }); return res.access_token; }
    const res = await fetchJson(TOKEN_URL, { method: 'POST', form: true, body: { grant_type: 'refresh_token', client_id: cfg.oauthClientId, client_secret: cfg.oauthClientSecret, refresh_token: cfg.oauthRefreshToken }, fetchFn });
    return res.access_token;
}

const headerOf = (msg, name) => (msg.payload?.headers || []).find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';
const splitAddrs = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

/** Thread metadata only (headers, labels, snippet); bodies are never fetched. */
async function gmailThreads(bearer, fetchFn, { query, max }) {
    const threads = []; let pageToken = '';
    while (threads.length < max) {
        const q = new URLSearchParams({ q: query, maxResults: '100' }); if (pageToken) q.set('pageToken', pageToken);
        const page = await fetchJson(`https://gmail.googleapis.com/gmail/v1/users/me/threads?${q}`, { auth: { bearer }, fetchFn });
        for (const t of page.threads || []) {
            const full = await fetchJson(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${t.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Subject&metadataHeaders=Date`, { auth: { bearer }, fetchFn });
            threads.push({ id: full.id, messageCount: (full.messages || []).length, viewUrl: `https://mail.google.com/mail/#all/${full.id}`, messages: (full.messages || []).map((m) => ({ id: m.id, date: new Date(Number(m.internalDate)).toISOString(), sender: headerOf(m, 'From'), toRecipients: splitAddrs(headerOf(m, 'To')), ccRecipients: splitAddrs(headerOf(m, 'Cc')), subject: headerOf(m, 'Subject'), snippet: m.snippet || '', labelIds: m.labelIds || [], sizeEstimate: m.sizeEstimate || 0 })) });
            if (threads.length >= max) break;
        }
        pageToken = page.nextPageToken || ''; if (!pageToken) break;
    }
    return threads;
}
async function driveChildren(bearer, fetchFn, folderId) {
    const files = []; let pageToken = '';
    do { const q = new URLSearchParams({ q: `'${folderId}' in parents and trashed = false`, fields: 'nextPageToken,files(id,name,mimeType,createdTime,modifiedTime,owners(emailAddress),webViewLink)', pageSize: '1000', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' }); if (pageToken) q.set('pageToken', pageToken); const page = await fetchJson(`https://www.googleapis.com/drive/v3/files?${q}`, { auth: { bearer }, fetchFn }); files.push(...(page.files || [])); pageToken = page.nextPageToken || ''; } while (pageToken);
    return files.map((f) => ({ id: f.id, title: f.name, mimeType: f.mimeType, createdTime: f.createdTime, modifiedTime: f.modifiedTime, owner: f.owners?.[0]?.emailAddress || null, viewUrl: f.webViewLink }));
}
async function calendarEvents(bearer, fetchFn, calendarId, { from, to }) {
    const items = []; let pageToken = '';
    do { const q = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250' }); if (pageToken) q.set('pageToken', pageToken); const page = await fetchJson(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${q}`, { auth: { bearer }, fetchFn }); items.push(...(page.items || [])); pageToken = page.nextPageToken || ''; } while (pageToken);
    return items.map((e) => ({ id: e.id, recurringEventId: e.recurringEventId || null, summary: e.summary, description: e.description, location: e.location, start: e.start, end: e.end, organizer: e.organizer, attendees: e.attendees, htmlLink: e.htmlLink, conferenceUrl: e.hangoutLink || null, attachments: e.attachments }));
}
async function workspaceUsers(bearer, fetchFn) {
    const res = await fetchJson('https://admin.googleapis.com/admin/directory/v1/users?customer=my_customer&maxResults=200', { auth: { bearer }, fetchFn });
    return (res.users || []).filter((u) => !u.suspended).map((u) => u.primaryEmail);
}

async function pull(cfg, { fetchFn = globalThis.fetch, log = () => {}, now = new Date() } = {}) {
    const bearer = await accessToken(cfg, fetchFn);
    const out = { syncedAt: now.toISOString() };
    let users = [cfg.subject || 'me'];
    if (cfg.allUsers && cfg.serviceAccount) { try { users = await workspaceUsers(bearer, fetchFn); } catch (e) { log(`google: directory listing failed (${e.message}); reading ${cfg.subject || 'me'} only`); } }
    const pages = [];
    for (const user of users) { const b = user === cfg.subject || user === 'me' ? bearer : await accessToken(cfg, fetchFn, user); const threads = await gmailThreads(b, fetchFn, { query: cfg.mailQuery, max: cfg.mailMaxThreads }); pages.push({ user, threads }); log(`gmail: ${threads.length} threads for ${user}`); }
    out.gmail = { syncedAt: out.syncedAt, pages, users };
    if (cfg.handoverFolderId) { const folders = await driveChildren(bearer, fetchFn, cfg.handoverFolderId); const files = {}; for (const f of folders.filter((x) => /folder/.test(x.mimeType)).slice(0, 400)) files[f.id] = await driveChildren(bearer, fetchFn, f.id); out.drive = { syncedAt: out.syncedAt, root: { id: cfg.handoverFolderId, url: `https://drive.google.com/drive/folders/${cfg.handoverFolderId}` }, folders, files }; log(`drive: ${folders.length} handover folders`); }
    const from = new Date(now); from.setDate(from.getDate() - 60); const to = new Date(now); to.setDate(to.getDate() + 90);
    out.calendar = { syncedAt: out.syncedAt, calendars: [{ id: cfg.calendarId }], events: await calendarEvents(bearer, fetchFn, cfg.calendarId || 'primary', { from, to }) };
    log(`calendar: ${out.calendar.events.length} events`);
    return out;
}

module.exports = { isConfigured, pull, serviceAccountAssertion, SCOPES, gmailThreads, driveChildren, calendarEvents };

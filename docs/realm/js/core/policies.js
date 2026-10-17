/**
 * Policies: the organisation's configurable rules – session timeouts, quiet
 * hours, retry back-off, retention periods, budgets, quotas, thresholds,
 * accessibility preferences and feature flags – one typed catalogue with a
 * value per policy, a change history for every edit, flags that expire, and
 * enforcement hooks the shell applies (quiet hours silence toasts, reduced
 * motion and high contrast set body classes, a session-timeout warning fires,
 * flagged-off windows refuse to open). Each policy names the programme items
 * it implements.
 */

const P = (id, title, domain, items, type, def, extra = {}) => ({ id, title, domain, items, type, default: def, ...extra });

export const POLICY_DEFS = [
    // Accounts and sessions
    P('session.timeoutMinutes', 'Session timeout (minutes of inactivity)', 'accounts', [21, 794], 'number', 60, { min: 5, max: 1440, unit: 'min' }),
    P('session.warnBeforeMinutes', 'Warn before the session times out', 'accounts', [794], 'number', 5, { min: 1, max: 60, unit: 'min' }),
    P('session.maxActive', 'Maximum active sessions per user', 'accounts', [17], 'number', 5, { min: 1, max: 50 }),
    P('auth.mfaRequired', 'Require a second factor for every account', 'accounts', [3, 4, 5], 'bool', false),
    P('auth.passkeys', 'Allow passkey sign-in', 'accounts', [3], 'bool', true),
    P('auth.recoveryCodes', 'Recovery codes issued per account', 'accounts', [5, 23, 50], 'number', 8, { min: 4, max: 16 }),
    P('auth.inviteExpiryDays', 'Invitation links expire after', 'accounts', [8, 9], 'number', 7, { min: 1, max: 90, unit: 'days' }),
    P('auth.inviteDomainsOnly', 'Only invite verified domains', 'accounts', [31, 32], 'bool', false),
    P('auth.inactiveSuspendDays', 'Suspend accounts inactive for', 'accounts', [40], 'number', 90, { min: 30, max: 730, unit: 'days' }),
    P('auth.tokenExpiryDays', 'API tokens expire after', 'accounts', [36], 'number', 90, { min: 1, max: 365, unit: 'days' }),
    P('auth.suspiciousLoginAlerts', 'Alert on suspicious logins', 'accounts', [19], 'bool', true),
    P('auth.reauthForPrivileged', 'Re-authenticate before privileged actions', 'accounts', [855, 856], 'bool', true),
    P('profile.timezone', 'Time zone', 'accounts', [27, 700], 'select', 'Australia/Sydney', { options: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Adelaide', 'Australia/Perth', 'Australia/Hobart', 'Australia/Darwin', 'Pacific/Auckland'] }),
    P('profile.language', 'Language', 'accounts', [28, 796], 'select', 'en', { options: ['en', 'es', 'de', 'fr'] }),
    P('profile.units', 'Measurement units', 'accounts', [798], 'select', 'metric', { options: ['metric', 'imperial'] }),
    P('profile.numberFormat', 'Number format region', 'accounts', [797], 'select', 'en-AU', { options: ['en-AU', 'en-US', 'en-GB', 'de-DE'] }),
    P('org.autoProvision', 'Provision and deprovision staff from the identity provider', 'accounts', [33, 34], 'bool', false),
    // Projects
    P('projects.stages', 'Configurable project stages', 'projects', [56], 'text', 'lead,quote,design,approval,procure,install,commission,claim,complete'),
    P('projects.stageEntryRequirements', 'Stage entry requirements enforced', 'projects', [57], 'bool', true),
    P('projects.stageExitApproval', 'Stage exits need approval', 'projects', [58, 100], 'bool', false),
    P('projects.archiveAfterDays', 'Archive completed projects after', 'projects', [54, 55], 'number', 365, { min: 30, max: 3650, unit: 'days' }),
    P('projects.budgetVarianceAlertPct', 'Budget variance alert threshold', 'projects', [78], 'number', 10, { min: 1, max: 100, unit: '%' }),
    P('projects.namingPattern', 'Project naming convention', 'projects', [93], 'text', '{customer} – {suburb} – {kw}kW'),
    P('projects.duplicateWindowDays', 'Duplicate project detection window', 'projects', [89], 'number', 30, { min: 1, max: 365, unit: 'days' }),
    P('projects.digestDay', 'Project status digest day', 'projects', [97], 'select', 'Monday', { options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] }),
    P('projects.cancellationApproval', 'Project cancellation needs approval', 'projects', [99], 'bool', true),
    // Compliance
    P('compliance.rulePack', 'Compliance rule pack version', 'compliance', [201], 'text', '2026.10'),
    P('compliance.jurisdiction', 'Default jurisdiction', 'compliance', [207], 'select', 'NSW', { options: ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'] }),
    P('compliance.rulesByInstallDate', 'Select rules by installation date', 'compliance', [208], 'bool', true),
    P('compliance.separationOfDuties', 'Designer cannot audit their own design', 'compliance', [222], 'bool', true),
    P('compliance.exceptionExpiryDays', 'Compliance exceptions expire after', 'compliance', [218], 'number', 180, { min: 7, max: 730, unit: 'days' }),
    P('compliance.evidenceMaxAgeDays', 'Evidence counts as fresh for', 'compliance', [224], 'number', 90, { min: 1, max: 730, unit: 'days' }),
    P('compliance.severityCritical', 'Severity that blocks sign-off', 'compliance', [235], 'select', 'major', { options: ['minor', 'major', 'critical'] }),
    P('compliance.licensedTextAccess', 'Who may read licensed standard text', 'compliance', [205, 437], 'select', 'licence holders', { options: ['nobody', 'licence holders', 'everyone'] }),
    // Documents
    P('documents.retentionYears', 'Retain documents for', 'documents', [306], 'number', 7, { min: 1, max: 25, unit: 'years' }),
    P('documents.maxUploadMb', 'Maximum upload size', 'documents', [301, 302, 303], 'number', 50, { min: 1, max: 500, unit: 'MB' }),
    P('documents.allowedTypes', 'Allowed upload types', 'documents', [885, 886], 'text', 'pdf,jpg,jpeg,png,heic,csv,xlsx,docx'),
    P('documents.scanUploads', 'Scan uploads for malware', 'documents', [304], 'bool', true),
    P('documents.encryptAtRest', 'Encrypt stored documents', 'documents', [305], 'bool', true),
    P('documents.shareLinkDays', 'Share links expire after', 'documents', [332], 'number', 14, { min: 1, max: 365, unit: 'days' }),
    P('documents.watermark', 'Watermark shared documents', 'documents', [330], 'bool', false),
    P('documents.ocrLanguage', 'OCR language', 'documents', [318], 'select', 'en', { options: ['en', 'es', 'de', 'fr', 'zh'] }),
    P('documents.lowConfidence', 'Extraction confidence below this goes to review', 'documents', [319, 320], 'number', 0.8, { min: 0.1, max: 1, step: 0.05 }),
    P('documents.expiryReminderDays', 'Remind before a document expires', 'documents', [327], 'number', 30, { min: 1, max: 365, unit: 'days' }),
    // Automation (minions)
    P('automation.mode', 'Run mode', 'automation', [399], 'select', 'full', { options: ['full', 'test', 'paused'] }),
    P('automation.emergencyStop', 'Global automation emergency stop', 'automation', [400], 'bool', false),
    P('automation.taskCostBudget', 'Cost budget per task', 'automation', [355], 'number', 0.5, { min: 0, max: 100, unit: '$' }),
    P('automation.taskTokenBudget', 'Token budget per task', 'automation', [356], 'number', 20000, { min: 100, max: 1000000 }),
    P('automation.taskTimeLimitH', 'Time limit per task', 'automation', [357], 'number', 24, { min: 1, max: 240, unit: 'h' }),
    P('automation.approvalCheckpoints', 'Approval checkpoint before external actions', 'automation', [358, 359, 360], 'bool', true),
    P('automation.dryRun', 'Dry-run external actions', 'automation', [361], 'bool', false),
    P('automation.retryMax', 'Retries per failed task', 'automation', [372], 'number', 3, { min: 0, max: 10 }),
    P('automation.retryBackoffS', 'Retry back-off base', 'automation', [373], 'number', 30, { min: 1, max: 3600, unit: 's' }),
    P('automation.workerConcurrency', 'Concurrent tasks per worker', 'automation', [369, 370], 'number', 1, { min: 1, max: 8 }),
    P('automation.queueAlertDepth', 'Alert when the queue is deeper than', 'automation', [367, 368], 'number', 400, { min: 10, max: 10000 }),
    P('automation.quarantineAfter', 'Quarantine a task after this many rejections', 'automation', [371], 'number', 3, { min: 1, max: 10 }),
    P('automation.citationsRequired', 'Outputs must cite sources', 'automation', [378, 379], 'bool', true),
    P('automation.injectionGuard', 'Prompt-injection detection on retrieved content', 'automation', [380, 381], 'bool', true),
    P('automation.redactSensitive', 'Redact sensitive data in outputs', 'automation', [382], 'bool', true),
    P('automation.provider', 'Model provider', 'automation', [383], 'select', 'anthropic', { options: ['anthropic', 'openai', 'local'] }),
    P('automation.providerFailover', 'Fail over to the next provider', 'automation', [384], 'bool', true),
    P('automation.modelPin', 'Pinned model version', 'automation', [385], 'text', 'claude-sonnet-4-5'),
    P('automation.memoryRetentionDays', 'Minion memory retention', 'automation', [391], 'number', 365, { min: 1, max: 3650, unit: 'days' }),
    P('automation.memoryIsolation', 'Isolate memory per project', 'automation', [394], 'bool', true),
    P('automation.schedule', 'Autonomous operation schedule (cron)', 'automation', [399], 'text', '7 3 * * *'),
    // Knowledge
    P('knowledge.staleDays', 'Knowledge counts as stale after', 'knowledge', [408, 409], 'number', 365, { min: 30, max: 3650, unit: 'days' }),
    P('knowledge.answerExpiryDays', 'Approved answers expire after', 'knowledge', [424], 'number', 180, { min: 7, max: 1095, unit: 'days' }),
    P('knowledge.minConfidence', 'Minimum answer confidence to show', 'knowledge', [414, 415], 'number', 0.5, { min: 0, max: 1, step: 0.05 }),
    P('knowledge.ingestRatePerMin', 'Ingestion rate limit', 'knowledge', [447], 'number', 30, { min: 1, max: 600, unit: '/min' }),
    P('knowledge.respectRobots', 'Honour robots policies when ingesting', 'knowledge', [446], 'bool', true),
    // Realm and accessibility
    P('realm.reducedMotion', 'Reduced motion', 'realm', [459, 787], 'bool', false, { hook: 'bodyClass:reduced-motion' }),
    P('realm.photosensitive', 'Photosensitivity-friendly effects (no bloom or flashes)', 'realm', [460], 'bool', false, { hook: 'bodyClass:no-flash' }),
    P('realm.highContrast', 'High-contrast interface', 'realm', [784], 'bool', false, { hook: 'bodyClass:high-contrast' }),
    P('realm.sunlightTheme', 'Sunlight-readable theme', 'realm', [775], 'bool', false, { hook: 'bodyClass:sunlight' }),
    P('realm.largeTargets', 'Large touch targets (glove mode)', 'realm', [773, 774], 'bool', false, { hook: 'bodyClass:large-targets' }),
    P('realm.textScale', 'Text size', 'realm', [785, 786], 'number', 1, { min: 0.8, max: 1.6, step: 0.1, hook: 'cssVar:--text-scale' }),
    P('realm.cameraSensitivity', 'Camera sensitivity', 'realm', [458], 'number', 1, { min: 0.2, max: 3, step: 0.1 }),
    P('realm.graphicsPreset', 'Graphics preset', 'realm', [482, 483], 'select', 'auto', { options: ['auto', 'low', 'medium', 'high'] }),
    P('realm.targetFps', 'Frame-rate target', 'realm', [484], 'number', 60, { min: 15, max: 120 }),
    P('realm.gpuBudgetMb', 'GPU memory budget', 'realm', [485], 'number', 512, { min: 128, max: 4096, unit: 'MB' }),
    P('realm.lodDistance', 'Avatar level-of-detail distance', 'realm', [490, 491], 'number', 60, { min: 10, max: 300, unit: 'm' }),
    P('realm.audioMaster', 'Master volume', 'realm', [492], 'number', 0.5, { min: 0, max: 1, step: 0.1 }),
    P('realm.audioCaptions', 'Audio captions', 'realm', [493], 'bool', false),
    P('realm.positionalAudio', 'Positional audio', 'realm', [494], 'bool', true),
    P('realm.twoD', 'Accessible 2D realm alternative', 'realm', [461], 'bool', false),
    // Notifications
    P('notify.quietFrom', 'Quiet hours start', 'notifications', [660], 'number', 21, { min: 0, max: 23, unit: 'h' }),
    P('notify.quietTo', 'Quiet hours end', 'notifications', [660], 'number', 7, { min: 0, max: 23, unit: 'h' }),
    P('notify.digest', 'Digest schedule', 'notifications', [661], 'select', 'daily', { options: ['off', 'hourly', 'daily', 'weekly'] }),
    P('notify.channels', 'Delivery channels', 'notifications', [653, 654, 655, 656], 'text', 'in-app,email'),
    P('notify.retryMax', 'Retry failed notifications', 'notifications', [658], 'number', 3, { min: 0, max: 10 }),
    P('notify.dedupeMinutes', 'Suppress duplicate notifications within', 'notifications', [659], 'number', 60, { min: 1, max: 1440, unit: 'min' }),
    P('notify.escalateAfterMinutes', 'Escalate unacknowledged critical alerts after', 'notifications', [664, 665], 'number', 30, { min: 5, max: 1440, unit: 'min' }),
    P('notify.businessDaysOnly', 'Deadlines count business days only', 'notifications', [698, 699], 'bool', true),
    P('notify.holidayRegion', 'Public holiday calendar', 'notifications', [699], 'select', 'NSW', { options: ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'] }),
    P('workflow.executionQuota', 'Workflow executions per day', 'notifications', [688], 'number', 1000, { min: 1, max: 100000 }),
    P('workflow.timeoutMinutes', 'Workflow step timeout', 'notifications', [681], 'number', 60, { min: 1, max: 10080, unit: 'min' }),
    // Reports
    P('reports.exportExpiryDays', 'Exports expire after', 'reports', [749], 'number', 7, { min: 1, max: 90, unit: 'days' }),
    P('reports.comparisonPeriod', 'Dashboard comparison period', 'reports', [714, 715], 'select', 'previous period', { options: ['none', 'previous period', 'same period last year'] }),
    P('reports.emissionsFactorVersion', 'Emissions factor version', 'reports', [736], 'text', 'NGA 2025'),
    // Mobile and offline
    P('offline.enabled', 'Offline workspaces', 'mobile', [751, 752, 753, 754, 755, 756], 'bool', true),
    P('offline.storageLimitMb', 'Offline storage limit', 'mobile', [757, 758], 'number', 500, { min: 50, max: 5000, unit: 'MB' }),
    P('offline.permissionDays', 'Offline permissions expire after', 'mobile', [764], 'number', 7, { min: 1, max: 90, unit: 'days' }),
    P('offline.encrypt', 'Encrypt offline data', 'mobile', [765, 766], 'bool', true),
    P('offline.lowBandwidth', 'Low-bandwidth mode', 'mobile', [767, 769], 'bool', false),
    P('offline.photoQuality', 'Compressed photo upload quality', 'mobile', [768], 'number', 0.7, { min: 0.3, max: 1, step: 0.1 }),
    P('offline.syncRetryS', 'Synchronisation retry interval', 'mobile', [760], 'number', 60, { min: 5, max: 3600, unit: 's' }),
    // Integrations
    P('api.rateLimitPerMin', 'API requests per minute per integration', 'integrations', [808], 'number', 600, { min: 10, max: 100000 }),
    P('api.credentialRotationDays', 'Rotate integration credentials every', 'integrations', [807], 'number', 90, { min: 7, max: 365, unit: 'days' }),
    P('api.webhookRetries', 'Webhook delivery retries', 'integrations', [819], 'number', 5, { min: 0, max: 20 }),
    P('api.deprecationNoticeDays', 'API deprecation notice period', 'integrations', [804, 805], 'number', 180, { min: 30, max: 730, unit: 'days' }),
    // Security and governance
    P('security.auditRetentionDays', 'Audit log retention', 'security', [859], 'number', 730, { min: 90, max: 3650, unit: 'days' }),
    P('security.auditForwardUrl', 'Forward audit logs to', 'security', [860], 'text', ''),
    P('security.dataRegion', 'Data residency region', 'security', [868], 'select', 'au', { options: ['au', 'nz', 'eu', 'us'] }),
    P('security.breachNotifyHours', 'Breach notification deadline', 'security', [874], 'number', 72, { min: 1, max: 720, unit: 'h' }),
    P('security.keyRotationDays', 'Rotate encryption keys every', 'security', [876], 'number', 365, { min: 30, max: 1095, unit: 'days' }),
    P('security.csrf', 'CSRF protection', 'security', [881], 'bool', true),
    P('security.cspNonce', 'Nonce-based content security policy', 'security', [882, 883], 'bool', true),
    P('security.ssrfAllowlist', 'Server-side request destinations allowed', 'security', [884], 'text', 'api.xero.com,api.servicem8.com,www.googleapis.com'),
    P('security.retentionEnforced', 'Enforce retention automatically', 'security', [896, 897, 898], 'bool', false),
    // Reliability
    P('reliability.loadShedAt', 'Shed load when the queue exceeds', 'reliability', [949], 'number', 5000, { min: 100, max: 1000000 }),
    P('reliability.circuitBreakerFailures', 'Open a circuit breaker after failures', 'reliability', [950], 'number', 5, { min: 1, max: 100 }),
    P('reliability.backupEveryHours', 'Backup interval', 'reliability', [930], 'number', 24, { min: 1, max: 168, unit: 'h' }),
    P('reliability.storageForecastDays', 'Storage capacity forecast horizon', 'reliability', [929], 'number', 90, { min: 7, max: 730, unit: 'days' }),
    P('reliability.canaryPct', 'Canary release share', 'reliability', [940], 'number', 10, { min: 1, max: 50, unit: '%' }),
    // Product administration
    P('admin.demoDataLabelled', 'Label demonstration data', 'testing', [953, 954, 956], 'bool', true),
    P('admin.usageAnalytics', 'Product usage analytics', 'testing', [968], 'bool', false),
    P('admin.storageQuotaGb', 'Storage quota', 'testing', [969, 970], 'number', 100, { min: 1, max: 10000, unit: 'GB' }),
    P('admin.computeQuotaHours', 'Compute quota per month', 'testing', [971], 'number', 500, { min: 1, max: 100000, unit: 'h' }),
    P('admin.supportAccessHours', 'Time-limited support access', 'testing', [965, 966], 'number', 24, { min: 1, max: 168, unit: 'h' })
];
export const POLICY_BY_ID = Object.fromEntries(POLICY_DEFS.map((p) => [p.id, p]));
export const POLICY_DOMAINS = [...new Set(POLICY_DEFS.map((p) => p.domain))];

/** Feature flags: named switches with an owner and an expiry so stale flags surface. */
export const FLAG_DEFS = [
    { id: 'flag.programmeWindow', title: 'Programme window', default: true }, { id: 'flag.registersWindow', title: 'Registers window', default: true }, { id: 'flag.policiesWindow', title: 'Policies window', default: true },
    { id: 'flag.crowd', title: 'Crowd in the world', default: true }, { id: 'flag.bloom', title: 'Bloom post-processing', default: true }, { id: 'flag.llmDialogue', title: 'Language-model dialogue', default: true },
    { id: 'flag.socialPublishing', title: 'Social publishing (server-gated)', default: false }, { id: 'flag.twoDRealm', title: '2D realm alternative', default: false }
];

export function coerce(def, value) {
    if (def.type === 'number') { const n = Number(value); if (!Number.isFinite(n)) return { ok: false, error: 'must be a number' }; if (def.min !== undefined && n < def.min) return { ok: false, error: `at least ${def.min}` }; if (def.max !== undefined && n > def.max) return { ok: false, error: `at most ${def.max}` }; return { ok: true, value: n }; }
    if (def.type === 'bool') return { ok: true, value: value === true || value === 'true' || value === 1 || value === 'on' };
    if (def.type === 'select') return def.options.includes(String(value)) ? { ok: true, value: String(value) } : { ok: false, error: `one of ${def.options.join(', ')}` };
    return { ok: true, value: String(value ?? '') };
}

export class Policies {
    constructor({ store, now = () => Date.now(), user = 'you' } = {}) { this.store = store; this.now = now; this.user = user; this.listeners = new Set(); }
    def(id) { const d = POLICY_BY_ID[id]; if (!d) throw new Error(`unknown policy ${id}`); return d; }
    get(id) { const d = this.def(id); const v = this.store.get(`policies.values.${id}`); return v === undefined ? d.default : v; }
    isDefault(id) { return this.store.get(`policies.values.${id}`) === undefined; }
    set(id, value, { reason = '' } = {}) {
        const d = this.def(id); const c = coerce(d, value); if (!c.ok) return { ok: false, error: c.error };
        const before = this.get(id); if (before === c.value) return { ok: true, value: c.value, changed: false };
        this.store.set(`policies.values.${id}`, c.value); this.store.push('policies.history', { at: this.now(), by: this.user, id, from: before, to: c.value, reason }, 500);
        for (const fn of this.listeners) fn({ id, value: c.value, def: d });
        return { ok: true, value: c.value, changed: true };
    }
    reset(id) { const before = this.get(id); this.store.set(`policies.values.${id}`, undefined); this.store.push('policies.history', { at: this.now(), by: this.user, id, from: before, to: this.def(id).default, reason: 'reset' }, 500); const v = this.get(id); for (const fn of this.listeners) fn({ id, value: v, def: this.def(id) }); return v; }
    history(id = null) { const h = this.store.get('policies.history', []); return id ? h.filter((e) => e.id === id) : h; }
    onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    list(domain = null) { return POLICY_DEFS.filter((d) => !domain || d.domain === domain).map((d) => ({ ...d, value: this.get(d.id), isDefault: this.isDefault(d.id) })); }
    /** Drift: every policy whose value differs from its default, with when and who changed it last. */
    drift() { return POLICY_DEFS.filter((d) => !this.isDefault(d.id)).map((d) => { const last = this.history(d.id).slice(-1)[0]; return { id: d.id, title: d.title, value: this.get(d.id), default: d.default, at: last ? last.at : null, by: last ? last.by : null }; }); }
    // --- feature flags ---
    flag(id) { const f = FLAG_DEFS.find((x) => x.id === id); const s = this.store.get(`policies.flags.${id}`); if (s && s.expires && s.expires < this.now()) return Boolean(f ? f.default : false); return s ? Boolean(s.on) : Boolean(f ? f.default : false); }
    setFlag(id, on, { expiresInDays = null, owner = null } = {}) { const prev = this.flag(id); const rec = { on: Boolean(on), owner: owner || this.user, since: this.now(), expires: expiresInDays ? this.now() + expiresInDays * 86400000 : null }; this.store.set(`policies.flags.${id}`, rec); this.store.push('policies.history', { at: this.now(), by: this.user, id, from: prev, to: rec.on, reason: 'flag' }, 500); return rec; }
    flags() { return FLAG_DEFS.map((f) => { const s = this.store.get(`policies.flags.${f.id}`) || null; return { ...f, on: this.flag(f.id), set: s, expired: Boolean(s && s.expires && s.expires < this.now()), expiringSoon: Boolean(s && s.expires && s.expires >= this.now() && s.expires - this.now() < 7 * 86400000) }; }); }
    // --- enforcement helpers ---
    /** True inside quiet hours (hour of day, wraps past midnight). */
    quiet(hour) { const from = this.get('notify.quietFrom'); const to = this.get('notify.quietTo'); if (from === to) return false; return from < to ? hour >= from && hour < to : hour >= from || hour < to; }
    /** Retry back-off in seconds for attempt n (1-based), exponential, capped at one hour. */
    backoff(attempt) { return Math.min(3600, this.get('automation.retryBackoffS') * 2 ** Math.max(0, attempt - 1)); }
    /** Business-day deadline: add working days, skipping weekends (and nothing else without a holiday table). */
    deadline(fromMs, days) { const d = new Date(fromMs); let left = days; const businessOnly = this.get('notify.businessDaysOnly'); while (left > 0) { d.setUTCDate(d.getUTCDate() + 1); if (!businessOnly || (d.getUTCDay() !== 0 && d.getUTCDay() !== 6)) left--; } return d.getTime(); }
    /** Whether automation may act right now (mode, emergency stop). */
    automationAllowed() { return !this.get('automation.emergencyStop') && this.get('automation.mode') !== 'paused'; }
    /** Apply the hooks to a document body: classes and CSS variables. Returns what was applied. */
    applyHooks(body) {
        const applied = {};
        for (const d of POLICY_DEFS) { if (!d.hook) continue; const [kind, name] = d.hook.split(':'); const v = this.get(d.id); if (kind === 'bodyClass') { body.classList.toggle(name, Boolean(v)); applied[name] = Boolean(v); } else if (kind === 'cssVar') { body.style.setProperty(name, String(v)); applied[name] = v; } }
        return applied;
    }
    summary() { return { policies: POLICY_DEFS.length, changed: this.drift().length, flags: FLAG_DEFS.length, flagsOn: this.flags().filter((f) => f.on).length, items: new Set(POLICY_DEFS.flatMap((p) => p.items)).size, history: this.history().length }; }
    export() { return JSON.stringify({ values: Object.fromEntries(this.drift().map((d) => [d.id, d.value])), flags: Object.fromEntries(FLAG_DEFS.map((f) => [f.id, this.store.get(`policies.flags.${f.id}`) || null]).filter(([, v]) => v)) }, null, 2); }
}

/** The programme items the policies implement. */
export function policyItems() { return new Set(POLICY_DEFS.flatMap((p) => p.items)); }

const mem = () => { const data = {}; return { get(p, f) { const v = p.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), data); return v === undefined ? f : v; }, set(p, v) { const ks = p.split('.'); let o = data; for (const k of ks.slice(0, -1)) { if (!o[k] || typeof o[k] !== 'object') o[k] = {}; o = o[k]; } o[ks[ks.length - 1]] = v; return v; }, push(p, item, limit) { const l = [...(this.get(p) || []), item]; if (l.length > limit) l.splice(0, l.length - limit); return this.set(p, l); } }; };
export const FEATURES = [
    { id: 'policies.defs', title: 'Over 120 typed policies and feature flags covering the programme, unique ids, sane defaults', test: () => { const ids = new Set(POLICY_DEFS.map((d) => d.id)); return POLICY_DEFS.length >= 120 && ids.size === POLICY_DEFS.length && POLICY_DEFS.every((d) => coerce(d, d.default).ok && d.items.length) && policyItems().size >= 150 && FLAG_DEFS.length >= 8; } },
    { id: 'policies.setHistory', title: 'Set with coercion and bounds, change history with who and when, reset, drift report', test: () => { const p = new Policies({ store: mem(), now: () => 1700000000000, user: 'ava' }); const bad = p.set('session.timeoutMinutes', 2); const ok = p.set('session.timeoutMinutes', '45'); const same = p.set('session.timeoutMinutes', 45); const b = p.set('auth.mfaRequired', 'true'); const sel = p.set('compliance.jurisdiction', 'XX'); const drift = p.drift(); p.reset('session.timeoutMinutes'); return !bad.ok && ok.ok && ok.value === 45 && same.changed === false && b.value === true && !sel.ok && drift.length === 2 && drift[0].by === 'ava' && p.get('session.timeoutMinutes') === 60 && p.history('session.timeoutMinutes').length === 2 && p.history().length === 3; } },
    { id: 'policies.flags', title: 'Feature flags default, switch, expire and report expiring soon', test: () => { let now = 1700000000000; const p = new Policies({ store: mem(), now: () => now }); const d = p.flag('flag.twoDRealm'); p.setFlag('flag.twoDRealm', true, { expiresInDays: 3 }); const on = p.flag('flag.twoDRealm'); const soon = p.flags().find((f) => f.id === 'flag.twoDRealm').expiringSoon; now += 4 * 86400000; const off = p.flag('flag.twoDRealm'); const expired = p.flags().find((f) => f.id === 'flag.twoDRealm').expired; return d === false && on && soon && !off && expired; } },
    { id: 'policies.enforce', title: 'Quiet hours wrap midnight, exponential back-off caps, business-day deadlines skip weekends, emergency stop halts automation', test: () => { const p = new Policies({ store: mem() }); const q = p.quiet(22) && p.quiet(3) && !p.quiet(12); p.set('notify.quietFrom', 9); p.set('notify.quietTo', 17); const q2 = p.quiet(12) && !p.quiet(20); const bo = p.backoff(1) === 30 && p.backoff(4) === 240 && p.backoff(20) === 3600; const fri = Date.parse('2026-10-16T00:00:00Z'); const dl = new Date(p.deadline(fri, 1)).toISOString().slice(0, 10) === '2026-10-19'; const a = p.automationAllowed(); p.set('automation.emergencyStop', true); return q && q2 && bo && dl && a && !p.automationAllowed(); } },
    { id: 'policies.hooks', title: 'Accessibility policies apply as body classes and CSS variables', dom: true, test: () => { const p = new Policies({ store: mem() }); const body = document.createElement('div'); p.set('realm.highContrast', true); p.set('realm.textScale', 1.3); const a = p.applyHooks(body); return a['high-contrast'] === true && body.classList.contains('high-contrast') && !body.classList.contains('reduced-motion') && body.style.getPropertyValue('--text-scale') === '1.3'; } }
];

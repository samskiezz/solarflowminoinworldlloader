/**
 * Internationalisation: message catalogues with fallback to English, and
 * Intl-based number/currency/date formatting. The engineering stays
 * jurisdiction-specific (see domain/jurisdictions.js); the chrome is global.
 */
export const MESSAGES = {
    en: {
        'app.title': 'SolarFlow Realm Workstation', 'app.tagline': 'Design, verify and hand over compliant solar + storage systems',
        'nav.dashboard': 'Dashboard', 'nav.character': 'Character', 'nav.crew': 'Crew', 'nav.quests': 'Quests', 'nav.inventory': 'Product vault', 'nav.spellbook': 'Calculators', 'nav.map': 'Map',
        'nav.journal': 'Journal', 'nav.codex': 'Codex', 'nav.achievements': 'Achievements', 'nav.jobs': 'Jobs', 'nav.settings': 'Settings', 'nav.help': 'Help', 'nav.chat': 'Crew chat', 'nav.market': 'Market',
        'nav.reports': 'Reports', 'nav.checklists': 'Checklists', 'nav.commissioning': 'Commissioning', 'nav.labels': 'Labels', 'nav.loads': 'Loads', 'nav.selftest': 'System check',
        'clock.paused': 'Paused', 'clock.day': 'Day {day}', 'credits': 'Credits', 'level': 'Level', 'xp': 'XP',
        'action.save': 'Save', 'action.cancel': 'Cancel', 'action.close': 'Close', 'action.run': 'Run', 'action.export': 'Export', 'action.import': 'Import', 'action.reset': 'Reset', 'action.new': 'New', 'action.delete': 'Delete', 'action.search': 'Search',
        'status.pass': 'Pass', 'status.fail': 'Fail', 'status.pending': 'Pending', 'status.na': 'N/A',
        'toast.saved': 'Saved', 'toast.welcome': 'Welcome back, {name}', 'toast.achievement': 'Achievement unlocked: {title}',
        'window.closeHint': 'Close (Esc)', 'window.minimizeHint': 'Minimise', 'window.maximizeHint': 'Maximise',
        'onboarding.title': 'Welcome to the Realm', 'onboarding.body': 'Press the hotkeys or the hotbar to open windows. Your crew works the jobs you create; every calculation cites the clause it comes from.'
    },
    de: { 'app.title': 'SolarFlow Realm Arbeitsplatz', 'nav.dashboard': 'Übersicht', 'nav.character': 'Charakter', 'nav.crew': 'Team', 'nav.quests': 'Aufgaben', 'nav.inventory': 'Produkttresor', 'nav.spellbook': 'Rechner', 'nav.map': 'Karte', 'nav.journal': 'Journal', 'nav.codex': 'Kodex', 'nav.achievements': 'Erfolge', 'nav.jobs': 'Projekte', 'nav.settings': 'Einstellungen', 'nav.help': 'Hilfe', 'nav.chat': 'Team-Chat', 'nav.market': 'Markt', 'nav.reports': 'Berichte', 'nav.checklists': 'Checklisten', 'nav.commissioning': 'Inbetriebnahme', 'nav.labels': 'Etiketten', 'nav.loads': 'Lasten', 'nav.selftest': 'Systemprüfung', 'clock.paused': 'Pausiert', 'clock.day': 'Tag {day}', 'credits': 'Guthaben', 'level': 'Stufe', 'action.save': 'Speichern', 'action.cancel': 'Abbrechen', 'action.close': 'Schließen', 'action.run': 'Ausführen', 'action.export': 'Exportieren', 'action.import': 'Importieren', 'action.reset': 'Zurücksetzen', 'action.new': 'Neu', 'action.delete': 'Löschen', 'action.search': 'Suchen', 'status.pass': 'Bestanden', 'status.fail': 'Nicht bestanden', 'toast.saved': 'Gespeichert', 'toast.welcome': 'Willkommen zurück, {name}' },
    es: { 'app.title': 'Estación SolarFlow Realm', 'nav.dashboard': 'Panel', 'nav.character': 'Personaje', 'nav.crew': 'Equipo', 'nav.quests': 'Misiones', 'nav.inventory': 'Bóveda de productos', 'nav.spellbook': 'Calculadoras', 'nav.map': 'Mapa', 'nav.journal': 'Diario', 'nav.codex': 'Códice', 'nav.achievements': 'Logros', 'nav.jobs': 'Trabajos', 'nav.settings': 'Ajustes', 'nav.help': 'Ayuda', 'nav.chat': 'Chat del equipo', 'nav.market': 'Mercado', 'nav.reports': 'Informes', 'nav.checklists': 'Listas', 'nav.commissioning': 'Puesta en marcha', 'nav.labels': 'Etiquetas', 'nav.loads': 'Cargas', 'nav.selftest': 'Comprobación', 'clock.paused': 'Pausado', 'clock.day': 'Día {day}', 'credits': 'Créditos', 'level': 'Nivel', 'action.save': 'Guardar', 'action.cancel': 'Cancelar', 'action.close': 'Cerrar', 'action.run': 'Ejecutar', 'action.export': 'Exportar', 'action.import': 'Importar', 'action.reset': 'Restablecer', 'action.new': 'Nuevo', 'action.delete': 'Eliminar', 'action.search': 'Buscar', 'status.pass': 'Aprobado', 'status.fail': 'Fallido', 'toast.saved': 'Guardado', 'toast.welcome': 'Bienvenido de nuevo, {name}' },
    fr: { 'app.title': 'Poste SolarFlow Realm', 'nav.dashboard': 'Tableau de bord', 'nav.character': 'Personnage', 'nav.crew': 'Équipe', 'nav.quests': 'Quêtes', 'nav.inventory': 'Coffre produits', 'nav.spellbook': 'Calculateurs', 'nav.map': 'Carte', 'nav.journal': 'Journal', 'nav.codex': 'Codex', 'nav.achievements': 'Succès', 'nav.jobs': 'Chantiers', 'nav.settings': 'Réglages', 'nav.help': 'Aide', 'nav.chat': 'Chat équipe', 'nav.market': 'Marché', 'nav.reports': 'Rapports', 'nav.checklists': 'Listes', 'nav.commissioning': 'Mise en service', 'nav.labels': 'Étiquettes', 'nav.loads': 'Charges', 'nav.selftest': 'Vérification', 'clock.paused': 'En pause', 'clock.day': 'Jour {day}', 'credits': 'Crédits', 'level': 'Niveau', 'action.save': 'Enregistrer', 'action.cancel': 'Annuler', 'action.close': 'Fermer', 'action.run': 'Lancer', 'action.export': 'Exporter', 'action.import': 'Importer', 'action.reset': 'Réinitialiser', 'action.new': 'Nouveau', 'action.delete': 'Supprimer', 'action.search': 'Rechercher', 'status.pass': 'Conforme', 'status.fail': 'Non conforme', 'toast.saved': 'Enregistré', 'toast.welcome': 'Bon retour, {name}' },
    ja: { 'app.title': 'SolarFlow Realm ワークステーション', 'nav.dashboard': 'ダッシュボード', 'nav.character': 'キャラクター', 'nav.crew': 'クルー', 'nav.quests': 'クエスト', 'nav.inventory': '製品保管庫', 'nav.spellbook': '計算ツール', 'nav.map': 'マップ', 'nav.journal': '日誌', 'nav.codex': '規格集', 'nav.achievements': '実績', 'nav.jobs': '案件', 'nav.settings': '設定', 'nav.help': 'ヘルプ', 'nav.chat': 'クルーチャット', 'nav.market': 'マーケット', 'nav.reports': 'レポート', 'nav.checklists': 'チェックリスト', 'nav.commissioning': '試運転', 'nav.labels': 'ラベル', 'nav.loads': '負荷', 'nav.selftest': 'システム確認', 'clock.paused': '一時停止', 'clock.day': '{day}日目', 'credits': 'クレジット', 'level': 'レベル', 'action.save': '保存', 'action.cancel': 'キャンセル', 'action.close': '閉じる', 'action.run': '実行', 'action.export': '書き出し', 'action.import': '読み込み', 'action.reset': 'リセット', 'action.new': '新規', 'action.delete': '削除', 'action.search': '検索', 'status.pass': '合格', 'status.fail': '不合格', 'toast.saved': '保存しました', 'toast.welcome': 'おかえりなさい、{name}' },
    zh: { 'app.title': 'SolarFlow Realm 工作站', 'nav.dashboard': '仪表板', 'nav.character': '角色', 'nav.crew': '团队', 'nav.quests': '任务', 'nav.inventory': '产品库', 'nav.spellbook': '计算器', 'nav.map': '地图', 'nav.journal': '日志', 'nav.codex': '标准库', 'nav.achievements': '成就', 'nav.jobs': '项目', 'nav.settings': '设置', 'nav.help': '帮助', 'nav.chat': '团队聊天', 'nav.market': '市场', 'nav.reports': '报告', 'nav.checklists': '检查表', 'nav.commissioning': '调试', 'nav.labels': '标签', 'nav.loads': '负荷', 'nav.selftest': '系统检查', 'clock.paused': '已暂停', 'clock.day': '第 {day} 天', 'credits': '积分', 'level': '等级', 'action.save': '保存', 'action.cancel': '取消', 'action.close': '关闭', 'action.run': '运行', 'action.export': '导出', 'action.import': '导入', 'action.reset': '重置', 'action.new': '新建', 'action.delete': '删除', 'action.search': '搜索', 'status.pass': '通过', 'status.fail': '未通过', 'toast.saved': '已保存', 'toast.welcome': '欢迎回来，{name}' }
};

export const LOCALES = [
    { id: 'en', label: 'English', currency: 'AUD' }, { id: 'de', label: 'Deutsch', currency: 'EUR' }, { id: 'es', label: 'Español', currency: 'EUR' },
    { id: 'fr', label: 'Français', currency: 'EUR' }, { id: 'ja', label: '日本語', currency: 'JPY' }, { id: 'zh', label: '中文', currency: 'CNY' }
];

let current = 'en';
const listeners = new Set();

export function locale() { return current; }
export function setLocale(id) {
    if (!MESSAGES[id]) return false;
    current = id;
    for (const fn of listeners) { try { fn(id); } catch (e) { /* ignore */ } }
    return true;
}
export function onLocaleChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function interpolate(template, vars = {}) {
    return String(template).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
}

export function t(key, vars = {}, loc = current) {
    const template = (MESSAGES[loc] && MESSAGES[loc][key]) ?? MESSAGES.en[key] ?? key;
    return interpolate(template, vars);
}

export function coverage(loc) {
    const base = Object.keys(MESSAGES.en).length;
    const have = Object.keys(MESSAGES[loc] || {}).filter((k) => k in MESSAGES.en).length;
    return Math.round((have / base) * 100);
}

const intlLocale = (loc) => ({ en: 'en-AU', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', ja: 'ja-JP', zh: 'zh-CN' }[loc] || 'en-AU');
export function formatNumber(value, { decimals = 0, loc = current } = {}) {
    if (!Number.isFinite(Number(value))) return '–';
    return new Intl.NumberFormat(intlLocale(loc), { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Number(value));
}
export function formatCurrency(value, { currency = 'AUD', loc = current, decimals = 0 } = {}) {
    if (!Number.isFinite(Number(value))) return '–';
    return new Intl.NumberFormat(intlLocale(loc), { style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Number(value));
}
export function formatDate(value, { loc = current, withTime = false } = {}) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '–';
    return new Intl.DateTimeFormat(intlLocale(loc), withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(d);
}
export function relativeTime(fromMs, toMs = Date.now()) {
    const diff = Math.round((fromMs - toMs) / 1000);
    const abs = Math.abs(diff);
    const unit = abs < 60 ? 'second' : abs < 3600 ? 'minute' : abs < 86400 ? 'hour' : 'day';
    const div = { second: 1, minute: 60, hour: 3600, day: 86400 }[unit];
    return new Intl.RelativeTimeFormat(intlLocale(current), { numeric: 'auto' }).format(Math.round(diff / div), unit);
}

export const FEATURES = [
    { id: 'core.i18n.translate', title: 'Message lookup with interpolation', test: () => t('clock.day', { day: 3 }) === 'Day 3' && t('missing.key') === 'missing.key' },
    { id: 'core.i18n.locales', title: 'Six locales with English fallback', test: () => { const prev = locale(); setLocale('de'); const ok = t('nav.crew') === 'Team' && t('onboarding.title') === 'Welcome to the Realm'; setLocale(prev); return ok && LOCALES.length === 6 && !setLocale('xx'); } },
    { id: 'core.i18n.coverage', title: 'Translation coverage metric', test: () => coverage('en') === 100 && coverage('fr') > 40 && coverage('fr') < 100 },
    { id: 'core.i18n.number', title: 'Locale-aware number formatting', test: () => formatNumber(1234567.891, { decimals: 1 }) === '1,234,567.9' && formatNumber(1234.5, { loc: 'de' }).includes('1.23') },
    { id: 'core.i18n.currency', title: 'Currency formatting', test: () => formatCurrency(1500).startsWith('$') && formatCurrency(1500, { currency: 'EUR', loc: 'de' }).includes('€') },
    { id: 'core.i18n.date', title: 'Date formatting', test: () => /2026/.test(formatDate('2026-03-01')) && formatDate('bad') === '–' },
    { id: 'core.i18n.relative', title: 'Relative time ("in 2 hours")', test: () => /hour|2/.test(relativeTime(Date.now() + 7200000)) },
    { id: 'core.i18n.listeners', title: 'Locale change notifications', test: () => { let n = 0; const off = onLocaleChange(() => n++); const prev = locale(); setLocale('es'); setLocale(prev); off(); return n === 2; } }
];

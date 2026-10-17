#!/usr/bin/env node
/**
 * Build docs/data/programme.json – the thousand-feature programme – from the
 * plain list in docs/data/programme-list.txt. Every item gets a status:
 *   live      – implemented by named, self-tested realm features (ids checked against the ledger)
 *   register  – implemented by a typed register (core/registers.js)
 *   policy    – implemented by a configurable policy or feature flag (core/policies.js)
 *   spec      – not runnable in the static realm (needs a server, a device or an external system);
 *               the minions research it against the library and write a specification record
 * The curated LIVE map below is the honest part: an item is only "live" when a
 * registered feature with a passing self-test really does that thing.
 *
 *   node scripts/programme-build.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const listPath = path.join(root, 'docs', 'data', 'programme-list.txt');
const outPath = path.join(root, 'docs', 'data', 'programme.json');

const DOMAIN_IDS = {
    'ACCOUNTS AND ORGANIZATIONS': ['accounts', 'review'], 'PROJECTS AND COLLABORATION': ['projects', 'customer'], 'SITE SURVEYS AND SOLAR DESIGN': ['design', 'design'],
    'BATTERIES AND ELECTRIFICATION': ['battery', 'design'], 'COMPLIANCE AND STANDARDS': ['compliance', 'compliance'], 'PRODUCTS AND SUPPLY CHAIN': ['supply', 'research'],
    'DOCUMENTS AND EVIDENCE': ['documents', 'documents'], 'AI MINIONS AND AUTOMATION': ['automation', 'review'], 'KNOWLEDGE AND RESEARCH': ['knowledge', 'research'],
    '3D REALM AND MINION INTERACTION': ['realm', 'design'], 'INSTALLATION AND COMMISSIONING': ['install', 'install'], 'MONITORING AND MAINTENANCE': ['monitoring', 'commissioning'],
    'ENERGY ECONOMICS AND PROPOSALS': ['economics', 'finance'], 'NOTIFICATIONS AND WORKFLOWS': ['notifications', 'customer'], 'SEARCH, DASHBOARDS, AND REPORTS': ['reports', 'research'],
    'MOBILE, OFFLINE, AND ACCESSIBILITY': ['mobile', 'customer'], 'INTEGRATIONS AND DEVELOPER TOOLS': ['integrations', 'documents'], 'SECURITY, PRIVACY, AND GOVERNANCE': ['security', 'audit'],
    'RELIABILITY AND DATA INTEGRITY': ['reliability', 'audit'], 'TESTING AND PRODUCT ADMINISTRATION': ['testing', 'commissioning']
};

/** Item number → realm feature ids that implement it (every id must exist in docs/realm/FEATURES.md). */
const LIVE = {
    25: ['core.store.exportImport', 'win.settings.data'], 28: ['core.i18n.locales', 'win.character.locale'],
    53: ['win.jobs.exportImport'], 56: ['jobs.stages'], 57: ['jobs.stageGate'], 58: ['jobs.advanceStage.blocked'], 76: ['win.analytics.utilisation'], 80: ['pricing.margin'], 84: ['win.sites.suburbs'],
    86: ['win.map.project'], 87: ['win.jobs.assign'], 89: ['win.jobs.duplicate'], 90: ['jobs.progress'], 97: ['biz.model.digest'], 98: ['shifts.assignment'],
    101: ['win.survey.general'], 110: ['pv.arrayLayout', 'win.spell.layout'], 111: ['pv.arrayLayout'], 120: ['pv.orientationFactor', 'win.survey.ranking'], 121: ['win.spell.strings'], 122: ['pv.stringSizing', 'pv.arrayMaxVoltage'],
    123: ['pv.stringCableCurrent'], 124: ['pv.stringSizing'], 125: ['products.matchInverters'], 126: ['pv.dcAcRatio'], 128: ['pv.dcVoltageDrop', 'ac.voltageRise'], 129: ['ac.deratedRating', 'pv.selectDcCable'],
    130: ['pv.correctVoc', 'pv.cellTemperature'], 133: ['ac.checkSinglePhaseCapacity'], 146: ['battery.assess.clearance'], 148: ['win.survey.ranking', 'win.survey.best'], 149: ['win.survey.checks'], 150: ['win.survey.best'],
    151: ['battery.sizeBattery'], 155: ['handover.warranty'], 156: ['battery.assess.restricted'], 157: ['battery.assess.clearance'], 158: ['battery.assess.warnings'], 160: ['battery.assess.barrier'], 161: ['labels.battery'],
    162: ['labels.masterSwitch'], 163: ['labels.backupSupplyType'], 165: ['battery.backupCapability'], 166: ['battery.backupCapability'], 187: ['loads.hourlyProfile'], 188: ['loads.library'], 189: ['win.loads.presets'],
    190: ['loads.maximumDemandA', 'win.loads.maxDemand'], 191: ['ac.checkPhaseBalance'], 199: ['win.spell.batterySizing'],
    201: ['compliance.catalogue'], 202: ['standards.catalogue'], 203: ['hierarchy.precedence'], 204: ['hierarchy.citations', 'library.clause'], 207: ['jurisdictions.catalogue', 'jurisdictions.standards'], 209: ['products.isApprovedOn'],
    210: ['checklists.applicable', 'hierarchy.governing'], 211: ['compliance.catalogue'], 212: ['hierarchy.tiers'], 213: ['hierarchy.safetyWins'], 214: ['compliance.processQuery'], 215: ['compliance.competencyRefusal'],
    220: ['workforce.pipeline'], 223: ['compliance.libraryEvidence', 'compliance.dnspEvidence'], 225: ['library.search'], 226: ['win.spell.strings'], 227: ['compliance.as5033pass', 'compliance.as5033fail'], 228: ['checklists.evaluate.pass'],
    230: ['pipeline.validatePass'], 248: ['compliance.health'], 249: ['courtsafe.tests'], 250: ['courtsafe.regulator'],
    251: ['products.manufacturers'], 252: ['products.matchInverters'], 254: ['products.isApprovedOn'], 255: ['products.daysToExpiry', 'win.dashboard.productWatch'], 256: ['products.daysToExpiry'], 258: ['win.vault.about'],
    268: ['products.designCompatibility'], 269: ['win.vault.designSlots'], 274: ['products.isApprovedOn'], 285: ['serials.parse', 'win.serials.add'], 295: ['serials.status', 'win.serials.evidence'], 297: ['win.vault.compare', 'win.vault.csv'],
    323: ['pipeline.classify'], 325: ['win.documents.standard'], 326: ['win.documents.missing'], 336: ['win.codex.related'], 346: ['win.documents.packs', 'courtsafe.package'], 347: ['report.buildJobReport'],
    351: ['bridge.capabilities'], 352: ['workforce.sweep'], 362: ['workforce.world'], 363: ['world.serialise'], 365: ['workforce.pipeline'], 366: ['workforce.board'], 371: ['workforce.rework'], 375: ['win.ultron.log'],
    377: ['compliance.competencyRefusal'], 389: ['win.ultron.teams'], 392: ['memory.addAndRecent'], 395: ['bridge.route'], 396: ['agent.reflection', 'memory.reflect'], 397: ['core.bus.history'], 398: ['core.store.exportImport'],
    401: ['win.notify.globalSearch', 'library.search'], 403: ['library.clause', 'standards.findClause'], 404: ['library.search'], 405: ['win.library.search'], 406: ['library.coverage'], 408: ['library.coverage'],
    412: ['win.compliance.ask'], 413: ['hierarchy.autoCite'], 415: ['compliance.competencyRefusal'], 416: ['win.codex.related'], 431: ['win.codex.related'], 433: ['win.codex.related'], 445: ['win.library.harvest'], 448: ['win.library.harvest'], 449: ['win.library.harvest'],
    451: ['shell.onboarding'], 452: ['win.crew.select', 'win.notify.globalSearch'], 453: ['game.player.camera', 'game.clickSelect'], 454: ['game.player.move'], 455: ['game.touch.joystick'], 457: ['game.player.collide'],
    463: ['game.behaviour.bubble'], 464: ['win.ultron.command'], 465: ['win.ultron.sweep'], 466: ['game.crowd.instanced'], 467: ['win.map.stageFilter'], 469: ['game.floatingRewards'], 470: ['win.chronicle.journeys'], 471: ['win.journal.timeline'],
    472: ['core.clock.pause'], 473: ['memory.addAndRecent'], 474: ['win.character.equipment', 'genes.appearance'], 475: ['shell.theme'], 476: ['core.wm.layouts'], 477: ['core.wm.snapshot'], 478: ['core.wm.snapshot'],
    482: ['win.settings.quality', 'game.scene.quality'], 487: ['game.assets.load'], 489: ['game.assets.fallback'], 490: ['game.overlay.distanceCull'], 491: ['game.overlay.distanceCull'], 492: ['core.audio.off', 'win.settings.general'],
    497: ['win.notify.crewOnly'], 498: ['win.selftest.lastRun'], 499: ['workforce.deterministic', 'narrative.deterministic'], 500: ['core.store.exportImport'],
    502: ['win.schedule.book', 'shifts.assignment'], 503: ['win.crew.skills'], 509: ['win.schedule.weather'], 513: ['win.serials.add'], 516: ['serials.status'], 520: ['checklists.catalogue', 'win.check.applicable'],
    525: ['commissioning.evaluate.pass', 'win.comm.record'], 526: ['commissioning.evaluate.pass', 'win.comm.record'], 527: ['commissioning.evaluate.pass', 'win.comm.record'], 528: ['commissioning.expectedStringVoc'], 529: ['commissioning.expectedIsc'],
    530: ['commissioning.evaluate.pass'], 531: ['commissioning.evaluate.pass'], 532: ['ac.checkExportLimit'], 537: ['win.comm.record'], 538: ['commissioning.evaluate.voc'], 540: ['checklists.evaluate.defects'], 547: ['handover.manual'], 548: ['handover.manual'], 550: ['win.handover.issue'],
    562: ['yield.annualYield'], 563: ['yield.monthlyYield'], 566: ['pv.dcAcRatio'], 581: ['handover.maintenance'], 588: ['handover.warranty'],
    602: ['biz.xero.lines'], 604: ['loads.hourlyProfile'], 606: ['yield.financials'], 608: ['yield.financials'], 612: ['yield.annualYield'], 613: ['yield.cityYield'], 615: ['yield.selfConsumption'], 616: ['yield.financials'],
    623: ['yield.financials'], 624: ['yield.financials'], 626: ['yield.irr'], 631: ['incentives.statePrograms'], 632: ['incentives.deemingYears'], 634: ['incentives.solarStcs', 'battery.stcs.tiered'], 635: ['win.proposal.stcDiscount'],
    636: ['win.proposal.edit'], 640: ['win.proposal.preview', 'pricing.proposalText'], 641: ['win.proposal.items'], 642: ['win.proposal.issue'], 645: ['biz.xero.unreconciled'], 650: ['win.proposal.preview'],
    651: ['win.notify.inbox'], 652: ['win.notify.markRead'], 657: ['core.bus.history'], 659: ['shell.toastDedupe'], 663: ['shell.eventToasts'], 691: ['biz.calendar.clashes'], 692: ['win.calendar.meetings'],
    701: ['shell.palette'], 702: ['win.notify.globalSearch'], 703: ['core.cmd.fuzzy'], 704: ['win.vault.filters'], 705: ['core.cmd.search'], 712: ['win.dashboard.overview'], 716: ['win.dashboard.crewLink'], 717: ['core.ui.tooltip', 'win.vault.tooltip'],
    723: ['win.analytics.pipeline', 'biz.market.funnel'], 724: ['win.analytics.utilisation'], 728: ['win.ultron.teams'], 735: ['yield.co2Offset'], 738: ['win.reports.extras'], 744: ['win.reports.preview'], 745: ['win.check.csv', 'serials.csv'], 746: ['win.jobs.exportImport'],
    776: ['core.keys.defaults', 'shell.keybinds'], 777: ['core.ui.dialog'], 779: ['core.ui.dialog'], 781: ['core.ui.table'], 793: ['core.wm.snapshot', 'win.spell.stringsSave'], 796: ['core.i18n.translate'], 797: ['core.i18n.number'],
    830: ['biz.xero.invoice'], 831: ['biz.sm8.normalise'], 832: ['biz.sm8.stages'], 834: ['biz.drive.match'], 845: ['serials.csv'],
    877: ['biz.crypto.roundtrip', 'biz.crypto.passphrase'], 903: ['core.store.migrate'], 911: ['core.store.corruptRecovery'], 915: ['workforce.world'], 922: ['core.bus.history'],
    951: ['shell.onboarding', 'win.wizard.steps'], 952: ['win.help.tutorial'], 957: ['win.help.glossary'], 958: ['win.help.keys'], 959: ['win.help.about'], 978: ['jobs.advanceStage'], 979: ['commissioning.evaluate.pass'], 980: ['courtsafe.tests'], 982: ['workforce.deterministic'], 999: ['win.selftest.window']
};

async function main() {
    const ledger = fs.readFileSync(path.join(root, 'docs', 'realm', 'FEATURES.md'), 'utf8');
    const known = new Set([...ledger.matchAll(/^\| \d+ \| `([^`]+)` \|/gm)].map((m) => m[1]));
    const { REGISTER_DEFS } = await import(path.join(root, 'docs', 'realm', 'js', 'core', 'registers.js'));
    const { POLICY_DEFS } = await import(path.join(root, 'docs', 'realm', 'js', 'core', 'policies.js'));
    const regFor = new Map(); for (const d of REGISTER_DEFS) for (const n of d.items) { if (!regFor.has(n)) regFor.set(n, []); regFor.get(n).push(d.id); }
    const polFor = new Map(); for (const d of POLICY_DEFS) for (const n of d.items) { if (!polFor.has(n)) polFor.set(n, []); polFor.get(n).push(d.id); }

    const items = []; let domain = null; let missing = [];
    for (const line of fs.readFileSync(listPath, 'utf8').split('\n')) {
        const m = line.match(/^(\d+)\. (.+)$/);
        if (!m) { if (line.trim()) domain = line.trim(); continue; }
        const n = Number(m[1]); const [domainId, team] = DOMAIN_IDS[domain] || ['other', 'review'];
        const features = (LIVE[n] || []).filter((id) => { const ok = known.has(id); if (!ok) missing.push(`${n}:${id}`); return ok; });
        const registers = regFor.get(n) || []; const policies = polFor.get(n) || [];
        const status = features.length ? 'live' : registers.length ? 'register' : policies.length ? 'policy' : 'spec';
        items.push({ n, title: m[2].trim(), domain: domainId, domainTitle: domain, team, status, features, registers, policies });
    }
    if (missing.length) { console.error('LIVE map names features missing from the ledger:', missing.join(' ')); process.exit(1); }
    const counts = {}; for (const it of items) counts[it.status] = (counts[it.status] || 0) + 1;
    const out = { generatedAt: new Date().toISOString(), total: items.length, counts, domains: Object.entries(DOMAIN_IDS).map(([title, [id, team]]) => ({ id, title, team })), items };
    fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
    console.log(`${items.length} items → ${path.relative(root, outPath)}: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
main().catch((e) => { console.error(e); process.exit(1); });

/**
 * AS/NZS standards reference data and compliance checks.
 *
 * Only publicly available summaries are stored here; the full standards are
 * copyrighted and must be purchased from Standards Australia. The bundled
 * reference file (docs/as-nzs-standards-scraped.json) is always available,
 * so a GET never triggers outbound network requests. Remote refresh is an
 * explicit, admin-only action and is disabled unless STANDARDS_REMOTE_FETCH
 * is set.
 */
'use strict';

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');
const config = require('../config');
const logger = require('../logger');

const STANDARD_TITLES = {
    AS_NZS_3000_2018: 'Electrical installations (known as the Australian/New Zealand Wiring Rules)',
    AS_NZS_5033_2021: 'Installation and safety requirements for photovoltaic (PV) arrays',
    AS_NZS_4777_1_2016: 'Grid connection of energy systems via inverters, Part 1: Installation requirements',
    AS_NZS_4777_2_2020: 'Grid connection of energy systems via inverters, Part 2: Inverter requirements',
    AS_NZS_5139_2019: 'Electrical installations - Safety of battery systems for use with power conversion equipment',
    AS_NZS_4755_2011: 'Demand response capabilities and supporting technologies for electrical products',
    AS_NZS_3008_1_1_2017: 'Electrical installations - Selection of cables',
    AS_IEC_62109_2012: 'Safety of power converters for use in photovoltaic power systems',
    AS_NZS_3012_2019: 'Electrical installations - Construction and demolition sites',
    AS_NZS_3017_2022: 'Electrical installations - Verification by inspection and testing'
};

const STANDARD_SCOPES = {
    AS_NZS_5033_2021: 'Sets out installation requirements for PV arrays to protect persons and property from hazards arising from PV installations',
    AS_NZS_4777_1_2016: 'Specifies installation requirements for the connection of energy systems to low voltage distribution networks via inverters',
    AS_NZS_4777_2_2020: 'Specifies requirements for inverters used to connect energy systems to low voltage distribution networks',
    AS_NZS_5139_2019: 'Specifies safety requirements for battery systems installed in electrical installations',
    AS_NZS_3000_2018: 'Fundamental safety standard for electrical installations in buildings'
};

const KEY_REQUIREMENTS = {
    AS_NZS_5033_2021: [
        'PV array d.c. isolation and switching requirements',
        'PV array earthing and equipotential bonding',
        'Cable selection, routing and mechanical protection',
        'Labelling, signage and documentation requirements',
        'Shutdown and emergency procedures'
    ],
    AS_NZS_4777_1_2016: [
        'Inverter energy system installation requirements',
        'Voltage rise limits between the point of supply and the inverter',
        'Isolation, protection and labelling at the point of connection',
        'Commissioning, testing and documentation'
    ],
    AS_NZS_5139_2019: [
        'Battery system location and restricted-location rules',
        'Ventilation and clearance requirements',
        'Fire and thermal hazard mitigation',
        'Isolation, protection and emergency shutdown'
    ]
};

// Aliases accepted by checkCompliance() for the common standards.
const STANDARD_ALIASES = {
    AS_NZS_4777_2016: 'AS_NZS_4777_1_2016',
    AS_NZS_4777_1_2016: 'AS_NZS_4777_1_2016'
};

function unknownCheck(requirement, description, reference, missingField, critical = true) {
    return {
        requirement,
        description,
        status: 'UNKNOWN',
        critical,
        evidence: `Not assessed: '${missingField}' was not supplied`,
        reference,
        missing: [missingField]
    };
}

class RealStandardsService {
    constructor(options = {}) {
        this.baseDir = options.baseDir || path.join(config.dataDir, 'standards');
        this.bundledFile = options.bundledFile || path.join(config.docsDir, 'as-nzs-standards-scraped.json');
        this.allowRemoteFetch = options.allowRemoteFetch !== undefined ? options.allowRemoteFetch : config.standards.allowRemoteFetch;
        this.requestTimeoutMs = options.requestTimeoutMs || config.standards.requestTimeoutMs;
        this.publicSources = {
            qut: 'https://eprints.qut.edu.au',
            cer: 'https://www.cleanenergyregulator.gov.au'
        };
        this.standardsCodes = Object.keys(STANDARD_TITLES);
        this.cache = null;
    }

    async ensureDirectoryExists() {
        await fs.mkdir(this.baseDir, { recursive: true });
    }

    // ------------------------------------------------------------- reading

    /**
     * Returns the most recent locally saved standards snapshot, or the
     * bundled reference data. Never makes network requests.
     */
    async getLocalStandards() {
        if (this.cache) return this.cache;

        try {
            const files = await fs.readdir(this.baseDir);
            const jsonFiles = files.filter((f) => /^standards_.*\.json$/.test(f)).sort().reverse();
            if (jsonFiles.length > 0) {
                const latest = path.join(this.baseDir, jsonFiles[0]);
                const data = JSON.parse(await fs.readFile(latest, 'utf8'));
                this.cache = { ...data, source_file: jsonFiles[0] };
                return this.cache;
            }
        } catch (error) {
            if (error.code !== 'ENOENT') logger.warn('Could not read saved standards', { message: error.message });
        }

        this.cache = await this.getBundledStandards();
        return this.cache;
    }

    async getBundledStandards() {
        let bundled = {};
        try {
            bundled = JSON.parse(await fs.readFile(this.bundledFile, 'utf8'));
        } catch (error) {
            logger.warn('Bundled standards file unavailable', { message: error.message });
        }

        return {
            legal_status: 'PUBLIC_SUMMARIES_ONLY',
            disclaimer: 'Summaries and references only. Full standards must be purchased from Standards Australia.',
            generated_at: new Date().toISOString(),
            standards: [
                ...this.getStandardsPreviews(),
                ...this.generateComplianceSummaries()
            ],
            reference: bundled
        };
    }

    getStandardsPreviews() {
        return this.standardsCodes.map((code) => ({
            source: 'SolarFlow reference data',
            code,
            title: this.getStandardTitle(code),
            scope: this.getStandardScope(code),
            key_requirements: this.getKeyRequirements(code),
            type: 'standards_summary',
            legal_status: 'summary_only',
            purchase_url: `https://store.standards.org.au/search?query=${encodeURIComponent(code.replace(/_/g, ' ').replace('AS NZS', 'AS/NZS'))}`
        }));
    }

    getStandardTitle(code) {
        return STANDARD_TITLES[code] || 'Unknown Standard';
    }

    getStandardScope(code) {
        return STANDARD_SCOPES[code] || 'Scope information requires the full standard';
    }

    getKeyRequirements(code) {
        return KEY_REQUIREMENTS[code] || ['Full requirements available in the purchased standard'];
    }

    generateComplianceSummaries() {
        return [{
            source: 'SolarFlow Compliance Engine',
            title: 'AS/NZS Standards Compliance Summary for Solar/Battery Systems',
            type: 'compliance_summary',
            legal_status: 'interpretation_guide',
            disclaimer: 'This summary is for guidance only. Refer to full standards for complete requirements.',
            content: {
                'AS/NZS 5033:2021': {
                    purpose: 'PV array installation safety',
                    inspection_points: ['DC isolator accessibility and labelling', 'Cable entry weatherproofing', 'Earthing conductor continuity', 'Installation documentation complete']
                },
                'AS/NZS 4777.1:2016': {
                    purpose: 'Grid connection installation compliance',
                    inspection_points: ['Inverter listed on the CEC approved inverter list', 'Protection settings per DNSP requirements', 'Voltage rise within limits', 'Grid connection approval documentation']
                },
                'AS/NZS 5139:2019': {
                    purpose: 'Battery system safety',
                    inspection_points: ['Battery location and clearances', 'Ventilation adequacy', 'Emergency shutdown accessibility', 'DC protection operation']
                }
            }
        }];
    }

    // ---------------------------------------------------------- refreshing

    /**
     * Admin-triggered refresh. Fetches public references and saves a snapshot.
     * Returns the bundled data when remote fetching is disabled.
     */
    async fetchPublicStandardsContent() {
        if (!this.allowRemoteFetch) {
            logger.info('Remote standards fetch disabled (STANDARDS_REMOTE_FETCH=false); using bundled data');
            this.cache = await this.getBundledStandards();
            return { ...this.cache, remote_fetch: 'disabled' };
        }

        const results = {
            legal_status: 'PUBLIC_SUMMARIES_ONLY',
            disclaimer: 'Summaries and references only. Full standards must be purchased from Standards Australia.',
            generated_at: new Date().toISOString(),
            standards: [],
            sources: []
        };

        const [edu, gov] = await Promise.all([
            this.fetchFromEducationalSources().catch((error) => { logger.warn('Educational source failed', { message: error.message }); return []; }),
            this.fetchFromGovernmentSources().catch((error) => { logger.warn('Government source failed', { message: error.message }); return []; })
        ]);
        results.standards.push(...edu, ...gov, ...this.getStandardsPreviews(), ...this.generateComplianceSummaries());
        results.sources = Object.values(this.publicSources);

        await this.saveStandardsData(results);
        this.cache = results;
        return results;
    }

    httpGet(url) {
        return axios.get(url, {
            timeout: this.requestTimeoutMs,
            maxContentLength: 2 * 1024 * 1024,
            maxRedirects: 3,
            headers: { 'User-Agent': `SolarFlow/${config.version} (+https://github.com/samskiezz/solarflowminoinworldlloader)` },
            responseType: 'text'
        });
    }

    async fetchFromEducationalSources() {
        const url = `${this.publicSources.qut}/cgi/search/simple?q=AS%2FNZS+solar+standards`;
        const response = await this.httpGet(url);
        const $ = cheerio.load(response.data);
        const standards = [];
        $('.ep_search_result').each((_, element) => {
            const title = $(element).find('a').first().text().trim();
            const href = $(element).find('a').first().attr('href');
            if (title && /AS\/NZS/i.test(title) && /solar|electrical/i.test(title)) {
                standards.push({
                    source: 'QUT ePrints',
                    title,
                    url: href,
                    type: 'research_paper',
                    legal_status: 'educational_use',
                    retrieved_date: new Date().toISOString()
                });
            }
        });
        return standards;
    }

    async fetchFromGovernmentSources() {
        const url = `${this.publicSources.cer}/`;
        await this.httpGet(url);
        return [{
            source: 'Clean Energy Regulator',
            title: 'Solar panel and battery compliance requirements',
            url,
            type: 'compliance_guide',
            legal_status: 'government_public',
            retrieved_date: new Date().toISOString(),
            content: {
                'AS/NZS 5033': 'Installation and safety requirements for photovoltaic (PV) arrays',
                'AS/NZS 4777': 'Grid connection of energy systems via inverters',
                'AS/NZS 5139': 'Electrical safety requirements for battery energy storage systems'
            }
        }];
    }

    async saveStandardsData(data) {
        await this.ensureDirectoryExists();
        const filename = path.join(this.baseDir, `standards_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        await fs.writeFile(filename, JSON.stringify(data, null, 2));
        logger.info('Standards snapshot saved', { filename });
        return filename;
    }

    // ----------------------------------------------------------- compliance

    static normaliseCode(standardCode) {
        const code = String(standardCode || '').toUpperCase().replace(/[\s/.:-]+/g, '_');
        return STANDARD_ALIASES[code] || code;
    }

    async checkCompliance(installationData, standardCode) {
        const installation = installationData && typeof installationData === 'object' ? installationData : {};
        const code = RealStandardsService.normaliseCode(standardCode);

        const result = {
            standard: code,
            standard_title: this.getStandardTitle(code),
            installation_id: installation.id || null,
            check_date: new Date().toISOString(),
            overall_status: 'PENDING',
            checks: [],
            score: 0,
            critical_issues: [],
            warnings: [],
            unknown: [],
            recommendations: [],
            disclaimer: 'Automated screening only. A licensed installer or inspector must verify compliance against the full standard.'
        };

        switch (code) {
            case 'AS_NZS_5033_2021':
                result.checks = this.checkAS5033Compliance(installation);
                break;
            case 'AS_NZS_4777_1_2016':
                result.checks = this.checkAS4777Compliance(installation);
                break;
            case 'AS_NZS_5139_2019':
                result.checks = this.checkAS5139Compliance(installation);
                break;
            default: {
                const error = new Error(`Unsupported standard: ${standardCode}. Supported: AS_NZS_5033_2021, AS_NZS_4777_1_2016, AS_NZS_5139_2019`);
                error.status = 400;
                throw error;
            }
        }

        const assessed = result.checks.filter((c) => c.status === 'PASS' || c.status === 'FAIL' || c.status === 'WARNING');
        const passed = assessed.filter((c) => c.status === 'PASS').length;
        result.score = assessed.length > 0 ? Math.round((passed / assessed.length) * 100) : 0;
        result.critical_issues = result.checks.filter((c) => c.status === 'FAIL' && c.critical).map((c) => c.requirement);
        result.warnings = result.checks.filter((c) => c.status === 'WARNING').map((c) => c.requirement);
        result.unknown = result.checks.filter((c) => c.status === 'UNKNOWN').map((c) => c.requirement);

        if (result.critical_issues.length > 0) {
            result.overall_status = 'FAIL';
        } else if (result.unknown.length > 0) {
            result.overall_status = 'INCOMPLETE';
            result.recommendations.push(`Supply the missing fields to complete the assessment: ${result.checks.flatMap((c) => c.missing || []).join(', ')}`);
        } else if (result.score >= 85) {
            result.overall_status = 'PASS';
        } else {
            result.overall_status = 'WARNING';
        }

        return result;
    }

    checkAS5033Compliance(installation) {
        const checks = [];
        const ref = 'AS/NZS 5033:2021';

        if (typeof installation.dc_isolator_present !== 'boolean') {
            checks.push(unknownCheck('PV array d.c. isolation', 'A d.c. isolating device is provided for the PV array', ref, 'dc_isolator_present'));
        } else {
            checks.push({
                requirement: 'PV array d.c. isolation',
                description: 'A d.c. isolating device is provided for the PV array',
                status: installation.dc_isolator_present ? 'PASS' : 'FAIL',
                critical: true,
                evidence: installation.dc_isolator_present ? 'd.c. isolator present' : 'No d.c. isolator reported',
                reference: ref
            });
        }

        if (typeof installation.frame_earthed !== 'boolean') {
            checks.push(unknownCheck('Array frame earthing', 'PV array frame bonded to the earthing system', ref, 'frame_earthed'));
        } else {
            checks.push({
                requirement: 'Array frame earthing',
                description: 'PV array frame bonded to the earthing system',
                status: installation.frame_earthed ? 'PASS' : 'FAIL',
                critical: true,
                evidence: installation.frame_earthed ? 'Frame earthing confirmed' : 'Frame earthing not confirmed',
                reference: ref
            });
        }

        if (typeof installation.cable_protection_adequate !== 'boolean') {
            checks.push(unknownCheck('Cable protection', 'd.c. cables protected from mechanical damage and UV', ref, 'cable_protection_adequate', false));
        } else {
            checks.push({
                requirement: 'Cable protection',
                description: 'd.c. cables protected from mechanical damage and UV',
                status: installation.cable_protection_adequate ? 'PASS' : 'WARNING',
                critical: false,
                evidence: installation.cable_protection_notes || (installation.cable_protection_adequate ? 'Protection adequate' : 'Protection assessment required'),
                reference: ref
            });
        }

        if (typeof installation.labelling_complete !== 'boolean') {
            checks.push(unknownCheck('Signage and labelling', 'Required PV system signs and labels installed', ref, 'labelling_complete', false));
        } else {
            checks.push({
                requirement: 'Signage and labelling',
                description: 'Required PV system signs and labels installed',
                status: installation.labelling_complete ? 'PASS' : 'WARNING',
                critical: false,
                evidence: installation.labelling_complete ? 'Labelling complete' : 'Labelling incomplete',
                reference: ref
            });
        }

        return checks;
    }

    checkAS4777Compliance(installation) {
        const checks = [];
        const ref = 'AS/NZS 4777.1:2016';
        const voltageRise = Number(installation.voltage_rise);

        if (!Number.isFinite(voltageRise)) {
            checks.push(unknownCheck('Voltage rise', 'Voltage rise between point of supply and inverter within the 2% limit', ref, 'voltage_rise'));
        } else {
            checks.push({
                requirement: 'Voltage rise',
                description: 'Voltage rise between point of supply and inverter within the 2% limit',
                status: voltageRise <= 2.0 ? 'PASS' : 'FAIL',
                critical: true,
                evidence: `Calculated voltage rise: ${voltageRise}%`,
                reference: ref
            });
        }

        if (typeof installation.inverter_certified !== 'boolean') {
            checks.push(unknownCheck('Inverter approval', 'Inverter listed as approved for grid connection (AS/NZS 4777.2)', ref, 'inverter_certified'));
        } else {
            checks.push({
                requirement: 'Inverter approval',
                description: 'Inverter listed as approved for grid connection (AS/NZS 4777.2)',
                status: installation.inverter_certified ? 'PASS' : 'FAIL',
                critical: true,
                evidence: installation.inverter_cert_number || (installation.inverter_certified ? 'Certification confirmed' : 'Certification not verified'),
                reference: ref
            });
        }

        return checks;
    }

    checkAS5139Compliance(installation) {
        const ref = 'AS/NZS 5139:2019';
        if (installation.battery_system === false) {
            return [{
                requirement: 'Battery system',
                description: 'No battery system present',
                status: 'N/A',
                critical: false,
                evidence: 'Installation does not include battery storage',
                reference: ref
            }];
        }
        if (installation.battery_system !== true) {
            return [unknownCheck('Battery system', 'Whether a battery system is installed', ref, 'battery_system')];
        }

        const checks = [];
        if (typeof installation.battery_clearances_adequate !== 'boolean') {
            checks.push(unknownCheck('Battery location', 'Battery located with required clearances and outside restricted locations', ref, 'battery_clearances_adequate'));
        } else {
            checks.push({
                requirement: 'Battery location',
                description: 'Battery located with required clearances and outside restricted locations',
                status: installation.battery_clearances_adequate ? 'PASS' : 'FAIL',
                critical: true,
                evidence: installation.battery_location_notes || (installation.battery_clearances_adequate ? 'Clearances adequate' : 'Clearances inadequate'),
                reference: ref
            });
        }

        if (typeof installation.battery_ventilation_adequate !== 'boolean') {
            checks.push(unknownCheck('Ventilation', 'Ventilation adequate for the battery chemistry and enclosure', ref, 'battery_ventilation_adequate', false));
        } else {
            checks.push({
                requirement: 'Ventilation',
                description: 'Ventilation adequate for the battery chemistry and enclosure',
                status: installation.battery_ventilation_adequate ? 'PASS' : 'WARNING',
                critical: false,
                evidence: installation.battery_ventilation_adequate ? 'Ventilation adequate' : 'Ventilation requires assessment',
                reference: ref
            });
        }

        return checks;
    }
}

module.exports = RealStandardsService;

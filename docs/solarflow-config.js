/**
 * SOLARFLOW RUNTIME CONFIG
 * Single place for environment-specific settings used by the front end.
 *
 * Load this before any other SolarFlow script. Values can be overridden per
 * browser by storing a JSON object under localStorage['solarflow-config'],
 * e.g. {"vpsApiUrl":"https://api.projectsolar.cloud"}.
 */
(function () {
    'use strict';

    const defaults = {
        version: '2.4.0',
        // Optional VPS/API backend. Must be https when the site itself is served
        // over https, otherwise browsers block the request (mixed content).
        vpsApiUrl: 'http://76.13.176.135:3000',
        // How often (ms) background monitors may poll. Keep these modest: the
        // site is static and every poll costs the user bandwidth.
        pollIntervals: {
            vpsHealth: 60000,
            healthMonitor: 30000,
            statusLoader: 120000
        },
        maxVpsAttempts: 3,
        features: {
            vpsIntegration: true,
            neuralProcessor: true,
            complianceEngine: true
        }
    };

    let overrides = {};
    try {
        overrides = JSON.parse(localStorage.getItem('solarflow-config') || '{}') || {};
    } catch (error) {
        overrides = {};
    }

    const config = Object.assign({}, defaults, overrides, {
        pollIntervals: Object.assign({}, defaults.pollIntervals, overrides.pollIntervals || {}),
        features: Object.assign({}, defaults.features, overrides.features || {})
    });

    const pageIsHttps = window.location.protocol === 'https:';
    const isStaticHost = /github\.io$/.test(window.location.hostname) || window.location.protocol === 'file:';

    // When the Node server serves the site, its own origin provides /api/health etc.
    // Only static hosts need the separate VPS URL.
    if (!isStaticHost && !overrides.vpsApiUrl) {
        config.vpsApiUrl = window.location.origin;
    }

    /**
     * Returns the VPS API base URL that this page is actually allowed to call,
     * or null (with a reason) when calling it would fail anyway.
     */
    function resolveVpsUrl() {
        const url = (config.vpsApiUrl || '').replace(/\/+$/, '');
        if (!config.features.vpsIntegration) return { url: null, reason: 'VPS integration disabled in config' };
        if (!url) return { url: null, reason: 'No VPS URL configured' };
        if (pageIsHttps && url.startsWith('http://')) {
            return { url: null, reason: 'VPS URL is http:// but this page is https://; the browser would block the request (mixed content). Configure an https VPS URL.' };
        }
        return { url, reason: null };
    }

    const resolved = resolveVpsUrl();

    window.SOLARFLOW_CONFIG = Object.freeze(Object.assign(config, {
        pageIsHttps,
        isStaticHost,
        // Same-origin API (the Node server) is only present when not on static hosting.
        sameOriginApi: !isStaticHost,
        vps: resolved,
        getVpsUrl: () => resolved.url
    }));

    if (!resolved.url) {
        console.info('🌐 VPS integration inactive: ' + resolved.reason);
    }
})();

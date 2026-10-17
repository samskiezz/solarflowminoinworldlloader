/**
 * Bank feed (read-only): any endpoint that returns
 *   { banks: [{id,name,consentExpires}], accounts: [{id,bankId,name,type,balance,currency}], transactions: [{date,amount,description,accountId}] }
 * (for example an open-banking aggregator export). Nothing is ever written.
 */
'use strict';

const { fetchJson } = require('../http');

function isConfigured(cfg) { return Boolean(cfg.feedUrl); }
async function pull(cfg, { fetchFn = globalThis.fetch, log = () => {} } = {}) {
    const res = await fetchJson(cfg.feedUrl, { auth: cfg.feedToken ? { bearer: cfg.feedToken } : null, fetchFn });
    const out = { syncedAt: new Date().toISOString(), banks: res.banks || [], accounts: res.accounts || [], transactions: res.transactions || [] };
    log(`bank: ${out.accounts.length} accounts, ${out.transactions.length} transactions`);
    return out;
}
module.exports = { isConfigured, pull };

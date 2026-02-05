const SCHEMA_VERSION = 1;
const DEFAULT_UPDATED_AT = '1970-01-01T00:00:00Z';

function isObject(val){
  return val && typeof val === 'object' && !Array.isArray(val);
}

function asString(val, def){
  return typeof val === 'string' ? val : def;
}
function asNumber(val, def){
  return (typeof val === 'number' && Number.isFinite(val)) ? val : def;
}
function asBool(val, def){
  return typeof val === 'boolean' ? val : def;
}
function asArray(val, def){
  return Array.isArray(val) ? val : def;
}
function asObject(val, def){
  return isObject(val) ? val : def;
}

function normalizeHiveState(raw){
  const warnings = [];
  const errors = [];

  const input = isObject(raw) ? raw : {};
  if(!isObject(raw)) warnings.push('hive_state root was not an object; defaults applied');

  const metaRaw = asObject(input.meta, {});
  const meta = {
    schema: asString(metaRaw.schema, 'solarflow.hive_state.v1'),
    schemaVersion: asNumber(metaRaw.schemaVersion, SCHEMA_VERSION),
    updatedAt: asString(metaRaw.updatedAt, DEFAULT_UPDATED_AT),
    source: asString(metaRaw.source, 'unknown'),
    notes: asString(metaRaw.notes, '')
  };

  const worldRaw = asObject(input.world, {});
  const worldHealthRaw = asObject(worldRaw.health, {});
  const world = {
    id: asString(worldRaw.id, 'solarflow-minionworld'),
    name: asString(worldRaw.name, 'SolarFlow • Minion Realm'),
    epoch: asString(worldRaw.epoch, 'A–Z'),
    motto: asString(worldRaw.motto, ''),
    max_minions: asNumber(worldRaw.max_minions, 50),
    realm: {
      entry: asString((worldRaw.realm || {}).entry, './realm.html'),
      status: asString((worldRaw.realm || {}).status, './index.html')
    },
    theme: {
      palette: asArray((worldRaw.theme || {}).palette, ['#00ffff', '#b400ff', '#60a5fa']).map((c) => asString(c, '#00ffff')),
      style: asString((worldRaw.theme || {}).style, 'neon-glass')
    },
    health: {
      virtual_voltage: asNumber(worldHealthRaw.virtual_voltage, 0),
      entropy: asNumber(worldHealthRaw.entropy, 0),
      loop_risk: asNumber(worldHealthRaw.loop_risk, 0),
      tick_interval_sec: asNumber(worldHealthRaw.tick_interval_sec, 60),
      paused: asBool(worldHealthRaw.paused, false)
    }
  };

  const ledgerRaw = asObject(input.ledger, {});
  const ledgerRewardsRaw = asObject(ledgerRaw.rewards, {});
  const ledger = {
    updatedAt: asString(ledgerRaw.updatedAt, DEFAULT_UPDATED_AT),
    credits_total: asNumber(ledgerRaw.credits_total, 0),
    reputation_index: asNumber(ledgerRaw.reputation_index, 0),
    rewards: {
      help_friend_bonus: asNumber(ledgerRewardsRaw.help_friend_bonus, 0),
      task_complete_bonus: asNumber(ledgerRewardsRaw.task_complete_bonus, 0),
      audit_pass_bonus: asNumber(ledgerRewardsRaw.audit_pass_bonus, 0)
    },
    transactions: asArray(ledgerRaw.transactions, []).map((t) => ({
      id: asString(t?.id, ''),
      timestamp: asString(t?.timestamp, DEFAULT_UPDATED_AT),
      from: asString(t?.from, ''),
      to: asString(t?.to, ''),
      amount: asNumber(t?.amount, 0),
      memo: asString(t?.memo, '')
    }))
  };

  const minionsRaw = asObject(input.minions, {});
  const roster = asArray(minionsRaw.roster, []).map((m) => ({
    id: asString(m?.id, ''),
    tier: asNumber(m?.tier, 0),
    role: asString(m?.role, ''),
    mode: asString(m?.mode, ''),
    specialties: asArray(m?.specialties, []).map((s) => asString(s, '')),
    energy_credits: asNumber(m?.energy_credits, 0),
    reputation: asNumber(m?.reputation, 0),
    avatar_url: asString(m?.avatar_url, ''),
    happiness_sim: asNumber(m?.happiness_sim, 0)
  }));
  const minions = {
    updatedAt: asString(minionsRaw.updatedAt, DEFAULT_UPDATED_AT),
    max: asNumber(minionsRaw.max, world.max_minions),
    roster
  };

  const activitiesRaw = asObject(input.activities, {});
  const statusRaw = asObject(activitiesRaw.status, {});
  const activities = {
    updatedAt: asString(activitiesRaw.updatedAt, DEFAULT_UPDATED_AT),
    status: {
      ci: asString(statusRaw.ci, 'unknown'),
      overall: asNumber(statusRaw.overall, 0),
      overallLabel: asString(statusRaw.overallLabel, 'SolarFlow progress'),
      milestones: asArray(statusRaw.milestones, []).map((m) => ({
        id: asString(m?.id, ''),
        label: asString(m?.label, ''),
        status: asString(m?.status, '')
      }))
    },
    feed_posts: asArray(activitiesRaw.feed_posts, []).map((p) => ({
      who: asString(p?.who, 'ANNOUNCE'),
      avatar_url: asString(p?.avatar_url, ''),
      when: asString(p?.when, ''),
      topic: asString(p?.topic, 'ANNOUNCEMENT'),
      status: asString(p?.status, 'update'),
      text: asString(p?.text, '')
    }))
  };

  const agoraRaw = asObject(input.agora, {});
  const agora = {
    updatedAt: asString(agoraRaw.updatedAt, DEFAULT_UPDATED_AT),
    mode: asString(agoraRaw.mode, 'SIMULATED'),
    notes: asString(agoraRaw.notes, ''),
    messages: asArray(agoraRaw.messages, []).map((m) => ({
      sender_id: asString(m?.sender_id, ''),
      target_tier: asNumber(m?.target_tier, 0),
      timestamp: asString(m?.timestamp, DEFAULT_UPDATED_AT),
      intent: asString(m?.intent, 'UPDATE'),
      payload: m?.payload,
      spark_delta: asNumber(m?.spark_delta, 0),
      metadata: m?.metadata
    }))
  };

  const tasksRaw = asObject(input.tasks, {});
  const tasks = {
    board: asArray(tasksRaw.board, []).map((t) => ({
      id: asString(t?.id, ''),
      title: asString(t?.title, ''),
      owner: asString(t?.owner, 'MINION'),
      status: asString(t?.status, ''),
      desc: asString(t?.desc || t?.description, '')
    }))
  };

  const covenantRaw = asObject(input.covenant, {});
  const covenant = {
    five_articles: asArray(covenantRaw.five_articles, []).map((a) => ({
      id: asString(a?.id, ''),
      title: asString(a?.title, ''),
      text: asString(a?.text, '')
    }))
  };

  const ontologyRaw = asObject(input.ontology_lab, {});
  const ontology_lab = {
    questions: asArray(ontologyRaw.questions, []).map((q) => asString(q, '')),
    hypotheses: asArray(ontologyRaw.hypotheses, []).map((h) => asString(h, ''))
  };

  const mechanicsRaw = asObject(input.mechanics, {});
  const mechanics = {
    active: asArray(mechanicsRaw.active, []).map((m) => ({
      id: asString(m?.id, ''),
      label: asString(m?.label, ''),
      desc: asString(m?.desc, ''),
      liturgy: asString(m?.liturgy, '')
    }))
  };

  const codeCanonRaw = asObject(input.code_canon, {});
  const mountedRaw = asObject(codeCanonRaw.mounted, {});
  const code_canon = {
    mounted: Object.fromEntries(Object.entries(mountedRaw).map(([k,v]) => [k, asArray(v, []).map((x) => asString(x, ''))]))
  };

  if(!metaRaw.schemaVersion) warnings.push('meta.schemaVersion missing; defaulted to latest');
  if(meta.schemaVersion < SCHEMA_VERSION){
    warnings.push(`meta.schemaVersion ${meta.schemaVersion} migrated to ${SCHEMA_VERSION}`);
    meta.schemaVersion = SCHEMA_VERSION;
  }

  if(typeof metaRaw.schema !== 'string') errors.push('meta.schema missing');
  if(typeof metaRaw.updatedAt !== 'string') errors.push('meta.updatedAt missing');
  if(typeof worldRaw.max_minions !== 'number') errors.push('world.max_minions must be number');
  if(!Array.isArray(minionsRaw.roster)) errors.push('minions.roster must be array');

  if(roster.length > world.max_minions){
    errors.push(`roster length ${roster.length} exceeds max_minions ${world.max_minions}`);
  }

  const seen = new Set();
  roster.forEach((m) => {
    const id = (m.id || '').toUpperCase();
    if(!id){
      warnings.push('minion missing id; defaulted to empty string');
      return;
    }
    if(seen.has(id)) errors.push(`duplicate minion id: ${id}`);
    seen.add(id);

    if(m.avatar_url && (m.avatar_url.startsWith('http://') || m.avatar_url.startsWith('https://'))){
      errors.push(`minion ${id} avatar_url must be relative (got ${m.avatar_url})`);
    }
  });

  const data = {
    meta,
    world,
    ledger,
    minions,
    activities,
    agora,
    tasks,
    covenant,
    ontology_lab,
    mechanics,
    code_canon,
    raw: input
  };

  return { data, warnings, errors, schemaVersion: SCHEMA_VERSION };
}

module.exports = {
  SCHEMA_VERSION,
  normalizeHiveState
};

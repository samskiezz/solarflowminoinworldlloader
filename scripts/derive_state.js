const { normalizeHiveState } = require('./hive_schema');

function isoToWhen(iso){
  if(!iso) return '';
  const s = String(iso);
  if(s.includes('T')) return s.replace('T',' ').replace('.000Z','Z').slice(0,16) + 'Z';
  return s;
}

function stableSort(items, compare){
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const res = compare(a.item, b.item);
      return res !== 0 ? res : a.index - b.index;
    })
    .map(({ item }) => item);
}

function buildFeedItems(hive){
  const posts = [];
  const msgs = hive.agora.messages;
  msgs.forEach((m, index) => {
    const who = m.sender_id || 'MINION';
    const intent = m.intent || 'UPDATE';
    const whenIso = m.timestamp || hive.meta.updatedAt;
    const payload = m.payload;
    let text = '';
    if(payload && typeof payload === 'object'){
      if(intent === 'FETCH_RESULT'){
        text = `Fetched ${payload.url || ''} • ${payload.status ?? ''} • ${payload.content_type || ''} • ${payload.bytes ? (payload.bytes+' bytes') : ''}`.trim();
      }else if(intent === 'DISCOVERY_RESULT'){
        const c = Array.isArray(payload.candidates) ? payload.candidates.length : 0;
        text = `Discovery for ${payload.manufacturer || 'manufacturer'} • candidates: ${c}`;
      }else if(intent === 'VALIDATION_RESULT'){
        text = `Validation • match=${payload.model_match} • conf=${payload.confidence}`;
      }else{
        text = JSON.stringify(payload);
      }
    }else{
      text = String(payload || '').slice(0, 200);
    }

    posts.push({
      id: `agora-${m.sender_id || 'minion'}-${m.timestamp || index}`,
      who,
      avatar_url: avatarFor(hive, who),
      when: isoToWhen(whenIso),
      topic: intent,
      status: 'update',
      text
    });
  });

  const txns = hive.ledger.transactions;
  txns.forEach((t, index) => {
    posts.push({
      id: `txn-${t.id || index}`,
      who: 'LEDGER',
      avatar_url: './avatars/atlas.png',
      when: isoToWhen(t.timestamp || hive.meta.updatedAt),
      topic: 'TXN',
      status: 'done',
      text: `${t.from || '?'} → ${t.to || '?'} • ${t.amount ?? ''} • ${t.memo || ''}`.trim()
    });
  });

  const curated = hive.activities.feed_posts;
  curated.forEach((p, index) => {
    posts.push({
      id: `curated-${p.who || 'announce'}-${p.when || index}`,
      who: p.who || 'ANNOUNCE',
      avatar_url: p.avatar_url || avatarFor(hive, p.who),
      when: p.when || isoToWhen(hive.meta.updatedAt),
      topic: p.topic || 'ANNOUNCEMENT',
      status: p.status || 'update',
      text: p.text || ''
    });
  });

  const sorted = stableSort(posts, (a, b) => String(b.when).localeCompare(String(a.when)));
  return sorted;
}

function avatarFor(hive, senderId){
  const m = hive.minions.roster.find((x) => (x.id || '').toUpperCase() === String(senderId || '').toUpperCase());
  return m?.avatar_url || './avatars/bolt.png';
}

function deriveState(rawHive){
  const { data: hive, warnings, errors } = normalizeHiveState(rawHive);

  const rosterSorted = stableSort(hive.minions.roster, (a, b) => String(a.id).localeCompare(String(b.id)));

  const feedItems = buildFeedItems(hive);
  const meters = {
    virtual_voltage: hive.world.health.virtual_voltage,
    entropy: hive.world.health.entropy,
    loop_risk: hive.world.health.loop_risk
  };

  const tasks = stableSort(hive.tasks.board, (a, b) => String(a.id || a.title).localeCompare(String(b.id || b.title)));

  return {
    schemaVersion: hive.meta.schemaVersion,
    warnings,
    errors,
    lastUpdated: hive.meta.updatedAt,
    healthStatus: hive.world.health,
    meters,
    status: {
      updatedAt: hive.meta.updatedAt,
      ci: hive.activities.status.ci,
      overall: hive.activities.status.overall,
      overallLabel: hive.activities.status.overallLabel,
      milestones: hive.activities.status.milestones
    },
    feedItems,
    tasks,
    rosterPreview: rosterSorted.slice(0, 12),
    rosterFull: rosterSorted,
    agora: hive.agora,
    ledger: hive.ledger,
    covenant: hive.covenant,
    ontology_lab: hive.ontology_lab,
    mechanics: hive.mechanics,
    code_canon: hive.code_canon,
    hive
  };
}

module.exports = {
  deriveState
};

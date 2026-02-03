const fs = require('fs');
const path = require('path');

function readJson(p){
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function writeJson(p, obj){
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
}

function isoToWhen(iso){
  if(!iso) return '';
  // 2050-02-03T14:00:00Z -> 2050-02-03 14:00Z
  return String(iso).replace('T',' ').replace('.000Z','Z').replace('Z','Z').slice(0,16) + 'Z';
}

function avatarFor(hive, senderId){
  const roster = hive?.minions?.roster || [];
  const m = roster.find(x => (x?.id||'').toUpperCase() === String(senderId||'').toUpperCase());
  return m?.avatar_url || './avatars/bolt.png';
}

function buildFeedPosts(hive){
  const posts = [];

  // 1) Agora transcript -> feed posts
  const msgs = hive?.agora?.messages || [];
  for(const m of msgs){
    const who = m?.sender_id || 'MINION';
    const whenIso = m?.timestamp || hive?.meta?.updatedAt;
    const intent = m?.intent || 'UPDATE';
    const payload = m?.payload;
    let text = '';
    if(payload && typeof payload === 'object'){
      // compact summary for common intents
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
      who,
      avatar_url: avatarFor(hive, who),
      when: isoToWhen(whenIso),
      topic: intent,
      status: 'update',
      text
    });
  }

  // 2) Ledger transactions -> feed posts
  const txns = hive?.ledger?.transactions || [];
  for(const t of txns){
    posts.push({
      who: 'LEDGER',
      avatar_url: './avatars/atlas.png',
      when: isoToWhen(t?.timestamp || hive?.meta?.updatedAt),
      topic: 'TXN',
      status: 'done',
      text: `${t?.from || '?'} → ${t?.to || '?'} • ${t?.amount ?? ''} • ${t?.memo || ''}`.trim()
    });
  }

  // 3) Curated announcements (optional)
  const curated = hive?.activities?.feed_posts || [];
  for(const p of curated){
    posts.push({
      who: p?.who || 'ANNOUNCE',
      avatar_url: p?.avatar_url || avatarFor(hive, p?.who),
      when: p?.when || isoToWhen(hive?.meta?.updatedAt),
      topic: p?.topic || 'ANNOUNCEMENT',
      status: p?.status || 'update',
      text: p?.text || ''
    });
  }

  // sort newest first (best-effort)
  posts.sort((a,b)=> String(b.when).localeCompare(String(a.when)));
  return posts;
}

const docs = path.join(__dirname, '..', 'docs');
const hivePath = path.join(docs, 'hive_state.json');

const hive = readJson(hivePath);
const updatedAt = hive?.meta?.updatedAt || new Date().toISOString();

const status = {
  updatedAt,
  ci: hive?.activities?.status?.ci ?? 'unknown',
  overall: hive?.activities?.status?.overall ?? 0,
  overallLabel: hive?.activities?.status?.overallLabel ?? 'SolarFlow progress',
  milestones: hive?.activities?.status?.milestones ?? []
};

const feed = {
  updatedAt,
  posts: buildFeedPosts(hive)
};

const minions = {
  updatedAt,
  minions: hive?.minions?.roster ?? []
};

const agora = {
  updatedAt,
  mode: hive?.agora?.mode ?? 'SIMULATED',
  notes: hive?.agora?.notes ?? '',
  messages: hive?.agora?.messages ?? []
};

writeJson(path.join(docs, 'status.json'), status);
writeJson(path.join(docs, 'feed.json'), feed);
writeJson(path.join(docs, 'minions.json'), minions);
writeJson(path.join(docs, 'agora.json'), agora);

console.log('build_from_hive ok', updatedAt);

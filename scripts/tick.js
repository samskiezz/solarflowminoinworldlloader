const fs = require('fs');
const path = require('path');

function readJson(p){
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function writeJson(p, obj){
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
}
function isoNow(){
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const docs = path.join(__dirname, '..', 'docs');
const hivePath = path.join(docs, 'hive_state.json');

const now = isoNow();

// Canonical update: mutate hive_state.json then regenerate derived snapshots.
const hive = readJson(hivePath);
hive.meta = hive.meta || {};
hive.meta.updatedAt = now;

// Keep nested timestamps coherent.
if(hive.ledger) hive.ledger.updatedAt = now;
if(hive.minions) hive.minions.updatedAt = now;
if(hive.market) hive.market.updatedAt = now;
if(hive.friends) hive.friends.updatedAt = now;
if(hive.activities) hive.activities.updatedAt = now;
if(hive.agora) hive.agora.updatedAt = now;
if(hive.undercurrent) hive.undercurrent.updatedAt = now;

// Tiny deterministic drift in happiness(sim)
(hive.minions?.roster || []).forEach((m, i)=>{
  const base = typeof m.happiness_sim === 'number' ? m.happiness_sim : 70;
  const drift = ((i * 7 + now.charCodeAt(12)) % 3) - 1; // -1..+1
  m.happiness_sim = Math.max(0, Math.min(100, base + drift));
});

// Feed heartbeat (prepend)
hive.activities = hive.activities || {};
hive.activities.feed_posts = hive.activities.feed_posts || [];
hive.activities.feed_posts.unshift({
  who: 'Atlas',
  avatar_url: './avatars/atlas.png',
  when: now.replace('T',' ').replace('Z',' UTC'),
  topic: 'Heartbeat',
  status: 'in-progress',
  text: 'Realm tick: refreshed hive_state timestamps and regenerated derived snapshots.'
});
hive.activities.feed_posts = hive.activities.feed_posts.slice(0, 25);

// Agora tick message
hive.agora = hive.agora || {};
hive.agora.messages = hive.agora.messages || [];
hive.agora.messages.push({
  sender_id: 'ATLAS',
  target_tier: 3,
  timestamp: now,
  intent: 'STATE_PATCH',
  payload: { task_id: 'tick', updatedAt: now },
  spark_delta: 0.1,
  metadata: { requires_quantum_break: false }
});
hive.agora.messages = hive.agora.messages.slice(-50);

writeJson(hivePath, hive);

// Regenerate derived docs/*.json
require('./build_from_hive');

// Rebuild index to embed the fresh hive snapshot (no fetch)
require('./build_index');

console.log('tick ok', now);

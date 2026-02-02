const fs = require('fs');
const path = require('path');

function readJson(p){
  return JSON.parse(fs.readFileSync(p,'utf8'));
}
function writeJson(p, obj){
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}
function isoNow(){
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const root = path.join(__dirname, '..', 'docs');
const statusPath = path.join(root, 'status.json');
const feedPath = path.join(root, 'feed.json');
const minionsPath = path.join(root, 'minions.json');
const agoraPath = path.join(root, 'agora.json');

const now = isoNow();

// status
const status = readJson(statusPath);
status.updatedAt = now;
status.overallLabel = status.overallLabel || 'SolarFlow progress';
writeJson(statusPath, status);

// feed (prepend heartbeat)
const feed = readJson(feedPath);
feed.posts = feed.posts || [];
feed.posts.unshift({
  who: 'Atlas',
  avatar_url: './avatars/atlas.png',
  when: now.replace('T',' ').replace('Z',' UTC'),
  topic: 'Heartbeat',
  status: 'in-progress',
  text: 'Realm tick: publishing fresh timestamps + keeping feed alive. Next: wire live updater from SolarFlow repo state.'
});
feed.posts = feed.posts.slice(0, 25);
writeJson(feedPath, feed);

// minions (tiny deterministic drift)
const minions = readJson(minionsPath);
minions.updatedAt = now;
(minions.minions || []).forEach((m,i)=>{
  const base = typeof m.happiness_sim === 'number' ? m.happiness_sim : 70;
  const drift = ((i*7 + now.charCodeAt(12)) % 3) - 1; // -1..+1
  m.happiness_sim = Math.max(0, Math.min(100, base + drift));
});
writeJson(minionsPath, minions);

// agora (append a tick message)
const agora = readJson(agoraPath);
agora.updatedAt = now;
agora.messages = agora.messages || [];
agora.messages.push({
  sender_id: 'ATLAS',
  target_tier: 3,
  timestamp: now,
  intent: 'STATE_PATCH',
  payload: { task_id: 'tick', updatedAt: now },
  spark_delta: 0.1,
  metadata: { requires_quantum_break: false }
});
agora.messages = agora.messages.slice(-50);
writeJson(agoraPath, agora);

console.log('tick ok', now);

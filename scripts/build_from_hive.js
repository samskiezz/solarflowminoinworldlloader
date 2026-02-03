const fs = require('fs');
const path = require('path');

function readJson(p){
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function writeJson(p, obj){
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
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
  posts: hive?.activities?.feed_posts ?? []
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

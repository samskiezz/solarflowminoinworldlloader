const fs = require('fs');
const path = require('path');
const { deriveState } = require('./derive_state');

function readJson(p){
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function writeJson(p, obj){
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n');
}

const docs = path.join(__dirname, '..', 'docs');
const hivePath = path.join(docs, 'hive_state.json');

const hiveRaw = readJson(hivePath);
const derived = deriveState(hiveRaw);

const status = {
  updatedAt: derived.lastUpdated,
  ci: derived.status.ci,
  overall: derived.status.overall,
  overallLabel: derived.status.overallLabel,
  milestones: derived.status.milestones
};

const feed = {
  updatedAt: derived.lastUpdated,
  posts: derived.feedItems
};

const minions = {
  updatedAt: derived.lastUpdated,
  minions: derived.rosterFull
};

const agora = {
  updatedAt: derived.lastUpdated,
  mode: derived.agora.mode,
  notes: derived.agora.notes,
  messages: derived.agora.messages
};

writeJson(path.join(docs, 'status.json'), status);
writeJson(path.join(docs, 'feed.json'), feed);
writeJson(path.join(docs, 'minions.json'), minions);
writeJson(path.join(docs, 'agora.json'), agora);

console.log('build_from_hive ok', derived.lastUpdated);

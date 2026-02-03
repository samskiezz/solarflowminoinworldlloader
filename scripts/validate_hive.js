const fs = require('fs');
const path = require('path');

function fail(msg){
  console.error('hive_state validation failed:', msg);
  process.exit(1);
}

function isObj(x){ return x && typeof x === 'object' && !Array.isArray(x); }

const docs = path.join(__dirname, '..', 'docs');
const hivePath = path.join(docs, 'hive_state.json');
const hive = JSON.parse(fs.readFileSync(hivePath,'utf8'));

if(!isObj(hive)) fail('root must be object');
if(!isObj(hive.meta)) fail('meta missing');
if(typeof hive.meta.schema !== 'string') fail('meta.schema missing');
if(typeof hive.meta.updatedAt !== 'string') fail('meta.updatedAt missing');

if(!isObj(hive.world)) fail('world missing');
if(typeof hive.world.max_minions !== 'number') fail('world.max_minions must be number');

if(!isObj(hive.minions)) fail('minions missing');
if(!Array.isArray(hive.minions.roster)) fail('minions.roster must be array');

const max = hive.world.max_minions;
const roster = hive.minions.roster;
if(roster.length > max) fail(`roster length ${roster.length} exceeds max_minions ${max}`);

const seen = new Set();
for(const m of roster){
  if(!isObj(m)) fail('roster entry must be object');
  if(typeof m.id !== 'string' || !m.id.trim()) fail('minion.id missing');
  const id = m.id.toUpperCase();
  if(seen.has(id)) fail(`duplicate minion id: ${id}`);
  seen.add(id);

  if(typeof m.tier !== 'number') fail(`minion ${m.id} tier must be number`);
  if(typeof m.role !== 'string') fail(`minion ${m.id} role missing`);
  if(typeof m.mode !== 'string') fail(`minion ${m.id} mode missing`);
  if(!Array.isArray(m.specialties)) fail(`minion ${m.id} specialties must be array`);

  if(m.avatar_url && typeof m.avatar_url === 'string'){
    // keep avatars relative for GitHub Pages stability
    if(m.avatar_url.startsWith('http://') || m.avatar_url.startsWith('https://')){
      fail(`minion ${m.id} avatar_url must be relative (got ${m.avatar_url})`);
    }
  }
}

if(isObj(hive.world.health)){
  const h = hive.world.health;
  for(const k of ['virtual_voltage','entropy','loop_risk']){
    if(k in h && typeof h[k] !== 'number') fail(`world.health.${k} must be number`);
  }
  if('tick_interval_sec' in h && typeof h.tick_interval_sec !== 'number') fail('world.health.tick_interval_sec must be number');
  if('paused' in h && typeof h.paused !== 'boolean') fail('world.health.paused must be boolean');
}

// Basic sanity: activities + agora shapes
if(hive.activities && !isObj(hive.activities)) fail('activities must be object');
if(hive.agora && !isObj(hive.agora)) fail('agora must be object');

console.log('validate_hive ok', hive.meta.updatedAt, `roster=${roster.length}`);

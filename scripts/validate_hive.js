const fs = require('fs');
const path = require('path');
const { normalizeHiveState } = require('./hive_schema');

function fail(msg){
  console.error('hive_state validation failed:', msg);
  process.exit(1);
}

const docs = path.join(__dirname, '..', 'docs');
const hivePath = path.join(docs, 'hive_state.json');
const hiveRaw = JSON.parse(fs.readFileSync(hivePath, 'utf8'));

const { data: hive, warnings, errors } = normalizeHiveState(hiveRaw);

if(warnings.length){
  console.warn('hive_state warnings:');
  warnings.forEach((w) => console.warn(' -', w));
}

if(errors.length){
  errors.forEach((err) => fail(err));
}

console.log('validate_hive ok', hive.meta.updatedAt, `roster=${hive.minions.roster.length}`);

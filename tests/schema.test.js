const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { normalizeHiveState } = require('../scripts/hive_schema');

const hivePath = path.join(__dirname, '..', 'docs', 'hive_state.json');

function loadHive(){
  return JSON.parse(fs.readFileSync(hivePath, 'utf8'));
}

test('hive_state schema validation returns data without errors', () => {
  const raw = loadHive();
  const result = normalizeHiveState(raw);
  assert.equal(result.errors.length, 0);
  assert.equal(result.data.meta.schemaVersion, 1);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { deriveState } = require('../scripts/derive_state');

const hivePath = path.join(__dirname, '..', 'docs', 'hive_state.json');

function loadHive(){
  return JSON.parse(fs.readFileSync(hivePath, 'utf8'));
}

test('deriveState is deterministic for the same input', () => {
  const raw = loadHive();
  const a = deriveState(raw);
  const b = deriveState(raw);

  assert.deepEqual(a.feedItems, b.feedItems);
  assert.deepEqual(a.tasks, b.tasks);
  assert.deepEqual(a.rosterFull, b.rosterFull);
  assert.deepEqual(a.meters, b.meters);
});

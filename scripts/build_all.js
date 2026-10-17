const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function isoNow(){
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}
function safeGitSha(){
  try{
    return execSync('git rev-parse --short HEAD', { stdio:['ignore','pipe','ignore'] }).toString().trim();
  }catch{ return 'unknown'; }
}

const docs = path.join(__dirname, '..', 'docs');

require('./generate_identicons');
require('./validate_hive');
require('./build_from_hive');
require('./build_index');
require('./build_roster');

const pkg = require('../package.json');
const build = {
  version: pkg.version,
  builtAt: isoNow(),
  gitSha: safeGitSha(),
  notes: 'Generated artifacts are committed for GitHub Pages. Source of truth: docs/hive_state.json.'
};
fs.writeFileSync(path.join(docs,'build.json'), JSON.stringify(build, null, 2) + '\n');
fs.writeFileSync(path.join(docs,'version.txt'), `VERSION: ${build.version}\nBUILT: ${build.builtAt}\nCOMMIT: ${build.gitSha}\n`);

console.log('build_all ok', build);

// Fix missing data-hive script tag
const fs = require('fs');
const path = require('path');

const docs = path.join(__dirname, '..', 'docs');
const indexPath = path.join(docs, 'index.html');
const hivePath = path.join(docs, 'hive_state.json');

// Read files
const html = fs.readFileSync(indexPath, 'utf8');
const hiveData = fs.readFileSync(hivePath, 'utf8');

// Find where to insert the data-hive script (right after <body>)
const bodyOpenIndex = html.indexOf('<body>');
if (bodyOpenIndex === -1) {
  console.error('❌ Could not find <body> tag');
  process.exit(1);
}

const insertIndex = bodyOpenIndex + '<body>'.length;

// Create the data-hive script tag
const dataHiveScript = `
  <!-- Canonical embedded hive_state snapshot: no fetch required -->
  <script id="data-hive" type="application/json">${hiveData.replace(/</g, '\\u003c')}</script>
`;

// Insert the script
const updatedHtml = html.slice(0, insertIndex) + dataHiveScript + html.slice(insertIndex);

// Write back
fs.writeFileSync(indexPath, updatedHtml);

console.log('✅ Added data-hive script tag to index.html');
console.log('📊 Hive data embedded for offline functionality');
// Validates the waiting-game word list: every entry must be exactly five
// letters (ä/ö/ü/ß count as one), use only the allowed uppercase charset, and
// appear once. Run: node scripts/check-words.js
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'games', 'waiting', 'words.js');
let text = fs.readFileSync(file, 'utf8');
text = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);

const words = [...text.matchAll(/(["'])([A-Za-zÄÖÜäöüß]+)\1/g)].map(m => m[2]);
const charset = /^[A-ZÄÖÜß]+$/;

const bad = [];
const seen = new Set();
const dups = [];
for (const w of words) {
  if ([...w].length !== 5) bad.push(`${w} (length ${[...w].length})`);
  else if (!charset.test(w)) bad.push(`${w} (charset)`);
  if (seen.has(w)) dups.push(w);
  seen.add(w);
}

console.log(`total: ${words.length}`);
console.log(`invalid: ${bad.length ? bad.join(', ') : 'none'}`);
console.log(`duplicates: ${dups.length ? dups.join(', ') : 'none'}`);
if (bad.length || dups.length) process.exit(1);

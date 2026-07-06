// Built-in word filter.
//
// Only SLURS are filtered — discriminatory / racist / hateful terms. Ordinary
// profanity and insults are NOT filtered (allowed in both names and stories).
//
// Story contributions: each slur is replaced with one "*" per letter (so
// "neger" -> "*****"), matched as whole words with Unicode letter/number
// lookarounds so innocent substrings are kept.
//
// Player names: rejected if they contain a slur anywhere (substring match —
// names are often written without spaces, e.g. "NegerKing"), so SLURS should
// stay reasonably specific.
//
// Keep entries lowercase; matching is case-insensitive. Extend as needed.

const SLURS = [
  // === Racist (German) ===
  'neger', 'negger', 'negerin', 'nega', 'negerlein',
  'kanake', 'kanacke', 'kanaken', 'kümmeltürke', 'kümmeltuerke', 'kümmeltürken',
  'zigeuner', 'zigeunerin', 'zigano',
  'schlitzauge', 'schlitzaugen', 'schlitzi', 'reisfresser',
  'bimbo', 'bimbos', 'mohrenkopf',
  'musel', 'muselmann', 'kameltreiber', 'bimbes', 'ziegenficker',
  'itaker', 'spaghettifresser', 'katzelmacher', 'polacke', 'polacken', 'tschusch', 'tschuschen',
  // === Racist (English) ===
  'nigger', 'niggers', 'nigga', 'niggas', 'negro', 'negroes', 'darkie', 'darky', 'darkies',
  'spic', 'spics', 'chink', 'chinks', 'gook', 'gooks',
  'wetback', 'wetbacks', 'paki', 'pakis', 'beaner', 'beaners',
  'wop', 'wops', 'dago', 'dagos', 'gyppo', 'towelhead', 'raghead',
  'jigaboo', 'jigaboos', 'sambo', 'zipperhead', 'chinaman',
  'wog', 'wogs', 'muzzie', 'muzzies', 'mudslime', 'mudslimes', 'dothead', 'dotheads',
  // === Antisemitic ===
  'kike', 'kikes', 'yid', 'yids', 'heeb', 'heebs', 'hymie', 'hymies', 'sheeny',
  'judensau', 'judensäue', 'saujude', 'saujuden', 'judenschwein', 'judenschweine',
  'judenpack', 'judenbengel',
  // === Anti-indigenous ===
  'redskin', 'redskins', 'injun', 'injuns', 'squaw', 'squaws',
  'boong', 'boongs', 'lubra', 'lubras', 'wagonburner', 'wagonburners',
  'indianer', 'indianerin', 'indianern', 'rothaut', 'rothäute',
  'eskimo', 'eskimos', 'eskimofrau',
  // === Anti-LGBTQ / queerphobic (German) ===
  'schwuchtel', 'schwuchteln', 'tunte', 'tunten',
  'transe', 'transen', 'schwuppe', 'schwuppen',
  // === Anti-LGBTQ / queerphobic (English) ===
  'faggot', 'faggots', 'fag', 'fags', 'faggy',
  'poofter', 'poofters', 'ladyboy', 'ladyboys', 'heshe',
  'tranny', 'trannies', 'shemale', 'shemales', 'fudgepacker', 'fudgepackers',
  // === Ableist ===
  'spasti', 'spast', 'behindi', 'mongo', 'mongoloid', 'mongos',
  'krüppel', 'kruppel', 'spacko', 'spacken', 'debil',
  'retard', 'retards', 'retarded', 'spaz', 'spazzes', 'cripple', 'cripples', 'gimp', 'gimps',
];

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Whole-word match (bounded by non letter/number) for censoring contributions.
const slurPattern = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${SLURS.map(escape).join('|')})(?![\\p{L}\\p{N}])`,
  'giu'
);

module.exports = {
  slurs: SLURS,

  // Replace every slur with one "*" per character, leaving the rest of the text
  // (punctuation, spacing, ordinary swearing) intact. Returns '' for non-strings.
  censor: text => (typeof text === 'string' ? text : '')
    .replace(slurPattern, m => '*'.repeat([...m].length)),

  // True if the text contains a slur anywhere (substring, case-insensitive).
  // Used to reject player names; ordinary profanity is allowed.
  hasSlur: text => {
    const n = (typeof text === 'string' ? text : '').toLowerCase();
    return SLURS.some(s => n.includes(s));
  },
};

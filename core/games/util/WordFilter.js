// Built-in word filter.
//
// Two categories:
//   PROFANITY — general insults / swear words
//   SLURS     — discriminatory / racist / hateful terms
//
// Story contributions are censored against BOTH lists: each match is replaced
// with one "*" per letter (so "arschloch" -> "*********"), matched as whole
// words with Unicode letter/number lookarounds so innocent substrings
// ("Klasse", "passt", "spicy") are kept.
//
// Player names are only checked against SLURS (via hasSlur): a name containing
// a slur is rejected, but ordinary crude names are allowed. Names are matched
// as substrings (names are often written without spaces, e.g. "NegerKing"), so
// SLURS should stay reasonably specific.
//
// Keep entries lowercase; matching is case-insensitive. Extend as needed.

const PROFANITY = [
  // --- German ---
  'arsch', 'arschloch', 'arschlöcher', 'arschgeige', 'arschficker', 'arschkriecher',
  'wichser', 'wichs', 'wichsen', 'wichst', 'wichste', 'abwichsen',
  'hurensohn', 'hurensöhne', 'hurenkind', 'hure', 'huren', 'nutte', 'nutten',
  'fotze', 'fotzen', 'muschi', 'schwanzlutscher', 'sackgesicht', 'hodensack',
  'schlampe', 'schlampen',
  'fick', 'ficker', 'ficken', 'fickt', 'fickst', 'fickte', 'gefickt', 'verfickt', 'fickfehler',
  'scheisse', 'scheiße', 'scheiss', 'scheis', 'kacke', 'kackbratze',
  'vollpfosten', 'vollidiot', 'vollhonk', 'volltrottel', 'schwachkopf', 'dummkopf',
  'missgeburt', 'drecksau', 'dreckskerl', 'dreckschwein', 'pisser', 'pissnelke',
  // --- English ---
  'ass', 'asshole', 'assholes', 'arse', 'arsehole', 'jackass', 'dumbass',
  'fuck', 'fucker', 'fuckers', 'fucking', 'fucked', 'fucks', 'fuckface', 'fuckwit',
  'motherfucker', 'motherfucking', 'clusterfuck',
  'shit', 'shitty', 'shithead', 'bullshit', 'dipshit',
  'bitch', 'bitches', 'bitching', 'cunt', 'cunts',
  'slut', 'sluts', 'whore', 'whores', 'bastard', 'bastards',
  'dickhead', 'prick', 'twat', 'wanker', 'bollocks', 'douche', 'douchebag',
];

const SLURS = [
  // === Racist (German) ===
  'neger', 'negger', 'negerin', 'nega',
  'kanake', 'kanacke', 'kanaken', 'kümmeltürke', 'kümmeltuerke',
  'zigeuner', 'zigeunerin', 'zigano',
  'schlitzauge', 'schlitzaugen', 'schlitzi', 'reisfresser', 'reiskocher',
  'fidschi', 'fidschis', 'bimbo', 'bimbos', 'mohrenkopf',
  'musel', 'muselmann', 'kameltreiber', 'bimbes',
  'itaker', 'spaghettifresser', 'polacke', 'polacken', 'tschusch', 'tschuschen',
  // === Racist (English) ===
  'nigger', 'niggers', 'nigga', 'niggas', 'negro', 'negroes',
  'spic', 'spics', 'chink', 'chinks', 'gook', 'gooks',
  'wetback', 'wetbacks', 'paki', 'pakis', 'coon', 'coons', 'beaner', 'beaners',
  'wop', 'wops', 'dago', 'dagos', 'gyppo', 'towelhead', 'raghead',
  'jigaboo', 'jigaboos', 'sambo', 'zipperhead', 'chinaman',
  // === Antisemitic ===
  'kike', 'kikes', 'yid', 'yids', 'heeb', 'heebs',
  // === Anti-LGBTQ / queerphobic (German) ===
  'schwuchtel', 'schwuchteln', 'tunte', 'tunten',
  'transe', 'transen', 'kampflesbe', 'kampflesben',
  // === Anti-LGBTQ / queerphobic (English) ===
  'faggot', 'faggots', 'fag', 'fags', 'faggy',
  'dyke', 'dykes', 'poofter', 'poofters',
  'tranny', 'trannies', 'shemale', 'shemales', 'fudgepacker', 'fudgepackers',
  // === Ableist ===
  'spasti', 'spast', 'behindi', 'mongo', 'mongoloid', 'mongos',
  'krüppel', 'kruppel',
  'retard', 'retards', 'retarded', 'spaz', 'spazzes',
];

const BANNED = [...PROFANITY, ...SLURS];

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Whole-word match (bounded by non letter/number) for censoring contributions.
const bannedPattern = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${BANNED.map(escape).join('|')})(?![\\p{L}\\p{N}])`,
  'giu'
);

module.exports = {
  banned: BANNED,
  profanity: PROFANITY,
  slurs: SLURS,

  // Replace every disallowed word with one "*" per character, leaving the rest
  // of the text (punctuation, spacing) intact. Returns '' for non-strings.
  censor: text => (typeof text === 'string' ? text : '')
    .replace(bannedPattern, m => '*'.repeat([...m].length)),

  // True if the text contains a slur anywhere (substring, case-insensitive).
  // Used to reject player names; ordinary profanity is allowed in names.
  hasSlur: text => {
    const n = (typeof text === 'string' ? text : '').toLowerCase();
    return SLURS.some(s => n.includes(s));
  },
};

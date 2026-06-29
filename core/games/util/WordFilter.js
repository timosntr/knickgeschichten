// Built-in word filter.
//
// Disallowed terms (German + English insults / slurs) are matched
// case-insensitively as whole words and replaced with one "*" per letter
// (so "arschloch" becomes "*********"). The match is bounded by Unicode
// letter/number lookarounds, so innocent words that merely contain a term as a
// substring are left alone (e.g. "Klasse" is not censored because of "ass",
// "passt" is not censored because of "ass", "spicy" is not censored because of
// "spic").
//
// Keep entries lowercase; matching is case-insensitive. Extend the arrays as
// needed.

const BANNED = [
  // --- German: profanity / insults ---
  'arsch', 'arschloch', 'arschlöcher', 'arschgeige', 'arschficker', 'arschkriecher',
  'wichser', 'wichs', 'wichsen', 'wichst', 'wichste', 'abwichsen',
  'hurensohn', 'hurensöhne', 'hurenkind', 'hure', 'huren', 'nutte', 'nutten',
  'fotze', 'fotzen', 'muschi', 'schwanzlutscher', 'sackgesicht', 'hodensack',
  'schlampe', 'schlampen',
  'fick', 'ficker', 'ficken', 'fickt', 'fickst', 'fickte', 'gefickt', 'verfickt', 'fickfehler',
  'scheisse', 'scheiße', 'scheiss', 'scheis', 'kacke', 'kackbratze',
  'vollpfosten', 'vollidiot', 'vollhonk', 'volltrottel', 'schwachkopf', 'dummkopf',
  'missgeburt', 'drecksau', 'dreckskerl', 'dreckschwein', 'pisser', 'pissnelke',
  // --- German: slurs (discriminatory) ---
  'neger', 'negger', 'kanake', 'kanacke', 'kanaken',
  'schwuchtel', 'schwuchteln', 'tunte', 'tunten',
  'spasti', 'spast', 'behindi', 'mongo', 'mongoloid',
  'zigeuner', 'krüppel', 'schlitzauge', 'schlitzaugen', 'fidschi', 'bimbo',
  // --- English: profanity / insults ---
  'ass', 'asshole', 'assholes', 'arse', 'arsehole', 'jackass', 'dumbass',
  'fuck', 'fucker', 'fuckers', 'fucking', 'fucked', 'fucks', 'fuckface', 'fuckwit',
  'motherfucker', 'motherfucking', 'clusterfuck',
  'shit', 'shitty', 'shithead', 'bullshit', 'dipshit',
  'bitch', 'bitches', 'bitching', 'cunt', 'cunts',
  'slut', 'sluts', 'whore', 'whores', 'bastard', 'bastards',
  'dickhead', 'prick', 'twat', 'wanker', 'bollocks', 'douche', 'douchebag',
  // --- English: slurs (discriminatory) ---
  'nigger', 'niggers', 'nigga', 'niggas',
  'faggot', 'faggots', 'fag', 'fags', 'dyke',
  'retard', 'retards', 'retarded',
  'spic', 'chink', 'chinks', 'gook', 'wetback', 'paki', 'coon', 'kike', 'beaner',
  'tranny', 'trannies',
];

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A term must not be preceded or followed by another letter/number, so only
// whole words match. \p{L}/\p{N} need the unicode (u) flag.
const pattern = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:${BANNED.map(escape).join('|')})(?![\\p{L}\\p{N}])`,
  'giu'
);

module.exports = {
  banned: BANNED,
  // Replace every disallowed word with one "*" per character, leaving the rest
  // of the text (punctuation, spacing) intact. Returns '' for non-strings.
  censor: text => (typeof text === 'string' ? text : '')
    .replace(pattern, m => '*'.repeat([...m].length)),
};

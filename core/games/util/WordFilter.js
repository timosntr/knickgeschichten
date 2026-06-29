// Built-in word filter.
//
// Disallowed terms (German + English insults / slurs) are matched
// case-insensitively as whole words and replaced with "***". The match is
// bounded by Unicode letter/number lookarounds, so innocent words that merely
// contain a term as a substring are left alone (e.g. "Klasse" is not censored
// because of "ass", "passt" is not censored because of "ass").
//
// This is a deliberately compact starting list — extend the arrays below as
// needed. Keep entries lowercase; matching is case-insensitive.

const BANNED = [
  // --- German: strong profanity / insults ---
  'arschloch', 'arschlöcher', 'wichser', 'wichs',
  'hurensohn', 'hurensöhne', 'hure', 'huren', 'nutte', 'nutten',
  'fotze', 'fotzen', 'schlampe', 'schlampen',
  'fick', 'ficker', 'ficken', 'fickt', 'fickst', 'gefickt', 'verfickt',
  'scheisse', 'scheiße', 'kackbratze', 'vollpfosten',
  'missgeburt', 'hurenkind',
  // --- German: slurs (discriminatory) ---
  'neger', 'negger', 'kanake', 'kanacke', 'schwuchtel', 'schwuchteln',
  'spasti', 'spast', 'mongo', 'mongoloid', 'zigeuner', 'krüppel',
  // --- English: strong profanity / insults ---
  'fuck', 'fucker', 'fucking', 'fucked', 'motherfucker',
  'shit', 'bullshit', 'asshole', 'assholes', 'bitch', 'bitches',
  'cunt', 'slut', 'whore', 'bastard', 'dickhead',
  // --- English: slurs (discriminatory) ---
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'retarded',
  'spic', 'chink', 'tranny',
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
  // Replace every disallowed word with "***", leaving the rest of the text
  // (including punctuation and spacing) intact. Returns '' for non-strings.
  censor: text => (typeof text === 'string' ? text : '').replace(pattern, '***'),
};

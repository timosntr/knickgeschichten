// Curated German 5-letter words for the waiting-screen word game.
//
// This single list serves two roles: the pool the puzzle answer is drawn from,
// AND the set of accepted guesses (so players can't brute-force by typing five
// random letters). Everyday vocabulary only — no technical jargon, no
// discriminatory terms; mildly crude everyday words are fine.
//
// Rules for entries (checked by scripts/check-words.js):
//   - exactly five letters, where ä/ö/ü/ß each count as one letter
//   - only A-Z plus Ä Ö Ü and ß (uppercase; ß stays lowercase — there is no
//     everyday single-glyph uppercase form). Built to match the on-screen
//     keyboard's keys, so comparisons never need toUpperCase() (which would
//     turn ß into "SS").
//
// Expandable: add more words below, then run `node scripts/check-words.js`.

export default [
  // food & drink
  'APFEL', 'BIRNE', 'BEERE', 'MANGO', 'GURKE', 'MÖHRE', 'LAUCH', 'BOHNE',
  'ERBSE', 'LINSE', 'SALAT', 'KRAUT', 'PILZE', 'BROTE', 'KEKSE', 'TORTE',
  'HONIG', 'SAHNE', 'MILCH', 'QUARK', 'ESSIG', 'PIZZA', 'NUDEL', 'SUPPE',
  'WURST', 'SPECK', 'KAKAO', 'ZWECK',
  // sky & weather
  'SONNE', 'MONDE', 'STERN', 'WOLKE', 'REGEN', 'STURM', 'BLITZ', 'NEBEL',
  'HAGEL', 'FROST', 'WÄRME', 'KÄLTE', 'WINDE', 'DAMPF', 'RAUCH', 'ASCHE',
  'LICHT', 'DUNST',
  // water & land
  'MEERE', 'WELLE', 'KÜSTE', 'INSEL', 'TEICH', 'FLUSS', 'BÄCHE', 'SUMPF',
  'BERGE', 'HÜGEL', 'TÄLER', 'WIESE', 'ACKER', 'ERNTE', 'STEIN', 'KOHLE',
  'EISEN', 'STAHL', 'STAUB', 'ERDEN',
  // plants & trees
  'BLUME', 'TULPE', 'ASTER', 'HALME', 'ZWEIG', 'BLÜTE', 'BLATT', 'BÄUME',
  'TANNE', 'BIRKE', 'EICHE', 'AHORN', 'LINDE', 'MOOSE', 'FARNE',
  // home & things
  'TISCH', 'STUHL', 'REGAL', 'LAMPE', 'KERZE', 'TASSE', 'GABEL', 'KANNE',
  'EIMER', 'BESEN', 'LEDER', 'VILLA', 'HÜTTE', 'TÜREN', 'WÄNDE', 'DIELE',
  'KÜCHE', 'STUFE', 'SCHAL', 'KNOPF', 'NADEL', 'FADEN', 'STOFF', 'SEIDE',
  'WOLLE',
  // town
  'STADT', 'GASSE', 'PLATZ', 'MARKT', 'LADEN', 'KIOSK', 'BÜHNE',
  // animals
  'TIGER', 'ZEBRA', 'KAMEL', 'PFERD', 'ZIEGE', 'RINDE', 'HASEN', 'MÄUSE',
  'RATTE', 'KATZE', 'HUNDE', 'WÖLFE', 'BÄREN', 'DACHS', 'OTTER', 'BIBER',
  'ROBBE', 'VOGEL', 'ADLER', 'EULEN', 'RABEN', 'MÖWEN', 'SPATZ', 'MEISE',
  'AMSEL', 'FINKE', 'ENTEN', 'GÄNSE', 'HÄHNE', 'FISCH', 'HECHT', 'KRAKE',
  'BIENE', 'WESPE', 'MÜCKE', 'KÄFER', 'RAUPE',
  // clothes
  'KLEID', 'HOSEN', 'RÖCKE', 'JACKE', 'SOCKE', 'MÜTZE', 'HAUBE',
  // body
  'HAARE', 'STIRN', 'AUGEN', 'NASEN', 'OHREN', 'LIPPE', 'ZÄHNE', 'ZUNGE',
  'HÄLSE', 'HÄNDE', 'BEINE', 'BRUST', 'BAUCH', 'LEBER', 'NIERE', 'LUNGE',
  'ADERN', 'BUSEN', 'HODEN', 'PENIS', 'TITTE', 'ARSCH',
  // colours & sound & books
  'FARBE', 'BRAUN', 'BEIGE', 'KLANG', 'MUSIK', 'GEIGE', 'FLÖTE', 'HARFE',
  'NOTEN', 'TÄNZE', 'SPIEL', 'BÄLLE', 'KARTE', 'PUPPE', 'BRIEF', 'SEITE',
  'ZEILE', 'WORTE', 'SILBE', 'REIME', 'VERSE', 'ROMAN', 'KRIMI', 'FABEL',
  'STIFT', 'TINTE', 'FEDER', 'HEFTE', 'BUCHE',
  // time & place
  'NACHT', 'ABEND', 'WOCHE', 'MONAT', 'JAHRE', 'DATUM', 'UHREN', 'SÜDEN',
  'OSTEN', 'LINKS',
  // qualities
  'KLEIN', 'BREIT', 'LANGE', 'KURZE', 'TIEFE', 'RUNDE', 'ECKIG', 'SPITZ',
  'GLATT', 'WEICH', 'HARTE', 'SCHÖN', 'LIEBE', 'GUTEN', 'FROHE', 'LEISE',
  'LAUTE', 'WARME', 'KALTE',
  // verbs
  'GEHEN', 'SEHEN', 'LEBEN', 'HÖREN', 'LESEN', 'REDEN', 'RUFEN', 'BADEN',
  'LEGEN', 'SAGEN', 'TAGEN', 'MALEN', 'HOLEN', 'NÄHEN',
];

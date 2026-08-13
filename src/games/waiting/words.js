// Curated German 5-letter words for the waiting-screen word game.
//
// This single list serves two roles: the pool the puzzle answer is drawn from,
// AND the set of accepted guesses (so players can't brute-force by typing five
// random letters). Everyday vocabulary only — no technical jargon, no
// discriminatory terms; mildly crude everyday words are fine.
//
// Rules for entries (checked by scripts/check-words.js):
//   - nouns in the SINGULAR only — no plurals, no adjectives, no verbs, so
//     every answer is guessable as one clear dictionary form
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
  'ERBSE', 'LINSE', 'SALAT', 'KRAUT', 'TORTE', 'HONIG', 'SAHNE', 'MILCH',
  'QUARK', 'ESSIG', 'PIZZA', 'NUDEL', 'SUPPE', 'WURST', 'SPECK', 'KAKAO',
  'SAUCE', 'SIRUP', 'ESSEN',
  // sky & weather
  'SONNE', 'STERN', 'WOLKE', 'REGEN', 'STURM', 'BLITZ', 'NEBEL', 'HAGEL',
  'FROST', 'WÄRME', 'KÄLTE', 'DAMPF', 'RAUCH', 'ASCHE', 'LICHT', 'DUNST',
  'ORKAN', 'KOMET', 'GLANZ', 'FEUER',
  // water & land
  'WELLE', 'KÜSTE', 'INSEL', 'TEICH', 'FLUSS', 'SUMPF', 'HÜGEL', 'WIESE',
  'ACKER', 'ERNTE', 'STEIN', 'KOHLE', 'EISEN', 'STAHL', 'STAUB', 'HÖHLE',
  'WÜSTE', 'EBENE', 'KLUFT', 'GRUND', 'STROM', 'STROH', 'RASEN',
  // plants & trees
  'BLUME', 'TULPE', 'ASTER', 'ZWEIG', 'BLÜTE', 'BLATT', 'TANNE', 'BIRKE',
  'EICHE', 'AHORN', 'LINDE', 'BUCHE', 'RINDE', 'PALME', 'LILIE', 'SAMEN',
  'STIEL', 'RANKE',
  // home & things
  'TISCH', 'STUHL', 'REGAL', 'LAMPE', 'KERZE', 'TASSE', 'GABEL', 'KANNE',
  'EIMER', 'BESEN', 'LEDER', 'HÜTTE', 'DIELE', 'KÜCHE', 'STUFE', 'SCHAL',
  'KNOPF', 'NADEL', 'FADEN', 'STOFF', 'SEIDE', 'WOLLE', 'KISTE', 'KETTE',
  'TRUHE', 'LAKEN', 'KABEL', 'HEBEL', 'HAKEN', 'TAFEL', 'TASTE', 'KAMIN',
  'MAUER', 'SÄULE', 'VILLA', 'HALLE', 'KELLE', 'ZANGE', 'WANNE', 'PUDER',
  // town & work
  'STADT', 'GASSE', 'PLATZ', 'MARKT', 'LADEN', 'KIOSK', 'BÜHNE', 'HAFEN',
  'WERFT', 'KREIS', 'STAAT', 'STALL', 'LAGER', 'KASSE', 'MIETE', 'MESSE',
  // animals
  'TIGER', 'ZEBRA', 'KAMEL', 'PFERD', 'ZIEGE', 'RATTE', 'KATZE', 'DACHS',
  'OTTER', 'BIBER', 'ROBBE', 'VOGEL', 'ADLER', 'SPATZ', 'MEISE', 'AMSEL',
  'PUDEL', 'FISCH', 'HECHT', 'KRAKE', 'BIENE', 'WESPE', 'MÜCKE', 'KÄFER',
  'RAUPE', 'FUCHS', 'FALKE', 'TAUBE', 'SCHAF', 'KATER', 'KREBS', 'HERDE',
  // clothes
  'KLEID', 'JACKE', 'SOCKE', 'MÜTZE', 'HAUBE', 'WESTE', 'FRACK', 'SCHUH',
  'KAPPE', 'SOHLE', 'ANZUG',
  // body
  'STIRN', 'LIPPE', 'ZUNGE', 'BRUST', 'BAUCH', 'LEBER', 'NIERE', 'LUNGE',
  'BUSEN', 'HODEN', 'PENIS', 'TITTE', 'ARSCH', 'MAGEN', 'NABEL', 'NAGEL',
  'KEHLE', 'WANGE', 'FERSE', 'RIPPE', 'LOCKE', 'KLAUE',
  // music, books & play
  'FARBE', 'KLANG', 'MUSIK', 'GEIGE', 'FLÖTE', 'HARFE', 'SPIEL', 'KARTE',
  'PUPPE', 'BRIEF', 'SEITE', 'ZEILE', 'SILBE', 'ROMAN', 'KRIMI', 'FABEL',
  'STIFT', 'TINTE', 'FEDER', 'TITEL', 'THEMA', 'ZITAT', 'NOTIZ', 'LISTE',
  'KOPIE', 'ORGEL', 'SAITE', 'RADIO', 'POKAL', 'PARTY', 'SZENE',
  // time
  'NACHT', 'ABEND', 'WOCHE', 'MONAT', 'DATUM', 'SÜDEN', 'OSTEN', 'WEILE',
  'DAUER', 'FRIST', 'MITTE', 'PAUSE', 'REISE',
  // people
  'KÖNIG', 'PRINZ', 'VATER', 'TANTE', 'ONKEL', 'NEFFE', 'JUNGE', 'WITWE',
  'ZEUGE', 'KUNDE', 'PILOT', 'ZWERG', 'RIESE', 'ENGEL', 'FIRMA',
  // ideas & feelings
  'LIEBE', 'LEBEN', 'ZWECK', 'GLÜCK', 'TRAUM', 'KRAFT', 'KUNST', 'RECHT',
  'REGEL', 'SACHE', 'SORGE', 'WILLE', 'WÜRDE', 'SICHT', 'MENGE', 'SUMME',
  'PREIS', 'PROBE', 'FRAGE', 'LEHRE', 'LOGIK', 'MAGIE', 'PANIK', 'HUMOR',
  'JUBEL', 'GESTE', 'WESEN', 'SEELE', 'GEIST', 'KRIEG', 'KAMPF', 'KRONE',
  'LAUNE', 'WONNE', 'DRAHT', 'BRAUT', 'SUCHE', 'ANGST', 'WETTE', 'TRICK',

  // --- second batch -------------------------------------------------------
  // more everyday singular nouns, same rules as above
  'AKTIE', 'ALARM', 'ALBUM', 'ALTAR', 'AMPEL', 'ANGEL', 'ANKER', 'APRIL',
  'ARENA', 'ATLAS', 'AUTOR', 'BACKE', 'BAHRE', 'BANDE', 'BANJO', 'BARKE',
  'BARON', 'BASIS', 'BAUER', 'BEUTE', 'BLASE', 'BLECH', 'BLICK', 'BLOCK',
  'BLUSE', 'BODEN', 'BOGEN', 'BOMBE', 'BONUS', 'BORKE', 'BOTIN', 'BRAND',
  'BRETT', 'BRUCH', 'BRÜHE', 'BUCHT', 'BÜGEL', 'BULLE', 'BUSCH', 'CHAOS',
  'CREME', 'CURRY', 'DATEI', 'DECKE', 'DEGEN', 'DELLE', 'DINER', 'DIODE',
  'DOGGE', 'DOHLE', 'DOLCH', 'DRAMA', 'DRANG', 'DRUCK', 'DURST', 'ECHSE',
  'EDIKT', 'EITER', 'EKLAT', 'ELEND', 'ELITE', 'EMAIL', 'ENKEL', 'ETAGE',
  'EXTRA', 'FÄHRE', 'FALLE', 'FALTE', 'FARCE', 'FASAN', 'FASER', 'FAUST',
  'FEIER', 'FELGE', 'FIBER', 'FIGUR', 'FILET', 'FINTE', 'FJORD', 'FLAIR',
  'FLECK', 'FLEIß', 'FLIRT', 'FEIGE', 'FLUCH', 'FOLGE', 'FOLIE', 'FORKE',
  'FORUM', 'FUNKE', 'FUROR', 'GALLE', 'GAMMA', 'GARBE', 'GARDE', 'GATTE',
  'GEBET', 'GEIER', 'GELEE', 'GEMÜT', 'GENIE', 'GERTE', 'GLEIS', 'GLIED',
  'GNADE', 'GRAMM', 'GRAPH', 'GRAUS', 'GREIS', 'GRIFF', 'GRILL', 'GROLL',
  'GRUBE', 'GRUFT', 'HAFER', 'HANDY', 'HAUCH', 'HAUPT', 'HECKE', 'HEIDE',
  'HENNE', 'HOBEL', 'HORDE', 'HORST', 'HOTEL', 'HÜLLE', 'HÜRDE', 'HYMNE',
  'IDEAL', 'IMKER', 'INDEX', 'INTRO', 'JEANS', 'JOKER', 'JUWEL', 'KÄFIG',
  'KANAL', 'KANTE', 'KEGEL', 'KELCH', 'KERBE', 'KEULE', 'KLAGE', 'KLEIE',
  'KLIMA', 'KLOTZ', 'KNALL', 'KNAUF', 'KOMMA', 'KRANZ', 'KREUZ', 'KUGEL',
  'KURVE', 'KUTTE', 'LANZE', 'LASER', 'LATTE', 'LEHNE', 'LEIER', 'LEINE',
  'LINIE', 'LITER', 'LOBBY', 'LOTSE', 'LÖWIN', 'LÜCKE', 'LUXUS', 'MACHT',
  'MAKEL', 'MALER', 'MARKE', 'MASKE', 'MASSE', 'MATTE', 'MEILE', 'METER',
  'MIENE', 'MINZE', 'MODEM', 'MOLKE', 'MÖNCH', 'MOPED', 'MORAL', 'MOTIV',
  'MOTOR', 'MÜHLE', 'NARBE', 'NEIGE', 'OPFER', 'ORDEN', 'PAKET', 'PAPST',
  'PASTE', 'PATIN', 'PEDAL', 'PERLE', 'PFAHL', 'PFEIL', 'PFLUG', 'PFOTE',
  'PINIE', 'PIRAT', 'PISTE', 'PROSA', 'PULLI', 'PUNKT', 'QUOTE', 'RASSE',
  'RAUTE', 'REIHE', 'RINNE', 'ROLLE', 'RUBIN', 'RUDER', 'RUINE', 'RUMPF',
  'SALBE', 'SALON', 'SEGEL', 'SEKTE', 'SITTE', 'SKALA', 'SPALT', 'STAMM',
  'STAND', 'STOCK', 'STÜCK', 'TALER', 'TEMPO', 'TENOR', 'THRON', 'TIARA',
  'TOAST', 'TONNE', 'TREND', 'TRIEB', 'TROPF', 'TURBO', 'UNION', 'VIDEO',
  'VIRUS', 'VISUM', 'WAAGE', 'WACHE', 'WAGEN', 'WALZE', 'WARZE', 'WEBER',
  'WICHT', 'WIEGE', 'WUNDE', 'ZELLE', 'ZWIRN',

  // --- third batch (contributed) ------------------------------------------
  'ADMIN', 'AFTER', 'AIOLI', 'ALPHA', 'ANBAU', 'BACON', 'BAFÖG', 'BIEST',
  'BINDE', 'BLUFF', 'BOHLE', 'COUCH', 'DEKOR', 'DEMUT', 'DRALL', 'DUDEN',
  'DÖNER', 'ELFIN', 'ERKER', 'FOKUS', 'FRUST', 'FUTON', 'FUTUR', 'GEBOT',
  'GRIPS', 'HILFE', 'HOBBY', 'HYÄNE', 'HÖRER', 'INDIZ', 'JUROR', 'JÄGER',
  'KEBAP', 'KLAPS', 'KRÖTE', 'LACHE', 'LENDE', 'LEPRA', 'LOKAL', 'LOKUS',
  'LOLLI', 'LÄNGE', 'MACKE', 'MIXER', 'MÖBEL', 'OPIUM', 'ORGAN', 'PAMPE',
  'PATTE', 'PENNE', 'PENNY', 'PETZE', 'PHASE', 'PIANO', 'PLANE', 'POKER',
  'POPEL', 'PORNO', 'PROFI', 'PUMPE', 'RACHE', 'REIFE', 'RITZE', 'RUNDE',
  'RÖHRE', 'SCHOß', 'SERIE', 'SESAM', 'SPEZI', 'SPINT', 'SPION', 'STREU',
  'STUBE', 'TANGO', 'TOKEN', 'TUMOR', 'TUTOR', 'ULTRA', 'VENUS', 'WAFFE',
  'WAMPE', 'WEISE', 'WRACK', 'ZEDER', 'ZITZE', 'ZWIST',
  'KRACH', 'BITTE', 'WATTE', 'HUNNE', 'NONNE',
];

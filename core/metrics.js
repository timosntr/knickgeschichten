// Internal metrics collector for Knickgeschichten.
//
// Produces an aggregate, fully anonymous snapshot of the instance — counts
// only, no names, no story text — for a private dashboard and Prometheus.
// Two families of numbers:
//
//   live       real-time gauges read straight from memory (connected sockets,
//              sessions in progress, people currently mid-turn)
//   cumulative lifetime totals (stories, lines, words, chars, likes). These
//              scan every lobby we know about: the ones still in memory *and*
//              the ones already culled from memory but still saved on disk.
//              The disk part is cached briefly so a 5s dashboard poll or a
//              Prometheus scrape doesn't re-read the save files every time.
//
// The counts are also broken down by session kind — 'public' (async) vs
// 'private' (sync) — since the two are different activities and mixing them
// hides both. The derived averages and the length/duration distributions stay
// combined: they describe how people write, which doesn't differ by kind.
//
// Nothing here mutates game state; it only reads.

const Lobby = require('./Lobby');
const Persistence = require('./Persistence');
const MetricsState = require('./metricsState');

const DISK_CACHE_MS = Number(process.env.METRICS_CACHE_MS) || 10000;

// Session kinds the counts are split by. A lobby's `isAsync` flag is the whole
// distinction: async lobbies are the public sessions, everything else private.
const KINDS = ['public', 'private'];
const kindOf = isAsync => (isAsync ? 'public' : 'private');

// Cumulative "le" bucket edges for the per-contribution length histograms.
// A contribution is capped at MAX_CONTRIBUTION = 300 chars and needs
// MIN_WORDS = 15 words, so the ranges are bounded and small.
const CHAR_BUCKETS = [25, 50, 75, 100, 150, 200, 250, 300];
const WORD_BUCKETS = [15, 20, 25, 30, 40, 50, 60];

function wordCount(s) {
  const t = (s || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

// Empty cumulative-count array for a set of histogram bucket edges.
function zeroBuckets(edges) {
  return new Array(edges.length).fill(0);
}

// Tally lines/words/chars/likes over a list of chains. Works for both live
// Chain instances and plain objects parsed from a save file — both expose
// `.chain` (array of line strings) and `.likes` (map of playerId -> bool).
function tallyChains(chains) {
  const t = {
    lines: 0, words: 0, chars: 0, likes: 0,
    charBuckets: zeroBuckets(CHAR_BUCKETS),
    wordBuckets: zeroBuckets(WORD_BUCKETS),
  };
  for (const c of chains || []) {
    for (const line of c.chain || []) {
      const chars = line.length;
      const words = wordCount(line);
      t.lines += 1;
      t.chars += chars;
      t.words += words;
      // Cumulative bucketing: each observation lands in every bucket whose
      // upper edge it doesn't exceed (Prometheus histogram semantics).
      for (let i = 0; i < CHAR_BUCKETS.length; i++)
        if (chars <= CHAR_BUCKETS[i]) t.charBuckets[i] += 1;
      for (let i = 0; i < WORD_BUCKETS.length; i++)
        if (words <= WORD_BUCKETS[i]) t.wordBuckets[i] += 1;
    }
    for (const v of Object.values(c.likes || {}))
      if (v) t.likes += 1;
  }
  return t;
}

function addTally(into, t) {
  into.lines += t.lines;
  into.words += t.words;
  into.chars += t.chars;
  into.likes += t.likes;
  for (let i = 0; i < into.charBuckets.length; i++)
    into.charBuckets[i] += t.charBuckets[i];
  for (let i = 0; i < into.wordBuckets.length; i++)
    into.wordBuckets[i] += t.wordBuckets[i];
}

// One kind's running totals: a chain tally plus the story counts.
function emptyAgg() {
  return {
    storiesCompleted: 0, storiesInProgress: 0,
    lines: 0, words: 0, chars: 0, likes: 0,
    charBuckets: zeroBuckets(CHAR_BUCKETS),
    wordBuckets: zeroBuckets(WORD_BUCKETS),
  };
}

// Merge aggs into a fresh one. Every story lands in exactly one kind, so the
// combined figures are just the sum — no lobby can be counted twice.
function mergeAggs(aggs) {
  const out = emptyAgg();
  for (const a of aggs) {
    out.storiesCompleted += a.storiesCompleted;
    out.storiesInProgress += a.storiesInProgress;
    addTally(out, a);
  }
  return out;
}

// The public count shape: one agg rendered as the numbers we actually publish.
function counts(agg) {
  return {
    storiesCompleted: agg.storiesCompleted,
    storiesInProgress: agg.storiesInProgress,
    // One chain entry is one contribution/turn.
    contributions: agg.lines,
    wordsWritten: agg.words,
    charsWritten: agg.chars,
    likes: agg.likes,
  };
}

// Classify a lobby (live or restored) from its chain tally + completion flag.
function classify(tally, completed) {
  if (completed) return 'completed';
  if (tally.lines > 0) return 'inProgress';
  return 'empty';
}

let diskCache = { at: 0, byCode: {} };

// Scan on-disk saves into a { code: {tally, completed, kind} } map, cached
// briefly.
function scanDisk() {
  const now = Date.now();
  if (now - diskCache.at < DISK_CACHE_MS) return diskCache.byCode;

  const byCode = {};
  for (const code of Persistence.listSaveCodes()) {
    let blob;
    try {
      blob = Persistence.restoreLobbyState(code);
    } catch (e) {
      continue; // unreadable/corrupt save — skip rather than break metrics
    }
    if (!blob || !blob.game || !blob.game.state) continue;
    byCode[code] = {
      tally: tallyChains(blob.game.state.chains),
      completed: blob.completedAt != null,
      // Saves predating the async flag are private lobbies — same fallback
      // Lobby.restoreState() uses.
      kind: kindOf(blob.isAsync),
    };
  }
  diskCache = { at: now, byCode };
  return byCode;
}

// Collect the full snapshot. `io` is the socket.io server (for the live socket
// count); it may be omitted in tests.
function collect(io) {
  // Lifetime totals kept apart per session kind; combined further down.
  const byKind = { public: emptyAgg(), private: emptyAgg() };

  const live = {
    onlineClients: io && io.engine ? io.engine.clientsCount : 0,
    publicSessionsActive: 0,
    privateSessionsActive: 0,
    writersNow: 0,
    writersNowPublic: 0,
    writersNowPrivate: 0,
  };

  const seen = new Set();

  // In-memory lobbies: fresh live numbers + their contribution to the totals.
  for (const code in Lobby.lobbies) {
    const l = Lobby.lobbies[code];
    if (!l || !l.game) continue;
    seen.add(code);

    const kind = kindOf(l.isAsync);
    const agg = byKind[kind];
    const chains = l.game.chains || [];
    const tally = tallyChains(chains);
    addTally(agg, tally);

    const completed = l.completedAt != null;
    // Pending sessions were never confirmed — not real stories or sessions.
    if (!l.pending) {
      const state = classify(tally, completed);
      if (state === 'completed') agg.storiesCompleted += 1;
      else if (state === 'inProgress') agg.storiesInProgress += 1;

      // "Active" = someone is actually connected right now, not merely restored
      // into memory. Async sessions sit empty between visits (that's the whole
      // model), and at boot every saved async lobby is loaded — so a
      // presence-based count is the only honest live gauge.
      if (!completed && l.players.some(p => p.connected && !!p.member)) {
        if (l.isAsync) live.publicSessionsActive += 1;
        else if (l.lobbyState === 'PLAYING') live.privateSessionsActive += 1;
      }
    }

    // People holding a pen right now: a chain assigned to a connected member.
    for (const c of chains) {
      if (c.editor && l.players.some(p => p.playerId === c.editor && p.connected)) {
        live.writersNow += 1;
        if (kind === 'public') live.writersNowPublic += 1;
        else live.writersNowPrivate += 1;
      }
    }
  }

  // On-disk saves that are no longer in memory (culled) — fold into totals only.
  const disk = scanDisk();
  for (const code in disk) {
    if (seen.has(code)) continue;
    const { tally, completed, kind } = disk[code];
    const agg = byKind[kind];
    addTally(agg, tally);
    const state = classify(tally, completed);
    if (state === 'completed') agg.storiesCompleted += 1;
    else if (state === 'inProgress') agg.storiesInProgress += 1;
  }

  const total = mergeAggs(KINDS.map(k => byKind[k]));
  const contributions = total.lines;
  const turnDuration = MetricsState.turnDurationSnapshot();
  return {
    live,
    cumulative: {
      ...counts(total),
      // Same counts split by session kind; each adds up to the totals above.
      byKind: {
        public: counts(byKind.public),
        private: counts(byKind.private),
      },
      // Handy scalars for the dashboard; the full distribution is in
      // `histograms`. Deliberately not split by kind — how long a contribution
      // is, and how long someone takes over it, is a property of writing
      // rather than of the session it happens in.
      avgContributionChars: contributions ? Math.round(total.chars / contributions) : 0,
      avgContributionWords: contributions ? Math.round(total.words / contributions) : 0,
      // Mean turn duration. In-memory (see metricsState) so it resets on
      // restart — the dashboard tile is labelled accordingly.
      avgTurnSeconds: turnDuration.count ? Math.round(turnDuration.sum / turnDuration.count) : 0,
    },
    histograms: {
      contributionChars: {
        edges: CHAR_BUCKETS, counts: total.charBuckets,
        sum: total.chars, count: contributions,
      },
      contributionWords: {
        edges: WORD_BUCKETS, counts: total.wordBuckets,
        sum: total.words, count: contributions,
      },
      turnDuration,
    },
    generatedAt: new Date().toISOString(),
  };
}

// Render the snapshot in Prometheus text exposition format.
function renderPrometheus(snap) {
  const lines = [];
  const labels = (l) => {
    const keys = Object.keys(l || {});
    return keys.length ? `{${keys.map(k => `${k}="${l[k]}"`).join(',')}}` : '';
  };
  const g = (name, help, value, l) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} gauge`);
    lines.push(`${name}${labels(l)} ${value}`);
  };
  // A gauge split into one series per session kind. Only the labelled series
  // are exported (no bare total alongside them) — a bare series would be
  // double-counted by `sum(...)`; use `sum without (kind) (...)` for the total.
  const gKind = (name, help, pick) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} gauge`);
    for (const kind of KINDS)
      lines.push(`${name}{kind="${kind}"} ${pick(kind)}`);
  };

  // Render a Prometheus histogram from cumulative "le" bucket counts. `buckets`
  // is an array of { le, count }; count/sum are the +Inf bucket and total.
  const hist = (name, help, buckets, sum, count) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} histogram`);
    for (const b of buckets)
      lines.push(`${name}_bucket{le="${b.le}"} ${b.count}`);
    lines.push(`${name}_bucket{le="+Inf"} ${count}`);
    lines.push(`${name}_sum ${sum}`);
    lines.push(`${name}_count ${count}`);
  };
  // Zip {edges, counts} into the { le, count } shape `hist` expects.
  const zipBuckets = (h) => h.edges.map((le, i) => ({ le, count: h.counts[i] }));

  g('kg_online_clients', 'Currently connected websocket clients', snap.live.onlineClients);
  g('kg_public_sessions_active', 'Public (async) sessions currently in progress', snap.live.publicSessionsActive);
  g('kg_private_sessions_active', 'Private (sync) sessions currently playing', snap.live.privateSessionsActive);
  gKind('kg_writers_now', 'Chains currently held by a connected editor, by session kind',
    kind => (kind === 'public' ? snap.live.writersNowPublic : snap.live.writersNowPrivate));

  // Lifetime counts, one series per session kind ('public' = async sessions,
  // 'private' = sync lobbies).
  const cum = kind => snap.cumulative.byKind[kind];
  gKind('kg_stories_completed', 'Stories finished (in memory + on disk), by session kind',
    kind => cum(kind).storiesCompleted);
  gKind('kg_stories_in_progress', 'Stories started but not yet finished, by session kind',
    kind => cum(kind).storiesInProgress);
  // Contributions (turns) — one chain entry each. Single count for it; summed
  // over both kinds it equals the length histograms' _count below.
  gKind('kg_contributions_total', 'Total contributions (turns) written, by session kind',
    kind => cum(kind).contributions);
  gKind('kg_words_written_total', 'Total words written, by session kind',
    kind => cum(kind).wordsWritten);
  gKind('kg_chars_written_total', 'Total characters written, by session kind',
    kind => cum(kind).charsWritten);
  gKind('kg_likes_total', 'Total likes, by session kind', kind => cum(kind).likes);

  // Distributions stay unsplit — they describe how people write, not which
  // kind of session they wrote in.
  const H = snap.histograms;
  hist('kg_contribution_length_chars', 'Characters per contribution',
    zipBuckets(H.contributionChars), H.contributionChars.sum, H.contributionChars.count);
  hist('kg_contribution_length_words', 'Words per contribution',
    zipBuckets(H.contributionWords), H.contributionWords.sum, H.contributionWords.count);
  // Turn duration is accumulated in memory since the last restart (see
  // metricsState.js), so unlike the counts above it resets on restart.
  hist('kg_turn_duration_seconds', 'Seconds from receiving a chain to submitting a contribution',
    H.turnDuration.buckets, H.turnDuration.sum, H.turnDuration.count);

  return lines.join('\n') + '\n';
}

module.exports = { collect, renderPrometheus, tallyChains, wordCount };

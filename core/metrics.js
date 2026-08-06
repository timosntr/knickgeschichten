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
// Nothing here mutates game state; it only reads.

const Lobby = require('./Lobby');
const Persistence = require('./Persistence');
const MetricsState = require('./metricsState');

const DISK_CACHE_MS = Number(process.env.METRICS_CACHE_MS) || 10000;

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

// Classify a lobby (live or restored) from its chain tally + completion flag.
function classify(tally, completed) {
  if (completed) return 'completed';
  if (tally.lines > 0) return 'inProgress';
  return 'empty';
}

let diskCache = { at: 0, byCode: {} };

// Scan on-disk saves into a { code: {tally, completed} } map, cached briefly.
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
    };
  }
  diskCache = { at: now, byCode };
  return byCode;
}

// Collect the full snapshot. `io` is the socket.io server (for the live socket
// count); it may be omitted in tests.
function collect(io) {
  const cumulative = {
    lines: 0, words: 0, chars: 0, likes: 0,
    charBuckets: zeroBuckets(CHAR_BUCKETS),
    wordBuckets: zeroBuckets(WORD_BUCKETS),
  };
  let storiesCompleted = 0, storiesInProgress = 0;

  const live = {
    onlineClients: io && io.engine ? io.engine.clientsCount : 0,
    publicSessionsActive: 0,
    privateSessionsActive: 0,
    writersNow: 0,
  };

  const seen = new Set();

  // In-memory lobbies: fresh live numbers + their contribution to the totals.
  for (const code in Lobby.lobbies) {
    const l = Lobby.lobbies[code];
    if (!l || !l.game) continue;
    seen.add(code);

    const chains = l.game.chains || [];
    const tally = tallyChains(chains);
    addTally(cumulative, tally);

    const completed = l.completedAt != null;
    // Pending sessions were never confirmed — not real stories or sessions.
    if (!l.pending) {
      const kind = classify(tally, completed);
      if (kind === 'completed') storiesCompleted += 1;
      else if (kind === 'inProgress') storiesInProgress += 1;

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
      if (c.editor && l.players.some(p => p.playerId === c.editor && p.connected))
        live.writersNow += 1;
    }
  }

  // On-disk saves that are no longer in memory (culled) — fold into totals only.
  const disk = scanDisk();
  for (const code in disk) {
    if (seen.has(code)) continue;
    const { tally, completed } = disk[code];
    addTally(cumulative, tally);
    const kind = classify(tally, completed);
    if (kind === 'completed') storiesCompleted += 1;
    else if (kind === 'inProgress') storiesInProgress += 1;
  }

  // One chain entry is one contribution/turn. This is the single count for it
  // (the old kg_lines_written_total was the same number and was dropped).
  const contributions = cumulative.lines;
  const turnDuration = MetricsState.turnDurationSnapshot();
  return {
    live,
    cumulative: {
      storiesCompleted,
      storiesInProgress,
      contributions,
      wordsWritten: cumulative.words,
      charsWritten: cumulative.chars,
      likes: cumulative.likes,
      // Handy scalars for the dashboard; the full distribution is in `histograms`.
      avgContributionChars: contributions ? Math.round(cumulative.chars / contributions) : 0,
      avgContributionWords: contributions ? Math.round(cumulative.words / contributions) : 0,
      // Mean turn duration. In-memory (see metricsState) so it resets on
      // restart — the dashboard tile is labelled accordingly.
      avgTurnSeconds: turnDuration.count ? Math.round(turnDuration.sum / turnDuration.count) : 0,
    },
    histograms: {
      contributionChars: {
        edges: CHAR_BUCKETS, counts: cumulative.charBuckets,
        sum: cumulative.chars, count: contributions,
      },
      contributionWords: {
        edges: WORD_BUCKETS, counts: cumulative.wordBuckets,
        sum: cumulative.words, count: contributions,
      },
      turnDuration,
    },
    generatedAt: new Date().toISOString(),
  };
}

// Render the snapshot in Prometheus text exposition format.
function renderPrometheus(snap) {
  const lines = [];
  const g = (name, help, value) => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} gauge`);
    lines.push(`${name} ${value}`);
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
  g('kg_writers_now', 'Chains currently held by a connected editor', snap.live.writersNow);

  g('kg_stories_completed', 'Stories finished (in memory + on disk)', snap.cumulative.storiesCompleted);
  g('kg_stories_in_progress', 'Stories started but not yet finished', snap.cumulative.storiesInProgress);
  // Contributions (turns) — one chain entry each. Single count for it; equals
  // the length histograms' _count below.
  g('kg_contributions_total', 'Total contributions (turns) written across all stories', snap.cumulative.contributions);
  g('kg_words_written_total', 'Total words written across all stories', snap.cumulative.wordsWritten);
  g('kg_chars_written_total', 'Total characters written across all stories', snap.cumulative.charsWritten);
  g('kg_likes_total', 'Total likes across all stories', snap.cumulative.likes);

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

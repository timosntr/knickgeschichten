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

const DISK_CACHE_MS = Number(process.env.METRICS_CACHE_MS) || 10000;

function wordCount(s) {
  const t = (s || '').trim();
  return t ? t.split(/\s+/).length : 0;
}

// Tally lines/words/chars/likes over a list of chains. Works for both live
// Chain instances and plain objects parsed from a save file — both expose
// `.chain` (array of line strings) and `.likes` (map of playerId -> bool).
function tallyChains(chains) {
  const t = { lines: 0, words: 0, chars: 0, likes: 0 };
  for (const c of chains || []) {
    for (const line of c.chain || []) {
      t.lines += 1;
      t.chars += line.length;
      t.words += wordCount(line);
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
  const cumulative = { lines: 0, words: 0, chars: 0, likes: 0 };
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

  return {
    live,
    cumulative: {
      storiesCompleted,
      storiesInProgress,
      linesWritten: cumulative.lines,
      wordsWritten: cumulative.words,
      charsWritten: cumulative.chars,
      likes: cumulative.likes,
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

  g('kg_online_clients', 'Currently connected websocket clients', snap.live.onlineClients);
  g('kg_public_sessions_active', 'Public (async) sessions currently in progress', snap.live.publicSessionsActive);
  g('kg_private_sessions_active', 'Private (sync) sessions currently playing', snap.live.privateSessionsActive);
  g('kg_writers_now', 'Chains currently held by a connected editor', snap.live.writersNow);

  g('kg_stories_completed', 'Stories finished (in memory + on disk)', snap.cumulative.storiesCompleted);
  g('kg_stories_in_progress', 'Stories started but not yet finished', snap.cumulative.storiesInProgress);
  g('kg_lines_written_total', 'Total lines written across all stories', snap.cumulative.linesWritten);
  g('kg_words_written_total', 'Total words written across all stories', snap.cumulative.wordsWritten);
  g('kg_chars_written_total', 'Total characters written across all stories', snap.cumulative.charsWritten);
  g('kg_likes_total', 'Total likes across all stories', snap.cumulative.likes);

  return lines.join('\n') + '\n';
}

module.exports = { collect, renderPrometheus, tallyChains, wordCount };

// Small, dependency-free holder for event-driven metrics that can't be derived
// by scanning stored state at scrape time.
//
// Currently just turn duration: the wall-clock time from a chain being handed
// to a player (assignChain) until they submit their contribution. The counts in
// metrics.js are recomputed from the stored stories on every scrape, so they
// survive restarts on their own; this one cannot be recomputed, because
// chain.assignedAt is deliberately ephemeral and no per-contribution timestamp
// is saved. So the running totals are kept in memory and mirrored to a tiny
// file (load() at boot, flush() periodically and on exit) — otherwise every
// deploy would put the dashboard's average back to zero for good.
//
// Still fully anonymous: only durations, no identities, no text.

const fs = require('fs');

// Upper bucket edges in seconds (cumulative "le" buckets; +Inf added on render).
const TURN_DURATION_BUCKETS = [5, 10, 20, 30, 60, 120, 300, 600];

// Lives next to the lobby saves. Not a .json.gz, so neither the save globbing
// in Persistence nor the async-restore scan in main.js can pick it up.
const SAVE_PATH = 'persistence/turn-metrics.json';

const turn = {
  counts: new Array(TURN_DURATION_BUCKETS.length).fill(0),
  sum: 0,
  count: 0,
};

let dirty = false;

// Record one completed turn. Ignores nonsense (negative / NaN / Infinity).
function recordTurnDuration(seconds) {
  if (typeof seconds !== 'number' || !isFinite(seconds) || seconds < 0) return;
  turn.count += 1;
  turn.sum += seconds;
  for (let i = 0; i < TURN_DURATION_BUCKETS.length; i++)
    if (seconds <= TURN_DURATION_BUCKETS[i]) turn.counts[i] += 1;
  dirty = true;
}

// Snapshot for the renderer: cumulative bucket counts + sum + total count.
function turnDurationSnapshot() {
  return {
    buckets: TURN_DURATION_BUCKETS.map((le, i) => ({ le, count: turn.counts[i] })),
    sum: turn.sum,
    count: turn.count,
  };
}

const isCount = n => typeof n === 'number' && isFinite(n) && n >= 0;

// Restore the totals from disk. Anything we cannot fully trust is discarded
// rather than half-applied: a wrong lifetime average is worse than a fresh one,
// and this is metrics — never worth failing a boot over.
function load() {
  let blob;
  try {
    if (!fs.existsSync(SAVE_PATH)) return false;
    blob = JSON.parse(fs.readFileSync(SAVE_PATH, 'utf8'));
  } catch (e) {
    console.log(new Date(), `!- turn metrics not restored (${e.message})`);
    return false;
  }

  // Bucket edges are part of the data: if they are ever retuned, the stored
  // counts mean something different and cannot be carried over.
  const edgesMatch = Array.isArray(blob.edges)
    && blob.edges.length === TURN_DURATION_BUCKETS.length
    && blob.edges.every((e, i) => e === TURN_DURATION_BUCKETS[i]);
  const countsOk = Array.isArray(blob.counts)
    && blob.counts.length === TURN_DURATION_BUCKETS.length
    && blob.counts.every(isCount);

  if (blob.version !== 1 || !edgesMatch || !countsOk || !isCount(blob.sum) || !isCount(blob.count)) {
    console.log(new Date(), '!- turn metrics discarded (incompatible or corrupt)');
    return false;
  }

  turn.counts = blob.counts.slice();
  turn.sum = blob.sum;
  turn.count = blob.count;
  console.log(new Date(), `-- restored turn metrics (${turn.count} turns)`);
  return true;
}

// Write the totals out (atomic: .tmp then rename). No-op when nothing changed,
// so the 5-minute tick costs nothing on a quiet instance. Safe to call from an
// exit handler — writeFileSync only.
function flush() {
  if (!dirty) return false;
  try {
    const data = JSON.stringify({
      version: 1,
      edges: TURN_DURATION_BUCKETS,
      counts: turn.counts,
      sum: turn.sum,
      count: turn.count,
    });
    fs.writeFileSync(SAVE_PATH + '.tmp', data);
    fs.renameSync(SAVE_PATH + '.tmp', SAVE_PATH);
    dirty = false;
    return true;
  } catch (e) {
    console.log(new Date(), `!- turn metrics not saved (${e.message})`);
    return false;
  }
}

module.exports = {
  recordTurnDuration,
  turnDurationSnapshot,
  load,
  flush,
  TURN_DURATION_BUCKETS,
  SAVE_PATH,
};

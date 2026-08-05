// Small, dependency-free holder for event-driven metrics that can't be derived
// by scanning stored state at scrape time.
//
// Currently just turn duration: the wall-clock time from a chain being handed
// to a player (assignChain) until they submit their contribution. Unlike the
// counts in metrics.js — which are recomputed from stored stories on every
// scrape and therefore survive restarts — this is accumulated in memory and
// resets when the process restarts. A Prometheus histogram handles that reset
// fine. Still fully anonymous: only durations, no identities, no text.

// Upper bucket edges in seconds (cumulative "le" buckets; +Inf added on render).
const TURN_DURATION_BUCKETS = [5, 10, 20, 30, 60, 120, 300, 600];

const turn = {
  counts: new Array(TURN_DURATION_BUCKETS.length).fill(0),
  sum: 0,
  count: 0,
};

// Record one completed turn. Ignores nonsense (negative / NaN / Infinity).
function recordTurnDuration(seconds) {
  if (typeof seconds !== 'number' || !isFinite(seconds) || seconds < 0) return;
  turn.count += 1;
  turn.sum += seconds;
  for (let i = 0; i < TURN_DURATION_BUCKETS.length; i++)
    if (seconds <= TURN_DURATION_BUCKETS[i]) turn.counts[i] += 1;
}

// Snapshot for the renderer: cumulative bucket counts + sum + total count.
function turnDurationSnapshot() {
  return {
    buckets: TURN_DURATION_BUCKETS.map((le, i) => ({ le, count: turn.counts[i] })),
    sum: turn.sum,
    count: turn.count,
  };
}

module.exports = { recordTurnDuration, turnDurationSnapshot, TURN_DURATION_BUCKETS };

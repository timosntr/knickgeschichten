const _ = require('lodash');
const pako = require('pako');
const fs = require('fs');
const glob = require('glob');

// ~1 month expire time
const EXPIRE_TIME = 1000 * 60 * 60 * 24 * 30;

const saveName = code => `persistence/${code}.json.gz`;
// Legacy name used before gzip migration
const legacySaveName = code => `persistence/${code}.json.zip`;

// determine if there is a file named after a lobby code
function saveExists(code) {
  return fs.existsSync(saveName(code)) || fs.existsSync(legacySaveName(code));
}

// Read a save far enough to decide whether it may ever be deleted.
// Returns true only when we could read the file AND it is a private lobby.
// Anything we cannot parse counts as "not expendable": a save we are unable to
// inspect is never thrown away, because that is exactly the case where we
// would be destroying something we can no longer recover.
function isExpendableSave(filename) {
  try {
    const raw = fs.readFileSync(filename);
    const text = filename.endsWith('.gz')
      ? pako.ungzip(raw, { to: 'string' })
      : pako.inflate(raw, { to: 'string' });
    const state = JSON.parse(text);
    // Public (async) sessions ARE the archive — finished or still running, they
    // are the content of the site and must outlive the expiry window. Only
    // private lobbies are temporary scratch state.
    return !state.isAsync;
  } catch (e) {
    console.log(new Date(), `!- keeping unreadable save ${filename} (cannot classify)`);
    return false;
  }
}

// remove an expired lobby
function cullSave(filename) {
  try {
    const stat = fs.statSync(filename);
    if (Date.now() - EXPIRE_TIME > stat.ctime) {
      // Age alone is not enough. A finished public story is only rewritten
      // while somebody has it open, so its ctime stops moving as soon as the
      // last reader leaves — after 30 quiet days it looked "expired" and was
      // deleted, silently emptying the archive.
      if (!isExpendableSave(filename))
        return false;
      fs.unlinkSync(filename);
      return true;
    }
  } catch (e) {}

  return false;
}

// attempt to cull the saves (both new .json.gz and legacy .json.zip)
function cullSaves() {
  const files = [
    ...glob.sync(saveName('*'), {}),
    ...glob.sync(legacySaveName('*'), {}),
  ];
  let count = 0;
  for (const f of files) {
    if (cullSave(f))
      ++count;
  }
  if (count > 0)
    console.log(new Date(), '!- culled', count, 'old saves');
  return count;
}

// save a lobby state to gzip-compressed file (atomic: write to .tmp then rename)
function saveLobbyState(lobby) {
  // Safety net: never overwrite an existing async save with a null-game state.
  // If an async lobby has no game in memory but a save already exists on disk,
  // that on-disk file holds the real (in-progress) story — clobbering it with
  // null would destroy it. Preserve the file instead.
  if (lobby.isAsync && !lobby.game && saveExists(lobby.code)) {
    console.log(new Date(), `-- [lobby ${lobby.code}] save skipped (no game in memory; preserving on-disk story)`);
    return;
  }
  console.log(new Date(), `-- [lobby ${lobby.code}] saved`);
  const state = lobby.saveState();
  const data = pako.gzip(JSON.stringify(state));
  const finalPath = saveName(lobby.code);
  const tmpPath = finalPath + '.tmp';
  fs.writeFileSync(tmpPath, data);
  fs.renameSync(tmpPath, finalPath);
}

// decompress a lobby save file (supports both new gzip and legacy zlib format)
function restoreLobbyState(code) {
  let data, state;

  if (fs.existsSync(saveName(code))) {
    data = fs.readFileSync(saveName(code));
    state = JSON.parse(pako.ungzip(data, {to: 'string'}));
  } else {
    // Fall back to legacy zlib format (.json.zip)
    data = fs.readFileSync(legacySaveName(code));
    state = JSON.parse(pako.inflate(data, {to: 'string'}));
  }

  return state;
}

// List the lobby codes that currently have a save file on disk (both the new
// gzip and the legacy zlib format). Used by the metrics collector to fold
// culled-from-memory stories back into the cumulative totals.
function listSaveCodes() {
  const codes = new Set();
  for (const f of [...glob.sync(saveName('*'), {}), ...glob.sync(legacySaveName('*'), {})]) {
    const m = /([^/\\]+)\.json\.(?:gz|zip)$/.exec(f);
    if (m) codes.add(m[1]);
  }
  return [...codes];
}

module.exports = {
  saveExists,
  saveLobbyState,
  restoreLobbyState,
  listSaveCodes,
  cullSaves,
};

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

// remove an expired lobby
function cullSave(filename) {
  try {
    const stat = fs.statSync(filename);
    if (Date.now() - EXPIRE_TIME > stat.ctime) {
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

module.exports = {
  saveExists,
  saveLobbyState,
  restoreLobbyState,
  cullSaves,
};

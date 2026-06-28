const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');
const path = require('path');
const cron = require('node-cron');
const glob = require('glob');
const Sanitize = require('./core/games/util/Sanitize');

const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const PORT = process.env.PORT || 8080;

const VERSION = require('./package.json').version;

app.use(express.static('./public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ strict:  true }));

const Member = require('./core/Member');
const Lobby = require('./core/Lobby');
const Persistence = require('./core/Persistence');
const GAMES = require('./gameInfo.js');

let asyncSessionCounter = 0;

const EMOTES = [
  'smile',
  'meh',
  'frown',
  'heart',
  'bug',
  'hand rock',
  'hand paper',
  'hand scissors',
  'question',
  'exclamation',
  'wait',
  'write',
  'check',
  'times',
  'thumbs up',
  'thumbs down',
];

io.on('connection', socket => {
  const player = new Member(socket);
  socket.emit('member:id', player.id);
  socket.emit('version', VERSION);

  socket.on('member:name', name => {
    if(!player.lobby) {
      socket.emit('lobby:leave');
      return;
    }
    player.interact();

    // remove zero width no break spaces, trim spaces
    name = name.replace(/[\u200B-\u200D\uFEFF\n\t]/g, '').trim()

    const isAsync = player.lobby && player.lobby.isAsync;
    if((isAsync ? name.length < 16 : name.length > 0 && name.length < 16)) {
      player.name = name;
      socket.emit('member:nameOk', true);
      if(player.lobby) {
        player.lobby.updateMembers();
        player.lobby.sendLobbyInfo();
        // Auto-start async sessions when first player joins (but not if stories are already completed)
        if (player.lobby.isAsync && player.lobby.lobbyState === 'WAITING' && player.lobby.players.length > 0 && !player.lobby.completedStories) {
          player.lobby.startGame();
          console.log(new Date(), `-- [lobby ${player.lobby.code}] async session auto-started`);
        }
        // Send completed stories to player joining a finished session
        if (player.lobby.completedStories) {
          socket.emit('story:result', player.lobby.completedStories);
        }
      }
    } else {
      socket.emit('member:nameOk', false);
    }
  });

  // Create a private sync lobby
  socket.on('lobby:create', () => {
    if(!player.lobby) {
      player.interact();
      const lobby = new Lobby();
      const code = lobby.code;
      player.lobby = lobby;
      Lobby.lobbies[code] = lobby;
      lobby.setGame('story');
      socket.emit('lobby:join', code);
      Lobby.lobbies[code].addMember(player);
      console.log(new Date(), `-- [lobby ${code}] created`);
    }
  });

  // Create a public async story session
  socket.on('lobby:create:async', ({ config } = {}) => {
    if (player.lobby) return;

    player.interact();
    const code = Lobby.newCode();
    const lobby = new Lobby();
    lobby.code = code;
    lobby.isAsync = true;
    lobby.title = `Knickgeschichte ${++asyncSessionCounter}`;
    lobby.persist = true;
    lobby.selectedGame = 'story';

    // Initialize config from story defaults
    lobby.gameConfig = _.mapValues(GAMES.story.config, v => v.defaults);
    // Allow up to 256 contributors; async sessions always have exactly 1 story
    lobby.gameConfig.players = 256;
    lobby.gameConfig.numStories = 1;
    // Async sessions have a fixed 5 minute turn time limit
    lobby.gameConfig.timeLimit = 'min10';

    // Apply user-supplied config values for allowed fields
    if (config && typeof config === 'object') {
      for (const field of ['numStories', 'numLinks', 'timeLimit', 'anonymous']) {
        if (config[field] !== undefined) {
          lobby.setConfig(field, config[field]);
        }
      }
    }

    Lobby.lobbies[code] = lobby;
    player.lobby = lobby;
    socket.emit('lobby:join', code);
    lobby.addMember(player);
    console.log(new Date(), `-- [lobby ${code}] created async session "${lobby.title}"`);
  });

  // Allow players to request current lobby info
  socket.on('lobby:info', () => {
    if(player.lobby) {
      player.socket.emit('lobby:info', player.lobby.genLobbyInfo());
    }
  });

  // Allow players to request current lobby info
  socket.on('game:info', () => {
    const lobby = player.lobby;
    if(lobby && lobby.game) {
      const game = lobby.game;
      player.socket.emit('game:info', game.getState());
      lobby.getPlayerState(player.id);
    }
  });

  // Let a player join a lobby with a code
  socket.on('lobby:join', code => {
    code = code.toLowerCase();

    // Auto-leave any current WAITING lobby before joining.
    // Handles race where lobby:join arrives before the client's lobby:leave event —
    // e.g. when the HTTP lobby-exists check resolves faster than the WS leave frame.
    if (player.lobby && player.lobby.lobbyState === 'WAITING') {
      Lobby.removePlayer(player, true);
      player.autoLeftAt = Date.now();
    }

    if(!player.lobby && Lobby.lobbyExists(code)) {
      player.interact();

      // lobby is stored in persistence, load it into memory
      if (!Lobby.lobbies[code]) {
        console.log(new Date(), `-- [lobby ${code}] restored`);
        const saveData = Persistence.restoreLobbyState(code);
        const lobby = new Lobby(saveData);
        Lobby.lobbies[code] = lobby;
      }

      player.lobby = Lobby.lobbies[code];
      player.autoLeftAt = null;
      socket.emit('lobby:join', code);
      Lobby.lobbies[code].addMember(player);
    }
  });

  socket.on('lobby:replace', pid => {
    if(player.lobby) {
      player.interact();
      player.lobby.replacePlayer(player, pid);
    } else {
      socket.emit('lobby:leave');
    }
  });

  socket.on('lobby:emote', emote => {
    if(player.lobby) {
      const now = Date.now();
      if(now - player.lastEmote < 400 || !EMOTES.includes(emote))
        return;

      player.activity = now;
      player.lastEmote = now;
      player.lobby.emitAll('lobby:emote', player.id, emote);
    } else {
      socket.emit('lobby:leave');
    }
  });

  // Allow an admin player to change what game is being played
  socket.on('lobby:game:set', game => {
    if(player.isAdmin()) {
      player.lobby.setGame(game);
    }
  });

  // Allow an admin player to change what game is being played
  socket.on('game:start', game => {
    if(player.isAdmin()) {
      player.interact();
      player.lobby.startGame();
      if (player.lobby.game)
        console.log(new Date(), `-- [lobby ${player.lobby.code}] started game ${player.lobby.selectedGame}`);
    }
  });

  socket.on('game:end', game => {
    if(player.isAdmin()) {
      player.interact();
      const lobby = player.lobby;
      // For incomplete games, abort gracefully so players can read what was written
      if (lobby.game && lobby.game.getGameProgress() < 1) {
        lobby.game.abort();
        console.log(new Date(), `-- [lobby ${lobby.code}] game aborted by admin, showing partial results`);
      } else {
        lobby.endGame();
        console.log(new Date(), `-- [lobby ${lobby.code}] ended game ${lobby.selectedGame}`);
      }
    }
  });


  // Change the admin
  socket.on('lobby:admin:grant', targetId => {
    if(player.isAdmin() && targetId !== player.id) {
      player.interact();
      const targetPlayer = player.lobby.players.find(p => p.id === targetId);
      if(targetPlayer && targetPlayer.member) {
        player.lobby.admin = targetPlayer.id;
        player.lobby.sendLobbyInfo();
      }
    }
  });

  // Core gameplay messages
  socket.on('game:message', (type, data) => {
    if(player.lobby) {
      player.interact();
      // Error handling
      player.lobby.attempt(() => {
        player.lobby.gameMessage(player.id, type, data);
      });
    } else {
      socket.emit('lobby:leave');
    }
  });

  // Change game config if the player is an admin
  socket.on('lobby:game:config', (name, val) => {
    if(player.isAdmin()) {
      player.interact();
      // Error handling
      player.lobby.attempt(() => {
        player.lobby.setConfig(name, val);
      });
    }
  });

  // Leave the lobby if a player is in one
  socket.on('lobby:leave', () => {
    // Ignore stale leave events that arrive after the player already auto-rejoined
    // (race condition: lobby:join processed first, delayed lobby:leave would otherwise
    // remove the player from the lobby they just re-entered)
    if (player.autoLeftAt && Date.now() - player.autoLeftAt < 500) {
      player.autoLeftAt = null;
      return;
    }
    player.name = null;
    Lobby.removePlayer(player, true);
  });

  // Remove the player from a lobby on disconnection
  socket.on('disconnect', data => {
    Lobby.removePlayer(player);
    Member.removePlayer(player);
  });
});

// Determine if a lobby exists
app.get('/api/v1/lobby/:code', (req, res) => {
  const code = req.params.code.toLowerCase();
  if(Lobby.lobbyExists(code)) {
    res.status(200).json({
      message: 'Lobby Exists',
    });
  } else {
    res.status(404).json({
      message: 'Lobby Does Not Exist',
    });
  }
});

// Preview info for the invite landing page
app.get('/api/v1/lobby/:code/preview', (req, res) => {
  const code = req.params.code.toLowerCase();
  if (!Lobby.lobbyExists(code)) return res.status(404).json({ message: 'Not found' });

  if (!Lobby.lobbies[code]) {
    const saveData = Persistence.restoreLobbyState(code);
    const lobby = new Lobby(saveData);
    Lobby.lobbies[code] = lobby;
  }

  const l = Lobby.lobbies[code];
  const progress = l.game ? l.game.getGameProgress() : (l.completedStories ? 1 : 0);
  const isComplete = progress === 1;

  let teaser = '';
  if (!isComplete && l.game && l.game.chains) {
    const chain = l.game.chains[0];
    if (chain && chain.chain.length > 0) {
      const words = chain.chain[chain.chain.length - 1].trim().split(/\s+/);
      teaser = words.length > 8 ? '…' + words.slice(-8).join(' ') : words.join(' ');
    }
  }

  res.json({ title: l.title, teaser, isComplete, progress });
});

// List all public async sessions
app.get('/api/v1/lobbies', (req, res) => {
  res.json(Lobby.publicList());
});

// Fulltext search within completed story content
app.get('/api/v1/lobbies/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q) return res.json([]);

  const codes = [];
  for (const lobby of Object.values(Lobby.lobbies)) {
    if (!lobby || !lobby.isAsync || !lobby.completedStories) continue;
    outer: for (const story of lobby.completedStories) {
      for (const entry of story) {
        if ((entry.link || '').toLowerCase().includes(q)) {
          codes.push(lobby.code);
          break outer;
        }
      }
    }
  }
  res.json(codes);
});

// Quote of the day — one random sentence from completed public stories, changes daily
app.get('/api/v1/quote', (req, res) => {
  const sentences = [];
  for (const lobby of Object.values(Lobby.lobbies)) {
    if (!lobby || !lobby.isAsync || !lobby.completedStories) continue;
    for (const story of lobby.completedStories) {
      for (const entry of story) {
        if (!entry.link) continue;
        // Split entry into individual sentences
        const parts = entry.link.replace(/([.!?])\s+/g, '$1\n').split('\n');
        for (const s of parts) {
          const trimmed = s.trim();
          const wordCount = trimmed.split(/\s+/).filter(w => w.length > 0).length;
          if (trimmed.length >= 20 && wordCount >= 5) {
            // Preserve '' (anonymous sentinel); only undefined/null become null
            sentences.push({ text: trimmed, code: lobby.code, authorName: entry.authorName ?? null });
          }
        }
      }
    }
  }

  if (sentences.length === 0) return res.json(null);

  // Deterministic daily pick: hash today's date string into an index
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  let hash = 0;
  for (const ch of dateStr) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  res.json(sentences[hash % sentences.length]);
});

app.get('/api/v1/info', (req, res) => {
  let lobbies = 0, games = 0, players = 0, idleLobbies = 0, idlePlayers = 0, lobbyPlayers = 0, rocketcrabs = 0;
  const gameDistribution = {}, playerDistribution = {};

  for (const c in Lobby.lobbies) {
    const l = Lobby.lobbies[c];

    if (l.members.length > 1) {
      if (l.rocketcrab)
        ++rocketcrabs;

      if (l.game) {
        const game = l.selectedGame;
        const onlinePlayers = _.countBy(l.players, p => p.connected && !!p.member);

        if (!gameDistribution[l.selectedGame]) {
          gameDistribution[l.selectedGame] = 0;
          playerDistribution[l.selectedGame] = 0;
        }

        ++games;
        ++gameDistribution[l.selectedGame];
        playerDistribution[l.selectedGame] += l.members.length;
        players += l.members.length;
      } else {
        ++lobbies;
        lobbyPlayers += l.members.length;
      }
    } else {
      ++idleLobbies;
      idlePlayers += l.members.length;
    }
  }

  res.status(200).json({
    clients: io.engine.clientsCount, // number of connected sockets
    idleLobbies,
    idlePlayers,
    lobbies,
    lobbyPlayers,
    games,
    players,
    gameDistribution,
    playerDistribution,
    rocketcrabs,
  });
});

// rocketcrab api
app.post('/api/v1/rocketcrab', (req, res) => {
  const { game, version } = req.body;
  if (version !== 1) return res.status(426).json({message: 'Unsupported version'});
  if (!GAMES[game]) return res.status(404).json({message: 'Game not found'});

  // create an empty lobby prefixed with rc
  const code = Lobby.newCode('rc');
  const lobby = new Lobby();
  lobby.code = code;
  lobby.rocketcrab = true;
  lobby.setGame(game);
  Lobby.lobbies[code] = lobby;
  console.log(new Date(), `-- [${code}] created rocketcrab for ${game}`);

  // respond with the code
  return res.json({ code, version: 1 });
});

// handle the application closing - save lobbies if there are any
function exitHandler(options, exitCode) {
  // save all the current lobbies
  _.each(Lobby.lobbies, lobby => {
    if(lobby._saved)
      return;
    lobby._saved = true;
    Persistence.saveLobbyState(lobby);

    if(lobby.game) {
      lobby.game.stop();
      lobby.game.cleanup();
    }
  });

  if (options.cleanup) console.log('clean exit');
  if (exitCode || exitCode === 0) console.log('exit code', exitCode);
  if (options.exit) process.exit();
}

process.on('exit', exitHandler.bind(null,{cleanup:true}));
process.on('SIGINT', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

// Cull saves every monday at 4am lol
Persistence.cullSaves();
cron.schedule('0 0 4 * * Monday', Persistence.cullSaves);

// cull empty lobbies every minute
cron.schedule('0 * * * * *', Lobby.cullEmpty);
cron.schedule('0 * * * * *', Member.cullInactive);

// save active lobbies every 5 minutes to limit data loss on crash
cron.schedule('*/5 * * * *', () => {
  _.each(Lobby.lobbies, lobby => {
    if (!lobby.empty()) Persistence.saveLobbyState(lobby);
  });
});

// Every request goes through the index, Vue will handle 404s
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Restore async sessions from persistence on startup
try {
  const asyncSaveFiles = glob.sync('persistence/*.json.gz');
  let restored = 0;
  for (const file of asyncSaveFiles) {
    try {
      const code = path.basename(file, '.json.gz');
      if (Lobby.lobbies[code]) continue;
      const state = Persistence.restoreLobbyState(code);
      if (state.isAsync && (state.lobbyState === 'PLAYING' || state.completedStories)) {
        const lobby = Lobby.create(code, state);
        lobby.persist = true;
        ++restored;
      }
    } catch {}
  }
  asyncSessionCounter = Object.values(Lobby.lobbies)
    .filter(l => l && l.isAsync)
    .reduce((max, l) => {
      const m = /(\d+)\s*$/.exec(l.title || '');
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0);
  if (restored > 0)
    console.log(new Date(), `-- restored ${restored} async session(s), counter at ${asyncSessionCounter}`);
} catch {}

// Start the webserver
server.listen(PORT, () => console.log(`Started ${VERSION} server on :${PORT}!`));

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

    if(name.length > 0 && name.length < 16) {
      player.name = name;
      socket.emit('member:nameOk', true);
      if(player.lobby) {
        player.lobby.updateMembers();
        player.lobby.sendLobbyInfo();
        // Auto-start async sessions when first player joins
        if (player.lobby.isAsync && player.lobby.lobbyState === 'WAITING' && player.lobby.players.length > 0) {
          player.lobby.startGame();
          console.log(new Date(), `-- [lobby ${player.lobby.code}] async session auto-started`);
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
  socket.on('lobby:create:async', ({ title, config } = {}) => {
    if (player.lobby) return;
    if (!title || typeof title !== 'string') return;

    const sanitizedTitle = Sanitize.str(title).trim().slice(0, 60);
    if (!sanitizedTitle) return;

    player.interact();
    const code = Lobby.newCode();
    const lobby = new Lobby();
    lobby.code = code;
    lobby.isAsync = true;
    lobby.title = sanitizedTitle;
    lobby.persist = true;
    lobby.selectedGame = 'story';

    // Initialize config from story defaults
    lobby.gameConfig = _.mapValues(GAMES.story.config, v => v.defaults);
    // Allow up to 256 contributors
    lobby.gameConfig.players = 256;

    // Apply user-supplied config values for allowed fields
    if (config && typeof config === 'object') {
      for (const field of ['numStories', 'numLinks', 'contextLen', 'timeLimit', 'anonymous']) {
        if (config[field] !== undefined) {
          lobby.setConfig(field, config[field]);
        }
      }
    }

    Lobby.lobbies[code] = lobby;
    player.lobby = lobby;
    socket.emit('lobby:join', code);
    lobby.addMember(player);
    console.log(new Date(), `-- [lobby ${code}] created async session "${sanitizedTitle}"`);
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
      player.lobby.endGame();
      console.log(new Date(), `-- [lobby ${player.lobby.code}] ended game ${player.lobby.selectedGame}`);
    }
  });

  // Toggle whether this member is a spectator
  socket.on('lobby:spectate', () => {
    if(player.lobby) {
      player.lobby.toggleSpectate(player);
    } else {
      socket.emit('lobby:leave');
    }
  });

  // Let admins make players spectators
  socket.on('lobby:admin:toggle', targetId => {
    if(player.isAdmin && targetId !== player.id) {
      const targetPlayer = player.lobby.players.find(p => p.id === targetId);
      if(targetPlayer && targetPlayer.member) {
        player.lobby.toggleSpectate(targetPlayer.member);
      }
    }
  });

  // Change the admin
  socket.on('lobby:admin:grant', targetId => {
    if(player.isAdmin && targetId !== player.id) {
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
    player.name = '';
    Lobby.removePlayer(player);
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

// List all public async sessions
app.get('/api/v1/lobbies', (req, res) => {
  res.json(Lobby.publicList());
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
      if (state.isAsync && state.lobbyState === 'PLAYING') {
        const lobby = Lobby.create(code, state);
        lobby.persist = true;
        ++restored;
      }
    } catch {}
  }
  if (restored > 0)
    console.log(new Date(), `-- restored ${restored} async session(s)`);
} catch {}

// Start the webserver
server.listen(PORT, () => console.log(`Started ${VERSION} server on :${PORT}!`));

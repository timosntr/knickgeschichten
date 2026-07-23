const _ = require('lodash');
const gameInfo = require('../gameInfo');
const Persistence = require('./Persistence');

const GAMES = {
  story: require('./games/story'),
};

const CODE_LENGTH = 4;

class Lobby {
  // list of in-memory lobbies
  static lobbies = {};
  // check if a lobby exists
  static lobbyExists(code) {
    return Lobby.lobbies.hasOwnProperty(code) && Lobby.lobbies[code] || Persistence.saveExists(code);
  }

  // remove a lobby from active lobbies structure
  static cull(code) {
    Lobby.lobbies[code] = false;
    delete Lobby.lobbies[code];
  }

  // remove all lobbies with no players
  static cullEmpty() {
    const now = Date.now();
    const keys = Object.keys(Lobby.lobbies);
    let count = 0, lobby;
    for (const code in keys) {
      lobby = Lobby.lobbies[code];
      // cleanup some garbage
      if (!lobby) {
        Lobby.cull(lobby);
        continue;
      }

      // delete empty, non-persist, non-async lobbies after a 2-minute grace period
      // (grace period starts when it emptied, so players can rejoin)
      const emptyAge = now - (lobby.emptiedAt || lobby.created);
      if (lobby.empty() && !lobby.persist && !lobby.isAsync && emptyAge > 120000) {
        if (lobby.game) { lobby.game.stop(); lobby.game.cleanup(); lobby.game = undefined; }
        Lobby.cull(code);
        ++count;
      }
    }
    if (count > 0)
      console.log(new Date(), '!- culled', count, 'empty lobbies');
    return count;
  }

  // generate a new lobby code
  static newCode(prefix='') {
    let code, counter = 0, length = CODE_LENGTH;
    do {
      // after 5 failed attempts at creating a new lobby, increase the code length
      // this should be astronomically improbable so it's certainly due to collisions
      if (++counter > 5) {
        length ++;
        counter = 0;
      }

      code = prefix + _.sampleSize('abcdefghijklmnopqrstuvwxyz0123456789', length).join('');
    } while(Lobby.lobbyExists(code));
    return code;
  }

  // list all public async sessions for the session browser
  static publicList() {
    const lastNWords = (text, n) => {
      const words = text.trim().split(/\s+/);
      return (words.length > n ? '…' + words.slice(-n).join(' ') : text.trim());
    };
    const firstNWords = (text, n) => {
      const words = text.trim().split(/\s+/);
      return (words.length > n ? words.slice(0, n).join(' ') + '…' : text.trim());
    };

    return Object.values(Lobby.lobbies)
      .filter(l => l && l.isAsync)
      .map(l => {
        const progress = l.game ? l.game.getGameProgress() : (l.completedStories ? 1 : 0);
        const isComplete = progress === 1;
        const config = l.gameConfig;
        const numAuthors = l.game
          ? Object.keys(l.game.chains.reduce((acc, chain) => Object.assign(acc, chain.collaborators), {})).length
          : (l.completedAuthors || 0);

        // Teaser: last 8 words for active, first 8 words for completed
        let teaser = '';
        if (isComplete && l.completedStories && l.completedStories[0] && l.completedStories[0][0]) {
          teaser = firstNWords(l.completedStories[0][0].link, 8);
        } else if (l.game && l.game.chains) {
          const chain = l.game.chains[0];
          if (chain && chain.chain.length > 0) {
            teaser = lastNWords(chain.chain[chain.chain.length - 1], 8);
          }
        }

        const authorNames = isComplete && l.completedStories
          ? [...new Set(l.completedStories.flat().map(e => e.authorName).filter(n => n && n !== ''))]
          : [];

        const totalLikes = l.game
          ? _.sumBy(l.game.chains, c => _.size(_.filter(c.likes, v => v)))
          : (l.completedLikes || 0);

        const lastActivity = l.game && l.game.lastEdit
          ? Math.max(l.created, ...Object.values(l.game.lastEdit))
          : l.created;

        return {
          code: l.code,
          title: l.title,
          number: l.number ?? null,
          progress,
          isComplete,
          numStories: typeof config.numStories === 'number' ? config.numStories : l.players.length,
          numLinks: typeof config.numLinks === 'number' ? config.numLinks : 10,
          numAuthors,
          authorNames,
          totalLikes,
          playersOnline: l.members.length,
          createdAt: l.created,
          lastActivity,
          completedAt: l.completedAt || null,
          teaser,
        };
      })
      .sort((a, b) => Number(a.isComplete) - Number(b.isComplete) || b.createdAt - a.createdAt);
  }

  // create a new lobby with a code
  static create(code, state) {
    const lobby = new Lobby(state);
    lobby.code = code;
    Lobby.lobbies[code] = lobby;
    return lobby;
  }

  /**
   * Removes player from his/her lobby
   * @param  {Member} player Player potentially in a lobby
   */
  static removePlayer(player, voluntary = false) {
    if (!player) return;
    const lobby = player.lobby;

    if(!lobby) return;

    lobby.removeMember(player, voluntary);
    player.lobby = undefined;

    if(lobby.empty()) {
      try {
        // save the lobby state
        Persistence.saveLobbyState(lobby);
      } catch (err) {
        console.error(new Date(), 'error saving', lobby.code, err);
      }

      // async sessions stay alive in memory — just clear timers
      if (lobby.isAsync) {
        if (lobby.game) lobby.game.pause();
        // clear any pending disconnect timers
        for (const t of Object.values(lobby.disconnectTimers || {})) clearTimeout(t);
        lobby.disconnectTimers = {};
        console.log(new Date(), `-- [lobby ${lobby.code}] async session emptied, keeping alive`);
        return;
      }

      // Mark when the lobby emptied — cullEmpty will clean it up after a grace period
      lobby.emptiedAt = Date.now();
      console.log(new Date(), `-- [lobby ${lobby.code}] emptied, will be culled after grace period`);
    }
  }

  constructor(lobbyState) {
    this.created = Date.now();
    // restore lobby from existing state
    try {
      if (typeof lobbyState !== 'undefined') {
        this.restoreState(lobbyState);
        return;
      }
    } catch (err) {
      // error restoring lobby...
      console.error(new Date(), 'error restoring', lobbyState.code, err);
    }

    // create a new lobby
    this.resetLobby();
  }

  // reset the lobby to initial values
  resetLobby() {
    if (typeof this.code === 'undefined') {
      this.code = Lobby.newCode();
    }

    this.members = [];
    this.players = [];
    this.selectedGame = '';
    this.gameConfig = {players: '#numPlayers'};
    this.admin = '';
    this.lobbyState = 'WAITING';
    this.game = null;
    this.isAsync = false;
    this.title = '';
    this.number = null;
    this.disconnectTimers = {};
    this.completedStories = null;
    this.completedAuthors = 0;
    this.completedAt = null;
    this.completedLikes = 0;
  }

    // get the lobby's current save state
   saveState() {
    return {
      version: 1,
      code: this.code,
      created: this.created,
      date: new Date().toString(),
      lobbyState: this.lobbyState,
      selectedGame: this.selectedGame,
      gameConfig: this.gameConfig,
      players: this.players.map(p => ({
        playerId: p.playerId,
        name: p.member ? p.member.name : p.name,
      })),
      game: this.game ? {
        config: this.game.config,
        state: this.game.save(),
      } : null,
      isAsync: this.isAsync,
      title: this.title,
      number: this.number || null,
      completedStories: this.completedStories || null,
      completedAuthors: this.completedAuthors || 0,
      completedAt: this.completedAt || null,
      completedLikes: this.completedLikes || 0,
    }
  }

  // restore a lobby from the save state
  restoreState(lobbyState) {
    if (lobbyState.code)
      this.code = lobbyState.code;
    // Restore original creation time. Old saves lack `created`: fall back to
    // the completion time (so a finished story doesn't get "today" as its start
    // and show a reversed span), and only to now as a last resort.
    this.created = lobbyState.created || lobbyState.completedAt || this.created;
    this.members = [];

    if (lobbyState.players) {
      this.players = lobbyState.players.map(p => ({
        id: -1,
        playerId: p.playerId,
        connected: false,
        name: p.name,
      }));
    } else {
      this.players = [];
    }

    this.selectedGame = lobbyState.selectedGame || '';
    // use the provided game config or defaults
    this.gameConfig = lobbyState.gameConfig ||
      (this.selectedGame
        ? _.mapValues(gameInfo[this.selectedGame].config, v => v.defaults)
        : {players: '#numPlayers'});

    this.admin = '';
    this.lobbyState = lobbyState.lobbyState || 'WAITING';
    this.isAsync = lobbyState.isAsync || false;
    this.title = lobbyState.title || '';
    // Story number: prefer the stored field; fall back to a trailing number in
    // the title for legacy saves written before `number` existed.
    if (typeof lobbyState.number === 'number') {
      this.number = lobbyState.number;
    } else {
      const m = /(\d+)\s*$/.exec(this.title);
      this.number = m ? Number(m[1]) : null;
    }
    this.disconnectTimers = {};
    this.completedStories = lobbyState.completedStories || null;
    this.completedAuthors = lobbyState.completedAuthors || 0;
    this.completedAt = lobbyState.completedAt || null;
    this.completedLikes = lobbyState.completedLikes || 0;

    // Restore the game when there's saved game state. Async sessions are saved
    // while empty (nobody online between visits), so their players list is []
    // — they MUST still restore their game, otherwise the story content never
    // loads and every joiner is stuck on "Stories are Being Written" with the
    // chains effectively lost. Sync games keep the old "players present" guard.
    if (lobbyState.game && (this.players.length > 0 || this.isAsync)) {
      const { config, state } = lobbyState.game;

      const Constructor = GAMES[this.selectedGame];
      if (Constructor) {
        this.game = new Constructor(this, config, this.players.map(p => p.playerId));
        this.game.restore(state);

        // Cap players to those present (sync only). Async sessions grow
        // dynamically and keep their saved cap, so don't collapse it to 0.
        if (this.players.length > 0)
          this.gameConfig.players = this.players.length;
      }
    } else {
      this.game = null;
    }
  }

  // "safely" run a function, end the current lobby game if it fails
  attempt(fn) {
    try {
      return fn();
    } catch (err) {
      console.log('Lobby Error', err);
      this.endGame();
    }
  }

  // Start the game
  startGame() {
    if(!this.selectedGame) return;

    const numPlayers = this.players.length;

    // cap players (async sessions allow unlimited contributors — don't cap)
    if (!this.isAsync) {
      this.gameConfig.players = numPlayers;
    }

    // parse config values
    const newConfig = this.configVals();
    if(!newConfig)
      return;

    const args = [this, newConfig, this.players.map(p => p.playerId)];

    const Constructor = GAMES[this.selectedGame];

    if(Constructor) {
      // Clear the previous round's stories so a new round can record its own
      // (redistribute only saves completedStories when none are set yet).
      if (!this.isAsync) {
        this.completedStories = null;
        this.completedAuthors = 0;
        this.completedAt = null;
        this.completedLikes = 0;
      }
      this.game = new Constructor(...args);
      this.lobbyState = 'PLAYING';
      this.updateMembers();
      this.sendLobbyInfo();
      this.game.start();
    }
  }

  endGame() {
    if(!this.selectedGame) return;
    if(this.lobbyState !== 'PLAYING') return;

    for (const pid in this.disconnectTimers) {
      clearTimeout(this.disconnectTimers[pid]);
      delete this.disconnectTimers[pid];
    }

    if(this.game) {
      this.game.stop();
      this.game.cleanup();
    }

    this.game = undefined;
    this.lobbyState = 'WAITING';

    // Re-open the player cap that startGame() pinned to the last round's count,
    // so members who joined between rounds become players again (and the next
    // round gets one story per player via numStories = #numPlayers).
    if (!this.isAsync) {
      this.gameConfig.players = '#numPlayers';
    }

    this.updateMembers();
    this.sendLobbyInfo();
  }

  // Change which game this lobby is playing
  setGame(game) {
    if(this.lobbyState !== 'WAITING') return;

    if(gameInfo.hasOwnProperty(game)) {
      this.selectedGame = game;
      this.gameConfig = _.mapValues(gameInfo[game].config, v => v.defaults);

      this.updateMembers();
      this.sendLobbyInfo();
    }
  }

  // Pass a message to the game controller
  gameMessage(member, type, data) {
    if (!this.game) return;
    // find associated player
    const player = this.players.find(p => p.id === member);

    if(player) {
      this.game.handleMessage(player.playerId, type, data);
    } else {
      this.game.handleMessage(member, type, data);
    }
  }

  // Change a value in the game config
  setConfig(name, val) {
    if(this.lobbyState !== 'WAITING') return;

    if(!this.selectedGame) return;

    if(!this.gameConfig.hasOwnProperty(name)) return;

    const conf = gameInfo[this.selectedGame].config[name];
    if(conf.hidden) return;

    // Type validation
    switch(conf.type) {
    case 'int':
      if(typeof val !== 'number') {
        // value is not one of the calculated values
        switch(val) {
        case '#numPlayers':
          if(this.players.length > gameInfo[this.selectedGame].config.players.max) {
            val = gameInfo[this.selectedGame].config.players.max;
          }
          break;

        default:
          return
        }
      } else {
        // value is too small or too large
        if(val < conf.min || val > conf.max && conf.max) {
          val = val > conf.max && conf.max ? conf.max : val;
        }
      }
      val = val == '#numPlayers' ? val : Math.floor(val);

      this.gameConfig[name] = val;
      break;
    case 'bool':
      this.gameConfig[name] = val === 'true' ? 'true' : 'false';
      break;
    case 'list':
      const entry = conf.options.find(n => n.name === val);
      this.gameConfig[name] = entry ? val : gameInfo[this.selectedGame].config[name].defaults;
      break;
    }

    this.updateMembers();
    this.sendLobbyInfo();
  }

  configVals() {
    const conf = {};
    const numPlayers = this.players.length;

    for(const name in this.gameConfig) {
      const info = gameInfo[this.selectedGame].config[name];
      const rawVal = this.gameConfig[name];
      let val;
      switch(info.type) {
      case 'int':
        if(rawVal === '#numPlayers')
          val = numPlayers;
        else
          val = Math.floor(rawVal);
        if(info.min > val || info.max < val)
          return false;
        break;
      case 'bool':
        val = rawVal === 'true';
        break;
      case 'list':
        val = info.options.find(o => o.name === rawVal).value;
        break;
      }

      conf[name] = val;
    }

    return conf;
  }

  addMember(member) {
    this.members.push(member);
    this.updateMembers();
    this.sendLobbyInfo();
  }

  removeMember(member, voluntary = false) {
    const i = this.members.indexOf(member);
    if(i >= 0) {
      this.members.splice(i, 1);
    }

    if(this.admin === member.id) {
      this.admin = '';
    }

    // Remove the player from the current players
    const playerIdx = this.players.findIndex(p => p.id === member.id);
    const playerObj = playerIdx >= 0 ? this.players[playerIdx] : null;
    if(playerObj) {
      if (this.isAsync && this.lobbyState === 'PLAYING') {
        const pid = playerObj.playerId;
        const name = member.name || playerObj.name || pid;

        if (voluntary) {
          // Voluntary leave: drop them entirely and release their chain
          // immediately so others aren't kept waiting on someone who's gone.
          this.players.splice(playerIdx, 1);
          if (this.game) this.game.detachPlayer(pid);
          if (this.disconnectTimers[pid]) clearTimeout(this.disconnectTimers[pid]);
          if (this.game) {
            const released = this.game.releasePlayer(pid);
            if (released)
              console.log(new Date(), `-- [lobby ${this.code}] released chain of leaving player "${name}" immediately`);
          }
        } else {
          // Disconnect (dropped connection, closed tab, page refresh): keep the
          // player row marked disconnected instead of deleting it, so a same-name
          // rejoin within the grace period reclaims their in-progress chain via
          // replacePlayer() rather than starting over as a brand-new contributor.
          playerObj.connected = false;
          playerObj.member = null;
          playerObj.id = -1;
          // Detach from game.players immediately so redistribute() ignores them
          if (this.game) this.game.detachPlayer(pid);
          if (this.disconnectTimers[pid]) clearTimeout(this.disconnectTimers[pid]);
          // Give 60s grace period in case they reconnect; afterwards drop the
          // row for good and release their chain so others aren't kept waiting
          this.disconnectTimers[pid] = setTimeout(() => {
            delete this.disconnectTimers[pid];
            const idx = this.players.findIndex(p => p.playerId === pid);
            if (idx >= 0) this.players.splice(idx, 1);
            if (this.game) {
              const released = this.game.releasePlayer(pid);
              if (released)
                console.log(new Date(), `-- [lobby ${this.code}] released chain of absent player "${name}" after 60s`);
            }
          }, 60000);
        }
      } else if (!this.isAsync && this.lobbyState === 'PLAYING') {
        // Sync PLAYING: keep the player slot so they can rejoin via lobby:replace,
        // detach from game queue, and release their chain after a 60s grace period.
        const pid = playerObj.playerId;
        const name = playerObj.name || pid;
        playerObj.connected = false;
        playerObj.member = null;
        playerObj.id = -1;
        if (pid && this.game) {
          this.game.detachPlayer(pid);
          if (this.disconnectTimers[pid]) clearTimeout(this.disconnectTimers[pid]);
          const gameAtDisconnect = this.game;
          this.disconnectTimers[pid] = setTimeout(() => {
            delete this.disconnectTimers[pid];
            if (!this.game || this.game !== gameAtDisconnect || this.lobbyState !== 'PLAYING') return;
            this.game.releasePlayer(pid);
            console.log(new Date(), `-- [lobby ${this.code}] released chain of absent sync player "${name}" after 60s`);
            // If fewer than 2 players remain, abort: show partial stories to whoever is left
            const connected = this.players.filter(p => p.connected).length;
            if (connected < 2) {
              console.log(new Date(), `-- [lobby ${this.code}] only ${connected} player(s) left, aborting game`);
              this.game.abort();
            }
          }, 60000);
        }
      } else {
        playerObj.name = member.name;
        playerObj.connected = false;
        playerObj.member = null;
        playerObj.id = -1;
      }
    }

    this.updateMembers();
    this.sendLobbyInfo();
  }

  /**
   * Determine if this lobby has any members
   * @return {boolean} True if there are no members
   */
  empty() {
    return this.members.length === 0;
  }

  /**
   * Emit a message to every member
   * @param  {args} args Arguments passed into emit
   */
  emitAll(...args) {
    for(const m of this.members) {
      m.socket.emit(...args);
    }
  }

  /**
   * Emits a message to a specific player
   * @param  {string}    id   Player identifier
   * @param  {args} args Arguments passed to emit
   */
  emitPlayer(id, ...args) {
    const player = this.players.find(p => p.playerId === id);
    if(player && player.member) {
      player.member.socket.emit(...args);
      return;
    }
    const member = this.members.find(p => p.id === id);
    if (member) {
      member.socket.emit(...args);
    }
  }

  /**
   * Emits a message to a specific member
   * @param  {string}    id   Player identifier
   * @param  {args} args Arguments passed to emit
   */
  emitMember(id, ...args) {
    const player = this.members.find(p => p.id === id);
    if(player) {
      player.socket.emit(...args);
    }
  }

  /**
   * Emit a message to every player
   * @param  {args} args Arguments passed into emit
   */
  emitPlayers(...args) {
    for(const p of this.players) {
      if(p.member) {
        p.member.socket.emit(...args);
      }
    }
  }

  // Replace a player that has left the game
  replacePlayer(member, pid) {
    const id = member.id;
    const targetPlayer = this.players.find(p => p.playerId === pid);

    // Already reattached to this same connection (e.g. member:name already
    // reclaimed the slot) — resend current state instead of wiping it out.
    if (targetPlayer && targetPlayer.id === id && targetPlayer.connected) {
      if (this.game && this.lobbyState === 'PLAYING') {
        member.socket.emit('game:info', this.game.getState());
        this.getPlayerState(id);
      }
      return;
    }

    const isPlayer = this.players.find(p => p.id === id);
    const reclaimable = targetPlayer && targetPlayer.id === -1 && !targetPlayer.connected;

    if(!isPlayer && reclaimable && member.name) {
      targetPlayer.id = id;
      targetPlayer.name = member.name;
      targetPlayer.member = member;
      targetPlayer.connected = true;

      // Cancel pending chain-release timer for this player
      if (this.disconnectTimers && this.disconnectTimers[targetPlayer.playerId]) {
        clearTimeout(this.disconnectTimers[targetPlayer.playerId]);
        delete this.disconnectTimers[targetPlayer.playerId];
      }

      // Async sessions detach disconnected players from the active write
      // queue — rejoin it now so redistribute() considers them again and
      // reunites them with their in-progress chain (if it wasn't released yet).
      if (this.isAsync && this.lobbyState === 'PLAYING' && this.game)
        this.game.addPlayer(targetPlayer.playerId);

      this.updateMembers();
      this.sendLobbyInfo();

      if(this.game && this.lobbyState === 'PLAYING') {
        // For sync games: re-add player to the game queue and give them a chain
        if (!this.isAsync && !this.game.players.includes(targetPlayer.playerId)) {
          this.game.players.push(targetPlayer.playerId);
          this.game.redistribute();
        }
        member.socket.emit('game:info', this.game.getState());
        this.getPlayerState(id);
      }
    } else {
      member.socket.emit('game:player:info', { state: '' });
    }
  }

  getPlayerState(id) {
    if(this.lobbyState !== 'PLAYING') {
      return;
    }

    const player = this.players.find(p => p.id === id);
    if(!player)
      return;

    player.member.socket.emit('game:player:info', this.game.getPlayerState(player.playerId));
  }


  updateMembers() {
    switch(this.lobbyState) {
    case 'WAITING':
      // Cull disconnected players
      for(let i = 0; i < this.players.length; i++) {
        const p = this.players[i];

        if(!p.connected) {
          this.players.splice(i--, 1);
          continue;
        }

        // Move the admin to the in case this player gets culled
        if(p.id === this.admin) {
          this.players.splice(0, 0, ...this.players.splice(i, 1));
        }
      }

      // Remove players who are over the max player cap
      while(this.gameConfig.players > 0 && this.players.length > this.gameConfig.players) {
        const {id} = this.players.pop();

        // Remove the admin if one of the removed players is the admin somehow
        if(this.admin === id) {
          this.admin = '';
        }
      }

      // Determine if more members should be added into the players list
      if(!this.gameConfig.players || this.gameConfig.players === '#numPlayers' || this.players.length < this.gameConfig.players) {
        for(const m of this.members) {
          // For async: allow empty string names (anonymous); for sync: require non-empty name
          const nameReady = this.isAsync ? m.name !== null : !!m.name;
          if(nameReady && !this.players.find(p => p.id === m.id)) {
            this.players.push({
              id: m.id,
              playerId: _.uniqueId('player'),
              name: m.name,
              member: m,
              connected: true,
            });
          }
        }
      }

      // Delegate a new admin
      for(let i = 0; !this.admin && i < this.players.length; i++) {
        if(this.players[i].connected) {
          this.admin = this.players[i].id;
        }
      }
      break;

    case 'PLAYING':

      // Determine if the admin disconnected
      const admin = this.players.find(p => p.id === this.admin);
      if(admin && !admin.connected)
        this.admin = '';

      // Delegate a new admin
      for(let i = 0; !this.admin && i < this.players.length; i++) {
        if(this.players[i].connected) {
          this.admin = this.players[i].id;
        }
      }

      // For async sessions: add new members as players mid-game (null = no name yet; '' = anonymous)
      if (this.isAsync) {
        for (const m of this.members) {
          if (m.name === null) continue;
          const alreadyPlayer = this.players.find(p => p.id === m.id);
          if (!alreadyPlayer) {
            const pid = _.uniqueId('player');
            this.players.push({
              id: m.id,
              playerId: pid,
              name: m.name,
              member: m,
              connected: true,
            });
            if (this.game) this.game.addPlayer(pid);
          }
        }
      }
    }
  }

  // lobby info is the current lobby state sent to the players
  genLobbyInfo() {
    const isPlayer = {};
    for (const p of this.players) isPlayer[p.id] = true;

    const info = {
      game: this.selectedGame,
      state: this.lobbyState,
      config: this.gameConfig,
      admin: this.admin,
      isAsync: this.isAsync,
      isComplete: !!this.completedStories,
      // Stories from the last finished round, so a private lobby can show them
      // (as an accordion) before the next round starts.
      completedStories: !this.isAsync ? (this.completedStories || null) : null,
      title: this.title,
      gameState: this.game ? this.game.getState() : {},
      members: this.members.map(m => ({
        id: m.id,
        name: m.name !== null ? m.name : false,
      })),
      players: this.players.map(p => ({
        id: p.id,
        playerId: p.playerId,
        connected: p.connected && !!p.member,
        name: p.member ? p.member.name : p.name,
      })),
    };

    return info;
  }

  sendLobbyInfo() {
    const info = this.genLobbyInfo();

    this.emitAll('lobby:info', info);
  }
}

// dev lobby
Lobby.create('devaaaa').persist = true;


module.exports = Lobby;
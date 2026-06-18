const Game = require('./game');
const _ = require('lodash');
const Chain = require('./util/Chain');
const Sanitize = require('./util/Sanitize');

const MIN_WORDS = 10;
const CONTEXT_LEN = 1;
const CONTEXT_WORDS = 6;

module.exports = class Story extends Game {
  constructor(lobby, config, players) {
    super(lobby, config, players);
    this.chains = [];

    this.clearance = Math.min(config.players - 1, CONTEXT_LEN + 1);

    this.lastEdit = {};
    for(const p of players)
      this.lastEdit[p] = 0;

    this.finishedReading = {};
    this.timers = {};
    this.deadlines = {};
    this.idleTimers = {};
  }


  restore(blob) {
    if (blob.version !== 1)
      return;

    this.chains = blob.chains.map(Chain.restore);
    this.finishedReading = blob.finishedReading;

    // Restore timers from saved deadlines
    if (blob.deadlines && this.config.timeLimit > 0) {
      for (const pid in blob.deadlines) {
        const deadline = blob.deadlines[pid];
        const remaining = deadline - Date.now();
        if (remaining > 0) {
          this.deadlines[pid] = deadline;
          this.timers[pid] = setTimeout(() => this.timeoutPlayer(pid), remaining);
        }
      }
    }
  }

  save() {
    return {
      version: 1,
      chains: this.chains.map(s => s.save()),
      finishedReading: this.finishedReading,
      deadlines: this.deadlines,
    }
  }


  // Assign a chain to a player, starting a timer if configured
  assignChain(pid, chain) {
    chain.editor = pid;
    if (this.config.timeLimit > 0) {
      const deadline = Date.now() + this.config.timeLimit * 1000;
      this.deadlines[pid] = deadline;
      this.timers[pid] = setTimeout(() => this.timeoutPlayer(pid), this.config.timeLimit * 1000);
    }
  }

  // Clear a player's active timer
  clearTimer(pid) {
    if (this.timers[pid]) {
      clearTimeout(this.timers[pid]);
      delete this.timers[pid];
    }
    delete this.deadlines[pid];
  }

  // Remove player from active list so redistribute() won't assign them new chains.
  // Does NOT release their currently held chain (used on disconnect, before grace period).
  detachPlayer(pid) {
    const idx = this.players.indexOf(pid);
    if (idx >= 0) this.players.splice(idx, 1);
    // Clear idle timer if running
    if (this.idleTimers[pid]) {
      clearTimeout(this.idleTimers[pid]);
      delete this.idleTimers[pid];
    }
  }

  // Release a disconnected player's chain so other players aren't blocked
  // Returns true if a chain was released
  releasePlayer(pid) {
    const chain = this.chains.find(s => s.editor === pid);
    if (chain) {
      this.clearTimer(pid);
      chain.editor = '';
      this.redistribute();
      return true;
    }
    return false;
  }

  // Add a new player to a running async game and assign them a chain
  addPlayer(pid) {
    if (this.players.includes(pid)) return;
    this.players.push(pid);
    this.lastEdit[pid] = 0;
    if (this.getGameProgress() === 1) {
      // Session is already complete — this player is a reader, not a contributor.
      // Send the finished stories and skip the idle timer / redistribution,
      // otherwise readers get kicked to /sessions after 5 minutes mid-read.
      this.emitTo(pid, 'story:result', this.compileStories());
      return;
    }
    // 5-minute idle timer: remove from queue if player never writes anything
    const IDLE_MS = 5 * 60 * 1000;
    this.idleTimers[pid] = setTimeout(() => {
      delete this.idleTimers[pid];
      if (!this.players.includes(pid)) return; // already gone
      this.emitTo(pid, 'lobby:idle');
      this.releasePlayer(pid);  // release chain if they had one
      this.detachPlayer(pid);   // remove from queue
      console.log(new Date(), `-- [lobby ${this.lobby.code}] idle player "${pid}" removed after 5min`);
    }, IDLE_MS);
    this.redistribute();
  }

  // Clear timers without emitting results (used when async lobby empties)
  pause() {
    for (const pid in this.timers) {
      clearTimeout(this.timers[pid]);
    }
    this.timers = {};
    this.deadlines = {};
    for (const pid in this.idleTimers) {
      clearTimeout(this.idleTimers[pid]);
    }
    this.idleTimers = {};
  }

  // Called when a player's time runs out — release their chain, remove from queue, notify
  timeoutPlayer(pid) {
    delete this.timers[pid];
    delete this.deadlines[pid];
    const chain = this.chains.find(s => s.editor === pid);
    if (chain) {
      chain.editor = '';
    }
    // Notify the player before detaching (emitTo still works while in lobby.players)
    if (this.lobby.isAsync) {
      this.emitTo(pid, 'lobby:idle');
      this.detachPlayer(pid);
    }
    this.redistribute();
  }

  // Find a story for a player
  findChainForPlayer(player, memberId = '') {
    // Find a chain for a player
    const { numLinks } = this.config;

    // Order chains by length (shortest chains get touched first)
    let available = _.sortBy(
      this.chains
        .filter(s => !s.editor &&  // Only find chains that aren't being worked on
          s.chain.length < numLinks && // chain is at capacity
          s.lastEditor != player && // Find chains the player didn't just edit
          // Also block by memberId so rejoin doesn't bypass the last-editor check
          !(memberId && s.lastEditorMemberId && s.lastEditorMemberId === memberId) &&
          (s.collaborators[player] || 0) <= s.avgEdits() // with edits less than a
        ),
      s => s.chain.length
    );

    // If there is enough players, try to ensure the chain isn't alternating
    if(this.players.length !== this.clearance)
      available = available.filter(s => !s.editors.slice(-this.clearance).includes(player));

    return available[0];
  }

  start() {
    const numPlayers = this.players.length;
    const { numStories, numLinks } = this.config;

    this.chains = _.range(numStories)
      .map(() => new Chain(numPlayers, numLinks));

    // Every player has an equal chance of getting a story
    const players = _.shuffle(this.players);

    for(const player of players) {
      const playerObj = this.lobby.players.find(p => p.playerId === player);
      const memberId = playerObj ? playerObj.id : '';
      const story = this.findChainForPlayer(player, memberId);
      if(!story) {
        break;
      }
      this.assignChain(player, story);
    }

    this.sendGameInfo();
  }

  // Find stories for those who are not working on one
  redistribute() {
    const hasStory = this.chains.filter(s => s.editor).reduce((obj, i) => ({...obj, [i.editor]: true}), {});

    // find players not editing stories
    const players = _.sortBy(this.players.filter(p => !hasStory[p]), p => this.lastEdit[p]);

    for(const player of players) {
      const playerObj = this.lobby.players.find(p => p.playerId === player);
      const memberId = playerObj ? playerObj.id : '';
      const story = this.findChainForPlayer(player, memberId);
      if(!story)
        continue;
      this.assignChain(player, story);
    }

    // When all stories are complete, save them to lobby so they survive endGame()
    if (this.getGameProgress() === 1 && !this.lobby.completedStories) {
      this.lobby.completedStories = this.compileStories();
      const stories = this.lobby.completedStories;
      const namedAuthors = new Set();
      let hasAnonymous = false;
      for (const story of stories) {
        for (const entry of story) {
          if (entry.authorName === '') hasAnonymous = true;
          else if (entry.authorName) namedAuthors.add(entry.authorName);
        }
      }
      this.lobby.completedAuthors = namedAuthors.size + (hasAnonymous ? 1 : 0);
    }

    this.sendGameInfo();
  }

  stop() {
    // Clear all timers
    for (const pid in this.timers) {
      clearTimeout(this.timers[pid]);
    }
    this.timers = {};
    this.deadlines = {};
    for (const pid in this.idleTimers) {
      clearTimeout(this.idleTimers[pid]);
    }
    this.idleTimers = {};

    // Emit partial or complete results to all players before lobby transitions to WAITING
    const stories = this.getGameProgress() === 1
      ? this.compileStories()
      : this.compilePartialStories();
    this.lobby.emitAll('story:result', stories);
  }

  cleanup() {}

  handleMessage(pid, type, data) {
    switch(type) {

    case 'story:result':
      if (this.getGameProgress() === 1) {
        this.emitTo(pid, 'story:result', this.compileStories());
      }
      break;

    // Export current stories as a snapshot (admin only, no state change)
    case 'story:export':
      this.emitTo(pid, 'story:result', this.compilePartialStories());
      break;

    // Handle writing the next line
    case 'story:line':
      const story = this.chains.find(s => s.editor === pid);
      if(!story)
        return;

      if(typeof data !== 'string')
        return;

      const line = Sanitize.str(data);

      if(line.length < 1 || line.length > 512)
        return;

      const wordCount = line.trim().split(/\s+/).filter(w => w.length > 0).length;
      if(wordCount < MIN_WORDS)
        return;

      this.clearTimer(pid);
      this.lastEdit[pid] = Date.now();
      // Clear idle timer — player has written, no need to kick them
      if (this.idleTimers[pid]) {
        clearTimeout(this.idleTimers[pid]);
        delete this.idleTimers[pid];
      }
      const playerObj = this.lobby.players.find(p => p.playerId === pid);
      const authorName = playerObj ? playerObj.name : null;
      const memberId = playerObj ? playerObj.id : '';
      story.addLink(pid, line, authorName, memberId);

      this.redistribute();

      break;

    // Player skips their turn — release the chain so someone else can continue
    case 'story:skip': {
      if (!this.lobby.isAsync) return;
      const skipChain = this.chains.find(s => s.editor === pid);
      if (!skipChain) return;
      this.clearTimer(pid);
      skipChain.lastEditor = pid; // prevent immediate re-assignment
      skipChain.editor = '';
      this.redistribute();
      break;
    }

    case 'story:done':
      this.finishedReading[pid] = data === true;
      this.sendGameInfo();

      if(!this.lobby.isAsync && this.players.every(p => this.finishedReading[p]))
        this.lobby.endGame();

      break;

    case 'chain:like':
      const progress = this.getGameProgress();
      if(typeof data === 'number' && data >= 0 && data <= this.chains.length && progress === 1) {
        this.chains[data].likes[pid] = !this.chains[data].likes[pid];
        this.sendGameInfo();
      }
      break;
    }
  }

  getGameProgress() {
    const { numStories, numLinks } = this.config;
    const totalLines = numStories * numLinks;
    const writtenLines = _.sumBy(this.chains, s => s.chain.length);
    return writtenLines / totalLines;
  }

  getPlayerState(pid) {
    const story = this.chains.find(s => s.editor === pid);
    const done = this.getGameProgress() === 1;

    return story ? {
      id: pid,
      state: 'EDITING',
      isLastLink: story.chain.length === this.config.numLinks - 1,
      link: story.chain.slice(-CONTEXT_LEN).map((line, i, arr) => {
        if (i < arr.length - 1) return line;
        const words = line.trim().split(/\s+/);
        return words.length > CONTEXT_WORDS
          ? '…' + words.slice(-CONTEXT_WORDS).join(' ')
          : line;
      }),
      deadline: this.deadlines[pid] || null,
    } : {
      id: pid,
      liked: this.chains.map(s => s.likes[pid]),
      state: done ? 'READING' : 'WAITING',
    };
  }

  compileStories() {
    if (!this.compiled)
      this.compiled = this.chains.map(s =>
        _.zip(s.chain, s.editors, s.authorNames)
        .map(([link, e, authorName]) => ({
          link,
          editor: this.config.anonymous ? '' : e,
          authorName: this.config.anonymous ? '' : (authorName !== undefined ? authorName : null),
        }))
      );
    return this.compiled;
  }

  compilePartialStories() {
    return this.chains.map(s =>
      _.zip(s.chain, s.editors, s.authorNames)
      .map(([link, e, authorName]) => ({
        link,
        editor: this.config.anonymous ? '' : e,
        authorName: this.config.anonymous ? '' : (authorName !== undefined ? authorName : null),
      }))
    );
  }

  getState() {
    const hasStory = {};
    for (const c of this.chains.filter(s => s.editor))
      hasStory[c.editor] = true;
    const progress = this.getGameProgress();
    return {
      // players who are writing have pencil icons, players who are not have a clock icon
      icons: Object.fromEntries(this.players.map(p => ([
        p,
        progress === 1
          ? this.finishedReading[p] ? 'check' : 'clock'
          : hasStory[p] ? 'pencil' : 'clock',
      ]))),
      progress,
      minWords: MIN_WORDS,
      likes: this.chains.map(s => _.size(_.filter(s.likes, l => l))),
      isComplete: progress === 1,
    };
  }
};

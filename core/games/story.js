const Game = require('./game');
const _ = require('lodash');
const Chain = require('./util/Chain');
const Sanitize = require('./util/Sanitize');

const MIN_WORDS = 15;
const MAX_CONTRIBUTION = 250;
const MAX_STORY_CHARS = 4000;
const CONTEXT_LEN = 1;
const CONTEXT_WORDS = 8;

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
    // Set once the game is aborted mid-way: players read the partial stories
    // instead of writing, and the game waits for them to finish reading.
    this.aborted = false;
    // Fixed rotation ring for private games (built in start()/restore()).
    this.ring = null;
    this.succ = {};
  }


  restore(blob) {
    if (blob.version !== 1)
      return;

    this.chains = blob.chains.map(Chain.restore);
    this.finishedReading = blob.finishedReading;
    this.aborted = blob.aborted || false;
    this.ring = blob.ring || null;
    this.succ = blob.succ || {};

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
      aborted: this.aborted,
      ring: this.ring,
      succ: this.succ,
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
      this.emitTo(pid, 'lobby:idle', 'idle');
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
    // Notify the player before detaching (emitTo still works while in lobby.players).
    // Distinct reason 'timeout' so the client shows "turn expired", not "you were idle".
    if (this.lobby.isAsync) {
      this.emitTo(pid, 'lobby:idle', 'timeout');
      this.detachPlayer(pid);
    }
    this.redistribute();
  }

  // Find a story for a player (async balancing model — public sessions).
  // Private sync games use the fixed ring rotation instead (see assignRing).
  findChainForPlayer(player, memberId = '') {
    // Order chains by total char length (shortest first)
    let available = _.sortBy(
      this.chains
        .filter(s => !s.editor &&  // Only find chains that aren't being worked on
          !s.closed &&  // never reopen a chain whose last link has been written
          _.sumBy(s.chain, l => l.length) + MAX_CONTRIBUTION <= MAX_STORY_CHARS && // chain has room
          s.lastEditor != player && // Find chains the player didn't just edit
          // Also block by memberId so rejoin doesn't bypass the last-editor check
          !(memberId && s.lastEditorMemberId && s.lastEditorMemberId === memberId) &&
          (s.collaborators[player] || 0) <= s.avgEdits() // with edits less than a
        ),
      s => _.sumBy(s.chain, l => l.length)
    );

    // If there are enough players, try to ensure the chain isn't alternating
    if(this.players.length > this.clearance)
      available = available.filter(s => !s.editors.slice(-this.clearance).includes(player));

    return available[0];
  }

  // --- Fixed rotation ring (private sync games) ---------------------------
  // Stories are passed in a fixed cyclic order chosen randomly at start:
  // ring[i] always passes the story they finish to ring[i+1]. Absent players
  // are skipped so the remaining authors can still finish every story, but the
  // relative order between the present players never changes.

  // Build the ring + successor map from a (shuffled) player order.
  initRing(order) {
    this.ring = order.slice();
    this.succ = {};
    const n = this.ring.length;
    for (let i = 0; i < n; i++)
      this.succ[this.ring[i]] = this.ring[(i + 1) % n];
  }

  // The next still-present player after `pid` in the ring (skips players who
  // left). Returns `pid` itself if they are the only one left, or '' if none.
  nextInRing(pid) {
    if (!this.succ || !this.succ[pid]) return '';
    let cur = this.succ[pid];
    for (let i = 0; i < this.ring.length; i++) {
      if (this.players.includes(cur)) return cur;
      cur = this.succ[cur];
    }
    return '';
  }

  // Resolve a chain's designated next author to a present player (advancing
  // past anyone who has left the game).
  ringTarget(pid) {
    if (pid && this.players.includes(pid)) return pid;
    return pid ? this.nextInRing(pid) : '';
  }

  // Assign every free, writable chain to its designated next author in the
  // ring, when that author isn't already busy with another chain.
  assignRing() {
    const busy = {};
    for (const c of this.chains)
      if (c.editor) busy[c.editor] = true;

    const free = _.sortBy(
      this.chains.filter(c => !c.editor && !c.closed &&
        _.sumBy(c.chain, l => l.length) + MAX_CONTRIBUTION <= MAX_STORY_CHARS),
      c => _.sumBy(c.chain, l => l.length)
    );

    for (const c of free) {
      const target = this.ringTarget(c.nextEditor);
      if (target && !busy[target]) {
        c.nextEditor = target; // collapse past any players who left
        this.assignChain(target, c);
        busy[target] = true;
      }
    }
  }

  start() {
    const numPlayers = this.players.length;
    const { numStories, numLinks } = this.config;

    this.chains = _.range(numStories)
      .map(() => new Chain(numPlayers, numLinks));

    // Random starting order — fixed for the rest of the game.
    const players = _.shuffle(this.players);

    if (!this.lobby.isAsync) {
      // Private game: fixed rotation. Give each player one starting story and
      // let redistribute() hand them out via the ring.
      this.initRing(players);
      for (let i = 0; i < this.chains.length; i++)
        this.chains[i].nextEditor = players[i % players.length];
      this.redistribute();
      return;
    }

    // Public async game: balancing assignment.
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
    if (!this.lobby.isAsync && this.ring) {
      // Private game: assign strictly by the fixed ring rotation.
      this.assignRing();
    } else {
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
      this.lobby.completedAt = Date.now();
      this.lobby.completedLikes = _.sumBy(this.chains, c => _.size(_.filter(c.likes, v => v)));
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

  // Abort mid-game: show partial stories to remaining players and wait for them
  // to click Done before ending the game (so they can read what was written).
  abort() {
    for (const pid in this.timers) clearTimeout(this.timers[pid]);
    this.timers = {};
    this.deadlines = {};
    for (const pid in this.idleTimers) clearTimeout(this.idleTimers[pid]);
    this.idleTimers = {};

    this.aborted = true;
    // Release every chain so no one is left assigned as an editor — otherwise
    // getPlayerState would send them back to EDITING on the next sendGameInfo().
    for (const c of this.chains)
      c.editor = '';

    // No players left to read — end immediately rather than leaving lobby stuck in PLAYING
    if (this.players.length === 0) {
      this.lobby.endGame();
      return;
    }

    // Send the partial stories, then broadcast state so every remaining player
    // enters READING (getPlayerState now resolves to READING while aborted).
    this.lobby.emitAll('story:result', this.compilePartialStories());
    this.sendGameInfo();
  }

  cleanup() {}

  handleMessage(pid, type, data) {
    switch(type) {

    case 'story:result':
      if (this.aborted) {
        this.emitTo(pid, 'story:result', this.compilePartialStories());
      } else if (this.getGameProgress() === 1) {
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

      if(line.length < 1 || line.length > MAX_CONTRIBUTION)
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

      // If this writer was in the "last link" zone (same threshold the client
      // uses to show "Finish"), their contribution closes the story — otherwise
      // a short final line would leave the chain assignable between 3500–3750
      // chars and the "Finish" promise would be a lie.
      const wasLastLink = _.sumBy(story.chain, l => l.length) + 2 * MAX_CONTRIBUTION > MAX_STORY_CHARS;
      story.addLink(pid, line, authorName, memberId);
      if (wasLastLink)
        story.closed = true;

      // Private game: pass the story to the next present author in the ring.
      if (!this.lobby.isAsync && this.ring)
        story.nextEditor = this.nextInRing(pid);

      this.redistribute();

      break;

    // Player skips their turn — release the chain so someone else can continue
    case 'story:skip': {
      if (!this.lobby.isAsync) return;
      const skipChain = this.chains.find(s => s.editor === pid);
      if (!skipChain) return;
      this.clearTimer(pid);
      // Block immediate reassignment by both playerId and memberId, so a
      // skip-then-rejoin (which yields a new playerId) can't grab it back.
      skipChain.lastEditor = pid;
      const skipPlayerObj = this.lobby.players.find(p => p.playerId === pid);
      skipChain.lastEditorMemberId = skipPlayerObj ? skipPlayerObj.id : '';
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
      const reading = this.aborted || this.getGameProgress() === 1;
      if(typeof data === 'number' && data >= 0 && data <= this.chains.length && reading) {
        this.chains[data].likes[pid] = !this.chains[data].likes[pid];
        this.sendGameInfo();
      }
      break;
    }
  }

  getGameProgress() {
    const { numStories } = this.config;
    const progressSum = _.sumBy(this.chains, s => {
      const chars = _.sumBy(s.chain, l => l.length);
      return (s.closed || chars + MAX_CONTRIBUTION > MAX_STORY_CHARS) ? 1 : chars / MAX_STORY_CHARS;
    });
    return progressSum / numStories;
  }

  getPlayerState(pid) {
    const story = this.aborted ? null : this.chains.find(s => s.editor === pid);
    const done = this.aborted || this.getGameProgress() === 1;

    return story ? {
      id: pid,
      state: 'EDITING',
      isLastLink: _.sumBy(story.chain, l => l.length) + 2 * MAX_CONTRIBUTION > MAX_STORY_CHARS,
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
    // "reading" covers both a naturally finished game and an aborted one — in
    // both cases players are reading partial/complete stories, not writing.
    const reading = this.aborted || progress === 1;
    return {
      // players who are reading have check/clock icons, writers have a pencil
      icons: Object.fromEntries(this.players.map(p => ([
        p,
        reading
          ? this.finishedReading[p] ? 'check' : 'clock'
          : hasStory[p] ? 'pencil' : 'clock',
      ]))),
      progress,
      minWords: MIN_WORDS,
      likes: this.chains.map(s => _.size(_.filter(s.likes, l => l))),
      isComplete: progress === 1,
      reading,
    };
  }
};

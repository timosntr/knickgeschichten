<template>
  <div>
    <div v-if="idleKicked" style="margin: 32px 16px; text-align: center;">
      <sui-icon name="clock outline" color="orange" size="huge"/>
      <p style="margin-top: 12px; font-size: 1.1em;">Platz freigegeben</p>
      <p style="color: #888; font-size: 0.9em;">
        {{ idleReason === 'timeout'
          ? 'Deine Schreibzeit ist abgelaufen. Du wirst weitergeleitet…'
          : 'Du warst zu lange inaktiv. Du wirst weitergeleitet…' }}
      </p>
    </div>
    <div v-else-if="submitted" style="margin: 16px 0">
      <div ref="confetti" class="paper-confetti"></div>
      <p style="margin-top: 8px; font-size: 1.05em; font-weight: bold;">erfolgreich weitergegeben</p>

      <div class="share-contribution">
        <div class="share-contribution-label">dein Text:</div>
        <p class="share-contribution-text">{{ submittedLine }}</p>
      </div>

      <p style="font-size: 0.9em; color: #555; margin-bottom: 10px">
        Lade andere ein, die Geschichte weiterzuschreiben:
      </p>
      <div class="share-buttons">
        <sui-button color="green" @click="shareLink">
          <sui-icon name="share alternate"/> Teilen
        </sui-button>
        <sui-button basic icon @click="copyLink" :title="linkCopied ? 'Kopiert!' : 'Link kopieren'">
          <sui-icon :name="linkCopied ? 'check' : 'copy outline'"/>
        </sui-button>
      </div>
      <div v-if="linkCopied" style="font-size:0.82em; color:#21ba45; margin-top:6px">
        Link kopiert!
      </div>
      <div style="margin-top: 20px;">
        <sui-button basic size="small" @click="$router.push('/sessions')">
          <sui-icon name="arrow left"/> zu den Geschichten
        </sui-button>
      </div>
    </div>
    <div v-else-if="player.state === 'EDITING'"
      style="margin: 16px 0">
      <div v-if="player.link.length !== 0" class="context-block">
        <div class="write-label">{{player.isLastLink ? 'Beende die Geschichte! ' : ''}}Die Geschichte endet gerade mit…</div>
        <div class="context-snippet">
          <div v-for="(link, i) in player.link" :key="i" class="context-text">
            <sui-divider horizontal v-if="i !== 0" >Dann</sui-divider>
            {{link}}
          </div>
        </div>
      </div>
      <div v-if="player.deadline" class="countdown" :class="{urgent: secondsLeft <= 30}">
        <img :src="clockIcon" class="countdown-icon" alt=""> {{ formattedTime }} verbleibend
      </div>
      <sui-form @submit="writeLine" >
        <sui-form-field>
          <label class="write-label">{{ player.link.length !== 0 ? 'und so geht es weiter...' : 'Der erste Satz gehört dir...' }}</label>
          <textarea class="kg-textarea" v-model="line" rows="2"
            @keydown.enter.prevent
            @paste="onPaste">
          </textarea>
          <div v-if="game.minWords > 0" class="word-count" :class="{insufficient: wordCount < game.minWords}">
            {{wordCount}} / {{game.minWords}} Wörter
          </div>
          <div v-if="wordCount >= game.minWords && lastContextWords" class="preview-snippet">
            <div class="preview-label">Vorschau</div>
            <div class="preview-text">„…{{ lastContextWords }}"</div>
          </div>
        </sui-form-field>
        <button type="submit" class="write-btn write-btn--solid"
          :disabled="line.length < 1 || line.length > 250 || wordCount < game.minWords">
          {{player.isLastLink ? 'beenden' : 'weitergeben'}}
        </button>
        <button v-if="lobby.isAsync" type="button" class="write-btn write-btn--outline"
          @click="skipTurn">
          abbrechen
        </button>
      </sui-form>
    </div>
    <div v-else-if="player.state === 'WAITING'"
      style="margin: 16px">
      <sui-loader active centered inline size="huge" >
        Warte auf den nächsten Abschnitt
      </sui-loader>
    </div>
    <div v-else-if="player.state === 'READING' || !player.state && stories.length">
      <sui-loader active centered inline size="huge"  v-if="!stories.length">
        lädt Geschichten
      </sui-loader>
      <div style="text-align: left">
        <div style="text-align: right; margin-bottom: 8px">
          <div class="view-switch">
            <button type="button" :class="{ active: flowView }" @click="flowView = true">Fließtext</button>
            <button type="button" :class="{ active: !flowView }" @click="flowView = false">Abschnitte</button>
          </div>
        </div>
        <div v-for="(story, i) in stories" :key="i">
          <sui-divider horizonal v-if="i > 0" ></sui-divider>
          <sui-card >
            <div class="like-bar" v-if="lobby.isAsync">
              <div :is="player.state ? 'sui-button' : 'sui-label'"
                :color="player.state && !player.liked[i] ? 'grey' : 'red'"
                @click="player.state && $socket.emit('game:message', 'chain:like', i)"
                icon="heart"
                size="tiny">
                {{game.likes[i]}}
              </div>
            </div>
            <sui-card-content>
              <div v-if="storyAuthors(story)" class="story-authors">
                {{storyAuthors(story)}}
              </div>
              <!-- Fließtext-Ansicht -->
              <p v-if="flowView" class="flow-text">
                {{ story.map(e => e.link).join(' ') }}
              </p>
              <!-- Beitrags-Ansicht -->
              <sui-comment-group v-else>
                <sui-comment v-for="(entry, j) in story" :key="j">
                  <sui-comment-content>
                    <sui-comment-text>
                      <p style="font-family: 'Lora', serif;">
                        {{entry.link}}
                      </p>
                    </sui-comment-text>
                    <sui-comment-author v-if="entryAuthor(entry)"
                      style="text-align: right;">
                      &mdash;{{entryAuthor(entry)}}
                    </sui-comment-author>
                  </sui-comment-content>
                </sui-comment>
              </sui-comment-group>
            </sui-card-content>
          </sui-card>
        </div>
      </div>
      <div style="margin-top: 16px">
        <sui-button v-if="player.state === 'READING' && !lobby.isAsync"
          @click="$socket.emit('game:message', 'story:done', game.icons[player.id] !== 'check')"
          color="blue"
          :basic="game.icons[player.id] === 'check'">
          {{game.icons[player.id] === 'check' ? 'lese noch' : 'durchgelesen'}}
        </sui-button>
        <sui-button
          v-if="lobby.isAsync"
          basic
          size="small"
          @click="leaveToArchive">
          zurück
        </sui-button>
      </div>
    </div>
    <div v-else style="margin: 16px">
      <sui-loader active centered inline size="huge" >
        warte auf ander*n Autor*in
      </sui-loader>
    </div>
    <div class="kg-progress" style="margin-top: 14px" v-if="game.progress > 0 && game.progress !== 1">
      <div class="kg-progress__fill" :style="{ width: Math.round(game.progress * 100) + '%' }"></div>
    </div>
  </div>
</template>

<style>

.field {
  position: relative;
}

.sub.header {
  word-break: break-word;
  max-width: 292px;
}

.countdown {
  margin: 4px 0 12px;
  font-size: 11px;
  font-style: italic;
  color: var(--kg-green);
  text-align: center;
}
.countdown-icon {
  height: 12px;
  width: auto;
  vertical-align: -1px;
  margin-right: 4px;
}

.countdown.urgent {
  color: #db2828;
  font-weight: bold;
}

/* Writing view — new design (sizes from the XD "Schreiben" artboard) ------- */
.write-label {
  display: block;
  text-align: center;
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 13px;
  color: var(--kg-green);
  margin-bottom: 8px;
}
/* Semantic UI makes form labels bold; keep this one Metropolis Light. */
.ui.form .field > label.write-label {
  font-weight: 300;
  font-size: 13px;
}

/* Context shown while continuing a story ("Die Geschichte endet gerade mit…"
   + the last words). The torn-paper snippet background is a later step; the
   text sizes match the XD (label 13, context 11 italic). */
.context-block {
  margin-bottom: 14px;
}

/* Torn-paper snippet: the paper is a background image with transparent torn
   edges, so filter: drop-shadow follows that shape (a box-shadow would draw a
   rectangle). Shared by the context snippet and the "Vorschau" snippet. */
.context-snippet,
.preview-snippet {
  /* The XD places the scrap at ~311×155 (≈2:1) undistorted. Fix the box to the
     texture's own ratio so background-size:100% 100% doesn't stretch it, and
     centre the text inside. */
  aspect-ratio: 2515 / 1243;
  max-width: 320px;
  margin: 0 auto;
  background-image: url('../assets/paper-snippet.webp');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 0 40px;
  text-align: center;
  filter: drop-shadow(0 3px 4px rgba(25, 66, 30, 0.28));
}
.preview-snippet {
  margin-top: 16px;
}
.context-text,
.preview-text {
  font-family: var(--font-sans);
  font-size: 11px;
  font-style: italic;
  color: var(--kg-green);
  line-height: 1.5;
}
.preview-label {
  font-family: var(--font-sans);
  font-size: 11px;
  font-style: italic;
  color: var(--kg-muted);
  margin-bottom: 4px;
}

/* Textarea: 307×99, radius 23, white fill, 2px green outline (higher
   specificity than Semantic UI's `.ui.form textarea`). */
.ui.form textarea.kg-textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 99px;
  border: 2px solid var(--kg-green);
  border-radius: var(--kg-radius-card);
  background: #fff;
  padding: 14px 16px;
  font-family: var(--font-sans);
  font-size: 15px;
  color: var(--kg-green);
  resize: vertical;
  outline: none;
}
.ui.form textarea.kg-textarea:focus {
  border-color: var(--kg-green);
  box-shadow: 0 0 0 2px rgba(25, 66, 30, 0.12);
}

/* Compact pill button: 112×26, radius 15, 9px label (XD). */
.write-btn {
  display: block;
  margin: 10px auto 0;
  min-width: 112px;
  height: 26px;
  padding: 0 22px;
  border-radius: 15px;
  border: 1.5px solid var(--kg-green);
  font-family: var(--font-sans);
  font-size: 11px;
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.write-btn--solid { background: var(--kg-green); color: var(--kg-cream); }
.write-btn--outline { background: transparent; color: var(--kg-green); margin-top: 6px; }
.write-btn:hover { opacity: 0.88; }
.write-btn:disabled { opacity: 0.45; cursor: default; }

.word-count {
  margin-top: 6px;
  font-size: 11px;
  font-style: italic;
  color: var(--kg-green);
  text-align: center;
}

.word-count.insufficient {
  color: #db2828;
}

.like-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px 0;
}

.view-switch {
  display: inline-flex;
  border: 1px solid rgba(25, 66, 30, 0.25);
  border-radius: 999px;
  overflow: hidden;
}

.view-switch button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.72em;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8a8a83;
  padding: 4px 12px;
  transition: background 0.15s, color 0.15s;
}

.view-switch button:hover:not(.active) {
  color: #555;
}

.view-switch button.active {
  background: #19421e;
  color: #fff;
  font-weight: 700;
}

.flow-text {
  font-family: 'Lora', serif;
  font-size: 0.97em;
  line-height: 1.7;
  color: #333;
  text-align: left;
}

.story-authors {
  font-size: 0.85em;
  color: #888;
  text-align: right;
  margin-bottom: 8px;
}

.share-contribution {
  border-left: 3px solid #21ba45;
  background: rgba(33,186,69,0.05);
  border-radius: 0 4px 4px 0;
  padding: 10px 14px;
  margin: 14px 0;
  text-align: left;
}
.share-contribution-label {
  font-size: 0.78em;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
.share-buttons {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}
.share-buttons .button:first-child {
  flex: 1;
}
.share-contribution-text {
  font-family: 'Lora', serif;
  font-style: italic;
  font-size: 0.97em;
  color: #333;
  margin: 0;
}

/* Paper-snippet confetti on the share screen (bursts from this origin point). */
.paper-confetti {
  position: relative;
  width: 0;
  height: 0;
  margin: 10px auto 0;
}
.confetti-piece {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
  pointer-events: none;
  width: var(--w, 9px);
  height: var(--h, 13px);
  border-radius: 1px;
  /* lined college-block paper: pale sheet + thin blue rules */
  background:
    repeating-linear-gradient(to bottom, transparent 0 2.5px, rgba(74,124,196,0.6) 2.5px 3px),
    var(--paper, #fefefe);
  /* hairline edge + shadow so the pale paper stands out on the cream page */
  border: 0.5px solid rgba(25,66,30,0.22);
  box-shadow: 0 2px 4px rgba(25,66,30,0.28);
  animation: confetti-fall var(--dur, 2400ms) cubic-bezier(.22,.6,.35,1) forwards;
  animation-delay: var(--delay, 0ms);
  will-change: transform, opacity;
}
.confetti-piece.has-margin {
  border-left: 2px solid rgba(206,74,58,0.7);
}
@keyframes confetti-fall {
  0%   { transform: translate(0, 0) rotate(0); opacity: 1; }
  12%  { opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .confetti-piece { display: none; }
}

</style>

<script>
const clockIcon = require('../assets/icons/clock.png');

export default {
  sockets: {
    'lobby:info': function(info) {
      this.lobby = info;
    },
    'lobby:idle': function(reason) {
      this.idleKicked = true;
      this.idleReason = reason || 'idle';
      setTimeout(() => {
        this.$socket.emit('lobby:leave');
        this.$router.push('/sessions');
      }, 3000);
    },
    'game:info': function(info) {
      this.game = info;

      // First game:info after our async contribution decides stay vs leave.
      if (this.lobby.isAsync && this.awaitingWriteResult) {
        this.awaitingWriteResult = false;
        if (info.isComplete) {
          // Story finished — stay and show the reading view.
          if (!this.requestedResults) {
            this.$socket.emit('game:message', 'story:result');
            this.requestedResults = true;
          }
        } else {
          // Still room for more lines — release our spot, show share screen.
          this.$socket.emit('lobby:leave');
          this.submitted = true;
        }
        return;
      }

      if (this.game.isComplete && !this.requestedResults) {
        this.$socket.emit('game:message', 'story:result');
        this.requestedResults = true;
      }
    },
    'story:result': function(stories) {
      this.stories = stories;
    },
    'game:player:info': function(info) {
      // keep track of how long turns are
      const logWait = (event, name, playing) => {
        if(!this.playing) {
          this.playing = playing;
          return;
        }
        gtag('event', event, {
          [name]: Math.floor((Date.now() - this.timer)/1000),
          game_name: this.lobby.game,
          lobby_code: this.$route.params.code,
        });
        this.timer = Date.now();
        this.playing = playing;
      }

      if(this.player.state !== info.state) {
        switch(info.state) {
        case 'WAITING':
          this.line = '';
          logWait('turn_event', 'turn_duration', true);
          this.stopCountdown();
          break;
        case 'EDITING':
          vibrate(40);
          logWait('wait_event', 'wait_duration', true);

          break;
        case 'READING':
          vibrate(40, 100, 40);
          logWait('wait_event', 'wait_duration', false);
          this.stopCountdown();
          break;
        }
      }
      this.player = info;

      // Start countdown if we have a deadline
      if (info.state === 'EDITING' && info.deadline) {
        this.startCountdown(info.deadline);
      } else if (info.state !== 'EDITING') {
        this.stopCountdown();
      }
    }
  },
  beforeDestroy() {
    this.stopCountdown();
  },
  created() {
    // Restore an unsent draft for this story (survives reconnects, remounts and
    // full page reloads) so a dropped connection never loses what you typed.
    try {
      const draft = localStorage.getItem(this.draftKey);
      if (draft) this.line = draft;
    } catch (e) {}
    this.$socket.emit('game:info');
    this.$socket.emit('lobby:info');
  },
  watch: {
    // Persist the in-progress line as it's typed, clear it once it's gone
    // (submitted, skipped, or turn ended).
    line(val) {
      try {
        if (val) localStorage.setItem(this.draftKey, val);
        else localStorage.removeItem(this.draftKey);
      } catch (e) {}
    },
    // Fire the paper confetti once the share screen appears.
    submitted(val) {
      if (val) this.$nextTick(() => this.paperConfetti());
    },
  },
  computed: {
    draftKey() {
      return `oocDraft:${this.$route.params.code || ''}`;
    },
    nameTable() {
      return this.lobby.players.reduce((obj, p) => ({...obj, [p.playerId]: p.name}), {});
    },
    wordCount() {
      return this.line.trim().split(/\s+/).filter(w => w.length > 0).length;
    },
    lastContextWords() {
      const words = this.line.trim().split(/\s+/).filter(w => w.length > 0);
      if (!words.length) return '';
      return words.slice(-8).join(' ');
    },
    formattedTime() {
      const m = Math.floor(this.secondsLeft / 60);
      const s = this.secondsLeft % 60;
      return m > 0 ? `${m}:${String(s).padStart(2, '0')} Min` : `${s}s`;
    },
  },
  methods: {
    update() { this.$forceUpdate(); },
    // Burst of lined-paper snippets from the center of the share screen.
    paperConfetti() {
      const host = this.$refs.confetti;
      if (!host) return;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const papers = ['#fdfdf6', '#ffffff', '#f2f6fc', '#fbf8ef'];
      for (let i = 0; i < 32; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-piece' + (Math.random() < 0.35 ? ' has-margin' : '');
        const ang = Math.random() * Math.PI * 2;
        const dist = 55 + Math.random() * 95;
        p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
        p.style.setProperty('--dy', (80 + Math.random() * 170) + 'px');
        p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
        p.style.setProperty('--paper', papers[i % papers.length]);
        p.style.setProperty('--w', (7 + Math.random() * 5) + 'px');
        p.style.setProperty('--h', (11 + Math.random() * 7) + 'px');
        p.style.setProperty('--dur', (2300 + Math.random() * 800) + 'ms');
        p.style.setProperty('--delay', (Math.random() * 160) + 'ms');
        host.appendChild(p);
        setTimeout(() => p.remove(), 3400);
      }
    },
    // Resolve display name for a single entry: named / "Anonym" / fallback via nameTable
    entryAuthor(entry) {
      if (entry.authorName !== null && entry.authorName !== undefined) {
        return entry.authorName === '' ? 'Anonym' : entry.authorName;
      }
      // Fallback for old sessions without authorName
      const n = this.nameTable[entry.editor];
      return n || null;
    },
    // Build author line for a whole story card, e.g. "Von: Max, Julia, Anonym"
    storyAuthors(story) {
      // Collapse all anonymous contributions into a single "Anonym" so this
      // line agrees with the server's author count (completedAuthors =
      // named.size + (anyAnonymous ? 1 : 0)). Anonymous rejoins get new
      // playerIds, so deduping by editor would over-count real people.
      const named = new Set();
      let hasAnon = false;
      for (const entry of story) {
        if (entry.authorName !== null && entry.authorName !== undefined) {
          if (entry.authorName === '') hasAnon = true;
          else named.add(entry.authorName);
        } else {
          // fallback for old sessions
          const n = this.nameTable[entry.editor];
          if (n) named.add(n);
        }
      }
      const parts = [...named];
      if (hasAnon) parts.push('Anonym');
      return parts.length ? 'von: ' + parts.join(', ') : '';
    },
    inviteUrl() {
      return `${location.origin}/einladen/${this.$route.params.code}`;
    },
    shareLink() {
      if (navigator.share) {
        navigator.share({
          title: this.lobby.title || 'Knickgeschichte',
          text: 'Schreib weiter an unserer Geschichte!',
          url: this.inviteUrl(),
        }).catch(() => {});
      } else {
        this.copyLink();
      }
    },
    copyLink() {
      navigator.clipboard.writeText(this.inviteUrl()).then(() => {
        this.linkCopied = true;
        setTimeout(() => { this.linkCopied = false; }, 2500);
      }).catch(() => {});
    },
    onPaste(e) {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text');
      const clean = text.replace(/[\r\n]+/g, ' ').trim();
      document.execCommand('insertText', false, clean);
    },
    writeLine(event) {
      event.preventDefault();

      if(this.line.length < 1 || this.line.length > 250)
        return;

      this.submittedLine = this.line;
      this.$socket.emit('game:message', 'story:line', this.line);
      this.line = '';

      if (this.lobby.isAsync) {
        // Defer the stay/leave decision to the next game:info. isLastLink is
        // only a "might finish" hint and can be true while the story still has
        // room, so deciding here could strand us in the lobby. Let the server
        // tell us whether the story actually completed.
        this.awaitingWriteResult = true;
      }
    },
    startCountdown(deadline) {
      this.stopCountdown();
      this.secondsLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      this.countdownInterval = setInterval(() => {
        this.secondsLeft = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        if (this.secondsLeft <= 0) this.stopCountdown();
      }, 1000);
    },
    stopCountdown() {
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }
    },
    skipTurn() {
      this.line = '';  // abandon the turn — drop any saved draft (via watcher)
      this.$socket.emit('game:message', 'story:skip');
      this.$router.push('/');
    },
    leaveToArchive() {
      this.$socket.emit('lobby:leave');
      this.$router.push('/archive');
    },
    requestExport() {
      this.$socket.emit('game:message', 'story:export');
    },
    copyStories() {
      const text = this.stories.map((story, i) =>
        `=== Story ${i + 1} ===\n` +
        story.map(e =>
          e.link + (e.editor && this.nameTable[e.editor] ? ` (${this.nameTable[e.editor]})` : '')
        ).join('\n')
      ).join('\n\n');
      navigator.clipboard.writeText(text).catch(() => {});
      this.copied = true;
      setTimeout(() => { this.copied = false; }, 2000);
    },
  },
  data() {
    return {
      clockIcon,
      line: '',
      stories: [],
      requestedResults: false,
      awaitingWriteResult: false,
      player: { state: '', id: '', },
      game: { icons: {}, likes: [], },
      timer: Date.now(),
      playing: false,
      lobby: ({
        admin: '',
        players: [],
        members: [],
        game: '',
        config: {},
        isAsync: false,
      }),
      secondsLeft: 0,
      countdownInterval: null,
      submitted: false,
      submittedLine: '',
      linkCopied: false,
      idleKicked: false,
      idleReason: 'idle',
      copied: false,
      flowView: false,
    };
  },
};
</script>

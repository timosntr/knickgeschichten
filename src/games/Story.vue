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
    <div v-else-if="submitted" class="share-screen">
      <div ref="confetti" class="paper-confetti"></div>
      <p class="share-status"><span class="share-check">&#10003;</span> erfolgreich weitergegeben</p>

      <p class="share-label">Dein Text:</p>
      <div class="preview-snippet share-snippet">
        <p class="preview-text">&hellip;{{ submittedLine }}</p>
      </div>

      <p class="share-invite">Lade andere ein, die Geschichte weiterzuschreiben:</p>
      <button type="button" class="write-btn write-btn--solid share-teilen" @click="shareLink">
        teilen
      </button>
      <button type="button" class="write-btn write-btn--outline share-copy" @click="copyLink">
        {{ linkCopied ? 'Link kopiert!' : 'Link kopieren' }}
      </button>
      <button type="button" class="read-back share-back" @click="$router.push('/sessions')">
        zurück zu den Geschichten
      </button>
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
      <div class="read-view">
        <div class="read-toggle-row">
          <div class="view-switch">
            <button type="button" :class="{ active: flowView }" @click="flowView = true">Fließtext</button>
            <button type="button" :class="{ active: !flowView }" @click="flowView = false">Abschnitte</button>
          </div>
        </div>
        <div v-for="(story, i) in stories" :key="i" class="read-story">
          <div class="read-card">
            <!-- Public stories show their authors at the top-right of the card. -->
            <div v-if="lobby.isAsync && storyAuthors(story)" class="read-card__authors">
              {{ storyAuthors(story) }}
            </div>
            <!-- Fließtext: one continuous text -->
            <p v-if="flowView" class="read-text">
              {{ story.map(e => e.link).join(' ') }}
            </p>
            <!-- Abschnitte: each section followed by its author -->
            <div v-else class="read-sections">
              <div v-for="(entry, j) in story" :key="j" class="read-section">
                <p class="read-text">{{ entry.link }}</p>
                <p v-if="entryAuthor(entry)" class="read-section__author">&ndash; {{ entryAuthor(entry) }}</p>
              </div>
            </div>
          </div>
          <!-- Public stories: a small heart like pill under the card, bottom-left. -->
          <div v-if="lobby.isAsync" class="read-like">
            <button type="button" class="like-pill"
              :class="{ 'is-liked': player.liked && player.liked[i] }"
              @click="player.state && $socket.emit('game:message', 'chain:like', i)">
              <span class="like-pill__heart">&#9829;</span><span
                v-if="game.likes[i]" class="like-pill__count">{{ game.likes[i] }}</span>
            </button>
          </div>
        </div>
      </div>
      <div class="read-actions">
        <button v-if="player.state === 'READING' && !lobby.isAsync"
          type="button" class="write-btn"
          :class="game.icons[player.id] === 'check' ? 'write-btn--outline' : 'write-btn--solid'"
          @click="$socket.emit('game:message', 'story:done', game.icons[player.id] !== 'check')">
          {{ game.icons[player.id] === 'check' ? 'lese noch' : 'durchgelesen' }}
        </button>
        <button v-if="lobby.isAsync"
          type="button" class="read-back"
          @click="leaveToArchive">
          zurück zu den Geschichten
        </button>
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

/* Textarea: 307×99, radius 23, cream fill (same as the page — unfilled
   fields blend in), 2px green outline (higher specificity than Semantic UI's
   `.ui.form textarea`). */
.ui.form textarea.kg-textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 99px;
  border: 2px solid var(--kg-green);
  border-radius: var(--kg-radius-card);
  background: var(--kg-cream);
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
  box-sizing: border-box;
  /* Buttons shrink-wrap their content by default; a plain <a> (used for the
     "Diese Lobby gibt es nicht" screen) does not, so it needs this explicit. */
  width: fit-content;
  margin: 10px auto 0;
  min-width: 112px;
  height: 26px;
  padding: 0 22px;
  border-radius: 15px;
  border: 1.5px solid var(--kg-green);
  font-family: var(--font-sans);
  font-size: 11px;
  line-height: 24px;               /* height minus the 1.5px border, both sides */
  text-align: center;
  text-decoration: none;           /* also used on <router-link>/<a> */
  cursor: pointer;
  transition: background 0.3s ease-in-out, color 0.3s ease-in-out, opacity 0.15s ease;
}
.write-btn--solid { background: var(--kg-green); color: var(--kg-cream); }
.write-btn--outline { background: transparent; color: var(--kg-green); margin-top: 6px; }
/* XD hover (component "beitreten", Hover-Zustand): the solid green button flips
   to its outline look — transparent fill, green text — over 0.3s ease-in-out.
   The 1.5px green border is already present in both states, so no layout shift. */
.write-btn--solid:hover:not(:disabled) {
  background: transparent;
  color: var(--kg-green);
  opacity: 1;
}
.write-btn--outline:hover:not(:disabled) { opacity: 0.88; }
/* Cream pill for use on a green surface (XD component "lesen", Archive cards):
   cream fill + green text with a cream 1.5px border. Its Hover-Zustand mirrors
   the solid flip — transparent fill, cream border, cream text — over 0.3s. The
   cream border is present in both states, so the flip causes no layout shift. */
.write-btn--read {
  background: var(--kg-cream);
  color: var(--kg-green);
  border-color: var(--kg-cream);
}
.write-btn--read:hover:not(:disabled) {
  background: transparent;
  color: var(--kg-cream);
  opacity: 1;
}
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

/* --- Reading view (XD: 87c69ec3 public / cf77b714 private) ------------------
   One big story card, a Fließtext/Abschnitte toggle above it, per-section
   author credits in the Abschnitte view, and (public only) a heart like pill
   under the card. Content column capped at the XD's 307. */
.read-view {
  width: 307px;
  max-width: 100%;
  margin: 0 auto;
  text-align: left;
}
.read-toggle-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}
.read-story { margin-bottom: 8px; }

/* Fließtext/Abschnitte toggle: two 66x26 r15 pills (XD 9px label). Active pill
   is filled green with cream text; the inactive one is the cream outline. */
.view-switch {
  display: inline-flex;
  gap: 6px;
}
.view-switch button {
  height: 26px;
  min-width: 66px;
  padding: 0 10px;
  border: 1.5px solid var(--kg-green);
  border-radius: 15px;
  background: var(--kg-cream);
  color: var(--kg-green);
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 9px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.view-switch button.active {
  background: var(--kg-green);
  color: var(--kg-cream);
}

/* Big story card: r23, cream fill, 2px green border. */
.read-card {
  box-sizing: border-box;
  border: 2px solid var(--kg-green);
  border-radius: var(--kg-radius-card);
  background: var(--kg-cream);
  padding: 22px;
  color: var(--kg-green);
  text-align: left;
}
.read-card__authors {
  font-family: var(--font-sans);
  font-weight: 500;
  font-style: italic;
  font-size: 13px;
  color: var(--kg-green);
  text-align: right;
  margin-bottom: 12px;
}
.read-text {
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 13px;
  line-height: 1.6;
  color: var(--kg-green);
  margin: 0;
  white-space: pre-wrap;
}
.read-section { margin-bottom: 18px; }
.read-section:last-child { margin-bottom: 0; }
.read-section__author {
  font-family: var(--font-sans);
  font-weight: 500;
  font-style: italic;
  font-size: 13px;
  color: var(--kg-green);
  text-align: right;
  margin: 6px 0 0;
}

/* Heart like pill under the card, left-aligned (public/archive stories). */
.read-like { margin: 8px 0 0 6px; }
.like-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 13px;
  border: 1.5px solid var(--kg-green);
  border-radius: var(--kg-radius-pill);
  background: var(--kg-cream);
  color: var(--kg-green);
  font-family: var(--font-sans);
  font-size: 11px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}
.like-pill__heart { font-size: 12px; line-height: 1; }
.like-pill.is-liked {
  background: var(--kg-green);
  color: var(--kg-cream);
}

/* Bottom actions: solid "durchgelesen" (private) / underlined back link. */
.read-actions {
  display: flex;
  gap: 14px;
  justify-content: center;
  align-items: center;
  margin-top: 20px;
}
.read-actions .write-btn { margin: 0; }
.read-back {
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 13px;
  color: var(--kg-green);
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.2s ease;
}
/* XD hover state: text (and its underline) turn blue. */
.read-back:hover {
  color: var(--kg-blue);
}

/* --- Teilen / share screen (XD artboard b3fe0be0) -------------------------- */
.share-screen { text-align: center; }
/* "✓ erfolgreich weitergegeben" reads like a subtitle under the menu title. */
.share-status {
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 13px;
  color: var(--kg-green);
  margin: 0;
}
.share-check { margin-right: 5px; }
.share-label {
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 13px;
  color: var(--kg-green);
  margin: 44px 0 0;
}
/* Your contribution on a torn-paper scrap (reuses .preview-snippet), but with
   the paper texture rotated 180°. The paper moves to a rotated ::before so the
   text stays upright; the drop-shadow is pre-flipped (0 -3px) so it still falls
   downward after the rotation. */
.share-snippet {
  position: relative;
  margin-top: 8px;
  background-image: none;
  filter: none;
}
.share-snippet::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image: url('../assets/paper-snippet.webp');
  background-size: 100% 100%;
  background-repeat: no-repeat;
  transform: rotate(180deg);
  filter: drop-shadow(0 -3px 4px rgba(25, 66, 30, 0.28));
}
.share-snippet .preview-text {
  position: relative;
  z-index: 1;
}
.share-invite {
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 13px;
  color: var(--kg-green);
  margin: 44px 0 16px;
}
/* "teilen" pill: XD 163x26, solid green. XD hover state turns it blue (not the
   default solid->outline flip), matching the blue back-link hover. */
.share-teilen.write-btn {
  width: 163px;
  min-width: 0;
  margin: 0 auto;
}
.share-teilen.write-btn--solid:hover:not(:disabled) {
  background: var(--kg-blue);
  border-color: var(--kg-blue);
  color: var(--kg-cream);
}
/* "Link kopieren": outline pill under "teilen", same width. */
.share-copy.write-btn {
  width: 163px;
  min-width: 0;
  margin: 10px auto 0;
}
/* Back link reuses .read-back (green, underline, blue on hover). */
.share-back { margin-top: 14px; }

/* Paper-snippet confetti on the share screen (bursts from this origin point).
   Zero-size, no margin — it must not add vertical spacing above the status. */
.paper-confetti {
  position: relative;
  width: 0;
  height: 0;
  margin: 0 auto;
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

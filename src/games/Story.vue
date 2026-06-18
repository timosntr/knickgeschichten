<template>
  <div>
    <div v-if="idleKicked" style="margin: 32px 16px; text-align: center;">
      <sui-icon name="clock outline" color="orange" size="huge"/>
      <p style="margin-top: 12px; font-size: 1.1em;">Platz freigegeben</p>
      <p style="color: #888; font-size: 0.9em;">Du warst zu lange inaktiv. Du wirst weitergeleitet…</p>
    </div>
    <div v-else-if="submitted" style="margin: 32px 16px; text-align: center;">
      <sui-icon name="check circle" color="green" size="huge"/>
      <p style="margin-top: 12px; font-size: 1.1em;">Beitrag gesendet!</p>
      <p style="color: #888; font-size: 0.9em;">Du wirst gleich weitergeleitet…</p>
    </div>
    <div v-else-if="player.state === 'EDITING'"
      style="margin: 16px 0">
      <h2 is="sui-header" icon="pencil" v-if="player.link.length !== 0">
        {{player.isLastLink ? 'Finish the story! ' : ''}}The story so far ends with...
        <div style="margin-top: 10px">
          <div v-for="(link, i) in player.link" :key="i">
            <sui-divider horizontal v-if="i !== 0" >Then</sui-divider>
            <sui-header-subheader>
              {{link}}
            </sui-header-subheader>
          </div>
        </div>
      </h2>
      <h2 is="sui-header" icon="pencil" v-else-if="player.link.length === 0">
        Write the first line
      </h2>
      <div v-if="player.deadline" class="countdown" :class="{urgent: secondsLeft <= 10}">
        ⏱ {{ secondsLeft }}s remaining
      </div>
      <sui-form @submit="writeLine" >
        <sui-form-field>
          <label>The Story Goes...</label>
          <textarea v-model="line" rows="2"
            @keydown.enter.prevent
            @paste="onPaste">
          </textarea>
          <div class="char-count">
            {{line.length}}/250
          </div>
          <div v-if="game.minWords > 0" class="word-count" :class="{insufficient: wordCount < game.minWords}">
            {{wordCount}} / {{game.minWords}} Wörter
          </div>
        </sui-form-field>
        <sui-button type="submit"
          :color="player.isLastLink ? 'green' : 'blue'"
                   :disabled="line.length < 1 || line.length > 250 || wordCount < game.minWords">
          {{player.isLastLink ? 'Finish' : 'Sign'}}
        </sui-button>
        <sui-button v-if="lobby.isAsync"
          type="button"
                   basic
          @click="skipTurn"
          style="margin-top: 6px;">
          Abbrechen
        </sui-button>
      </sui-form>
    </div>
    <div v-else-if="player.state === 'WAITING'"
      style="margin: 16px">
      <sui-loader active centered inline size="huge" >
        Waiting on Other Authors
      </sui-loader>
    </div>
    <div v-else-if="player.state === 'READING' || !player.state && stories.length">
      <sui-loader active centered inline size="huge"  v-if="!stories.length">
        Loading Stories
      </sui-loader>
      <div style="text-align: left">
        <div style="text-align: right; margin-bottom: 8px">
          <button class="view-toggle" @click="flowView = !flowView">
            {{ flowView ? 'Beiträge' : 'Fließtext' }}
          </button>
        </div>
        <div v-for="(story, i) in stories" :key="i">
          <sui-divider horizonal v-if="i > 0" ></sui-divider>
          <sui-card >
            <div class="like-bar">
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
          {{game.icons[player.id] === 'check' ? 'Still Reading' : 'Done Reading'}}
        </sui-button>
        <sui-button
          v-if="lobby.isAsync"
          basic
          size="small"
          @click="leaveToArchive">
          Zurück
        </sui-button>
      </div>
    </div>
    <div v-else style="margin: 16px">
      <sui-loader active centered inline size="huge" >
        Stories are Being Written
      </sui-loader>
    </div>
    <sui-progress
           v-if="game.progress > 0 && game.progress !== 1"
      state="active"
      progress
      indicating
      :percent="Math.round(game.progress * 100)"/>
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
  margin-bottom: 8px;
  font-size: 0.95em;
  color: #555;
}

.countdown.urgent {
  color: #db2828;
  font-weight: bold;
}

.word-count {
  margin-top: 4px;
  font-size: 0.85em;
  color: #21ba45;
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

.view-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.78em;
  color: #aaa;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 0;
}

.view-toggle:hover {
  color: #555;
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

</style>

<script>
export default {
  sockets: {
    'lobby:info': function(info) {
      this.lobby = info;
    },
    'lobby:idle': function() {
      this.idleKicked = true;
      setTimeout(() => {
        this.$socket.emit('lobby:leave');
        this.$router.push('/sessions');
      }, 3000);
    },
    'game:info': function(info) {
      this.game = info;
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
          this.playTurnSound();
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
    this.$socket.emit('game:info');
    this.$socket.emit('lobby:info');
  },
  computed: {
    nameTable() {
      return this.lobby.players.reduce((obj, p) => ({...obj, [p.playerId]: p.name}), {});
    },
    wordCount() {
      return this.line.trim().split(/\s+/).filter(w => w.length > 0).length;
    },
  },
  methods: {
    update() { this.$forceUpdate(); },
    // Resolve display name for a single entry: named / "Anonym" / fallback via nameTable
    entryAuthor(entry) {
      if (entry.authorName !== null && entry.authorName !== undefined) {
        return entry.authorName === '' ? 'Anonym' : entry.authorName;
      }
      // Fallback for old sessions without authorName
      const n = this.nameTable[entry.editor];
      return n || null;
    },
    // Build author line for a whole story card, e.g. "Von: Max, Julia, Anonyme"
    storyAuthors(story) {
      const named = new Set();
      let anonCount = 0;
      const seenAnonEditors = new Set();
      for (const entry of story) {
        if (entry.authorName !== null && entry.authorName !== undefined) {
          if (entry.authorName === '') {
            if (!seenAnonEditors.has(entry.editor)) {
              seenAnonEditors.add(entry.editor);
              anonCount++;
            }
          } else {
            named.add(entry.authorName);
          }
        } else {
          // fallback for old sessions
          const n = this.nameTable[entry.editor];
          if (n) named.add(n);
        }
      }
      const parts = [...named];
      if (anonCount === 1) parts.push('Anonym');
      else if (anonCount > 1) parts.push('Anonyme');
      return parts.length ? 'Von: ' + parts.join(', ') : '';
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

      const isLast = this.player.isLastLink;
      this.$socket.emit('game:message', 'story:line', this.line);
      this.line = '';

      if (this.lobby.isAsync) {
        if (isLast) {
          // Last contribution: stay in lobby, reading view will appear automatically
        } else {
          this.submitted = true;
          this.$socket.emit('lobby:leave');
          setTimeout(() => this.$router.push('/sessions'), 2000);
        }
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
      line: '',
      stories: [],
      requestedResults: false,
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
      idleKicked: false,
      copied: false,
      flowView: false,
    };
  },
};
</script>

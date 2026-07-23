<template>
  <ooc-page>
    <ooc-menu v-if="state === 'NO_LOBBY'"
      title="Diese Lobby gibt es nicht"
      subtitle="Vielleicht ist der Code abgelaufen oder falsch.">
      <div style="text-align: center; margin-top: 8px">
        <router-link is="sui-button" to="/" color="blue">
          zur Startseite
        </router-link>
      </div>
    </ooc-menu>
    <ooc-menu v-else-if="state === 'JOIN_LOBBY'">
      <div class="name-screen">
        <sui-form
                 @submit="e => enterName(e)"
          :error="!validName"
          :loading="loadingName"
          class="name-form">
          <!-- Design's big "Gib dir einen Namen" / "sei kreativ" was dropped in
               favour of a small "Name" label sitting just above the field. -->
          <label class="name-label" for="playerName">Name</label>
          <sui-form-field :disabled="anonymousJoin" :error="!validName">
            <input class="name-input"
              id="playerName"
              name="playerName"
              aria-label="Dein Name"
              :required="!anonymousJoin"
              @input="validName = true"
              v-model="name"
              :disabled="anonymousJoin"
              minlength="1"
              maxlength="15"
              autocomplete="on"
              placeholder="Uwe">
          </sui-form-field>
          <div v-if="!validName" class="name-error">
            Dieser Name ist nicht erlaubt. Bitte wähle einen anderen.
          </div>
          <sui-form-field v-if="lobbyInfo.isAsync" class="anon-field">
            <sui-checkbox
              v-model="anonymousJoin"
              label="anonym"/>
          </sui-form-field>
          <div class="name-buttons">
            <!-- .write-btn is a global pill (defined in Story.vue) -->
            <button type="button" class="write-btn write-btn--outline" @click="leaveLobby">
              zurück
            </button>
            <button type="submit" class="write-btn write-btn--solid">
              mitschreiben
            </button>
          </div>
        </sui-form>
      </div>
    </ooc-menu>
    <ooc-menu v-else-if="state === 'LOBBY_WAITING'"
      :title="lobbyInfo.title || (currGame ? currGame.title : 'Knickgeschichten')"
      :subtitle="currGame ? currGame.subtitle : ''">
      <div class="lobby-waiting">
        <div v-if="!lobbyInfo.isAsync">
          <div class="kg-divider"><span>Code</span></div>
          <div class="lobby-code">{{ codeDisplay }}</div>
        </div>

        <!-- Buttons are absent from the XD; added in the name-screen style:
             outline "verlassen" (like "zurück") + solid "Geschichten starten"
             (like "mitschreiben"). Non-admins only see "verlassen". Sit between
             the Code and the previous round. -->
        <div v-if="!lobbyInfo.isAsync && currGame" class="lobby-buttons">
          <button type="button" class="write-btn write-btn--outline" @click="leaveLobby">
            verlassen
          </button>
          <button v-if="lobbyInfo.admin === $root.playerId"
            type="button" class="write-btn write-btn--solid"
            :disabled="invalidConfig"
            @click="$socket.emit('game:start')">
            Geschichten starten
          </button>
        </div>

        <div v-if="!lobbyInfo.isAsync && lobbyInfo.completedStories && lobbyInfo.completedStories.length">
          <div class="kg-divider"><span>letzte Runde</span></div>
          <div class="story-accordion">
            <div v-for="(story, i) in lobbyInfo.completedStories" :key="i" class="story-acc-item">
              <button type="button" class="story-pill" :class="{ 'is-open': openStories[i] }"
                @click="toggleStory(i)">
                {{ storyTitle(story, i) }}
              </button>
              <div v-if="openStories[i]" class="story-body">
                <p>{{ story.map(e => e.link).join(' ') }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ooc-player-list
        v-if="!lobbyInfo.isAsync"
        :admin="lobbyInfo.admin"
        :players="lobbyInfo.players"
        :gameState="gameState"
        :lobbyState="state">
      </ooc-player-list>
    </ooc-menu>
    <ooc-menu v-else-if="state === 'PLAYING'"
      :title="lobbyInfo.title || (currGame ? currGame.title : 'Knickgeschichten')"
      :subtitle="currGame ? currGame.subtitle : ''">
      <ooc-game :game="lobbyInfo.game">
      </ooc-game>
      <ooc-player-list
        v-if="!lobbyInfo.isAsync"
        :admin="lobbyInfo.admin"
        :players="lobbyInfo.players"
        :lobbyState="state"
        :gameState="gameState">
      </ooc-player-list>
    </ooc-menu>
    <sui-dimmer :active="loading || state === 'LOADING'">
      <sui-loader  />
    </sui-dimmer>
    <sui-dimmer :active="reconnecting">
      <sui-loader>Verbindung verloren – verbinde neu …</sui-loader>
    </sui-dimmer>
    <ooc-util></ooc-util>
    <ooc-join-lobby :active="showJoinLobby" @close="showJoinLobby = false">
    </ooc-join-lobby>
  </ooc-page>
</template>

<style>

/* --- "Namen geben" screen (JOIN_LOBBY) --------------------------------------
   Values taken directly from the XD artboard (bc63d558): field 313x33 r17,
   fill #FFFFFF, border #19421E 1.5; buttons 112x26 r15. Mirrors the code
   screen (JoinLobby.vue) so the two entry screens look identical. */
.name-screen {
  /* Fixed 313 (XD) so the field stays wider than the 238 button row. This sits
     inside the ~352px .menu container, so cap at 100% (not 88%, which would
     clamp to ~310 here) — 313 still fits and can't overflow narrow screens. */
  width: 313px;
  max-width: 100%;
  margin: 0 auto;
  text-align: center;
}
.name-form {
  text-align: center;
}
/* Small "Name" label above the field (replaces the dropped XD title). */
.ui.form .name-label,
.name-label {
  display: block;
  text-align: center;
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 13px;
  color: var(--kg-green);
  margin: 0 0 6px;
}
.ui.form input.name-input {
  width: 100%;
  height: 33px;
  box-sizing: border-box;
  border: 1.5px solid var(--kg-green);
  border-radius: 17px;
  background: var(--kg-cream);   /* unfilled = same cream as the page */
  padding: 0 20px;
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--kg-green);
  text-align: left;
}
/* Keep the pill (and clean styling) in focus and Semantic's error state,
   both of which otherwise reshape/recolour the input. */
.ui.form input.name-input:focus,
.ui.form .field.error input.name-input {
  border-radius: 17px;
  background: var(--kg-cream);
  outline: none;
}
.ui.form input.name-input:focus {
  border-color: var(--kg-green);
  box-shadow: 0 0 0 2px rgba(25, 66, 30, 0.12);
}
.ui.form .field.error input.name-input {
  border-color: #db2828;
  color: var(--kg-green);
}
.ui.form input.name-input::placeholder {
  font-style: italic;
  font-size: 11px;
  color: var(--kg-muted);
}
.name-error {
  margin-top: 8px;
  font-size: 11px;
  font-style: italic;
  color: #db2828;
}
.anon-field.field {
  margin-top: 14px;
  text-align: center;
}
/* "anonym" toggle: a round box that fills solid green when checked
   (Semantic's default is a square with a dark checkmark). */
.anon-field .ui.checkbox label {
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 13px;
  color: var(--kg-green);
  padding-left: 24px;
}
.anon-field .ui.checkbox label:before {
  width: 16px;
  height: 16px;
  top: 1px;
  border-radius: 50%;
  border: 1.5px solid var(--kg-green);
  background: var(--kg-cream);   /* unchecked: same as page background */
}
.anon-field .ui.checkbox input:checked ~ label:before,
.anon-field .ui.checkbox input:focus:checked ~ label:before {
  background: var(--kg-green);   /* checked: solid green, no checkmark */
  border-color: var(--kg-green);
}
/* No checkmark glyph — the fill alone signals the state. The checked selector
   is needed to beat Semantic's higher-specificity checked rule. */
.anon-field .ui.checkbox label:after,
.anon-field .ui.checkbox input:checked ~ label:after,
.anon-field .ui.checkbox input:focus:checked ~ label:after {
  content: none;
}
.name-buttons {
  display: flex;
  gap: 14px;
  justify-content: center;
  margin-top: 22px;
}
/* Fixed 112px each (XD) so the two-button row is narrower than the 313 input. */
.name-buttons .write-btn {
  margin: 0;
  width: 112px;
  min-width: 0;
  padding: 0;
}

.player-table td {
  font-weight: normal !important;
}

/* --- Private lobby / waiting room (XD artboard 078aeb6f) -------------------- */
/* XD content column is 307 wide, centred (pills, dividers, code, buttons). */
.lobby-waiting {
  width: 307px;
  max-width: 100%;
  margin: 0 auto;
  text-align: center;
}

/* Section divider (XD): a 10px Metropolis-Light label flanked by thin 0.5px
   green rules. Replaces Semantic's large uppercase divider. */
.kg-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 24px 0 0;
}
.kg-divider::before,
.kg-divider::after {
  content: '';
  flex: 1;
  border-top: 0.5px solid var(--kg-green);
}
.kg-divider > span {
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 10px;
  color: var(--kg-green);
  white-space: nowrap;
}

/* Room code, big: Boska-Black 45px green, middle dots between characters. */
.lobby-code {
  font-family: var(--font-serif);
  font-weight: 700;
  font-size: 45px;
  line-height: 1.1;
  color: var(--kg-green);
  text-align: center;
  margin: 14px 0 4px;
  letter-spacing: 2px;
}

/* "letzte Runde" stories: outlined white pills (307x33 r17), named after the
   first author, italic Metropolis-Light 11. Click a pill to expand its full
   text underneath. */
.story-accordion {
  text-align: left;
  margin: 12px 0 0;
}
.story-acc-item { margin-bottom: 7px; }
.story-pill {
  display: block;
  width: 100%;
  height: 33px;
  box-sizing: border-box;
  padding: 0 18px;
  border: 1.5px solid var(--kg-green);
  border-radius: 17px;
  background: var(--kg-cream);
  color: var(--kg-green);
  font-family: var(--font-sans);
  font-weight: 300;
  font-style: italic;
  font-size: 11px;
  text-align: left;
  cursor: pointer;
}
.story-body {
  padding: 10px 18px 4px;
}
.story-body p {
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 13px;
  line-height: 1.5;
  color: var(--kg-green);
  white-space: pre-wrap;
  margin: 0;
  text-align: left;
}

/* Bottom action row, styled like the name screen (outline "verlassen" +
   solid "Geschichten starten"). */
.lobby-buttons {
  display: flex;
  gap: 14px;
  justify-content: center;
  margin: 24px 0 4px;
}
.lobby-buttons .write-btn { margin: 0; }

</style>

<script>

import gameInfo from '../../gameInfo';

const emptyInfo = () => ({
  admin: '',
  players: [],
  members: [],
  game: '',
  config: {},
  isAsync: false,
  isComplete: false,
  title: '',
});

export default {
  data() {
    return {
      name: localStorage.oocName || '',
      anonymousJoin: false,
      loading: true,
      creatingLobby: false,
      showJoinLobby: false,
      validLobby: false,
      gameState: { icons: {} },
      loadingName: false,
      validName: true,
      lobbyInfo: emptyInfo(),
      state: 'LOADING',
      reconnecting: false,
      reconnectTimer: null,
      openStories: {},
    };
  },
  computed:  {
    // Config fields to show in the lobby waiting UI (exclude 'players' and hidden fields)
    configFieldsForDisplay() {
      if (!this.currGame) return {};
      const { players, ...rest } = this.currGame.config;
      return Object.fromEntries(Object.entries(rest).filter(([, v]) => !v.hidden));
    },
    invalidConfig() {
      const numPlayers = this.lobbyInfo.players.length;
      for (const key in this.currGame.config) {
        if (this.lobbyInfo.config[key] === '#numPlayers' &&
          numPlayers < this.currGame.config[key].min)
          return true;
      }
      return false;
    },
    currGame() {
      return gameInfo[this.lobbyInfo.game];
    },
    // Room code shown big as "A·B·C·D" (XD: Boska-Black 45, middle dots).
    codeDisplay() {
      return (this.$route.params.code || '').toUpperCase().split('').join('·');
    },
  },
  methods: {
    update() { this.$forceUpdate(); },
    // Show the reconnecting overlay and arm the give-up timer. Shared by the
    // socket 'disconnect' handler and the browser 'offline' event so the
    // overlay appears the instant the network drops — socket.io itself only
    // fires 'disconnect' after its heartbeat times out (~20s), which is far too
    // late to be useful.
    beginReconnect() {
      if (this.state !== 'PLAYING' && this.state !== 'LOBBY_WAITING')
        return;
      this.reconnecting = true;
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        this.reconnecting = false;
        this.validLobby = false;
        this.state = 'NO_LOBBY';
      }, 20000);
    },
    onOffline() { this.beginReconnect(); },
    onOnline() {
      // Network is back. socket.io reconnects on its own and connect() rejoins;
      // hide the overlay optimistically so a recovered blip clears immediately
      // even if the socket never actually dropped.
      this.reconnecting = false;
      clearTimeout(this.reconnectTimer);
    },
    toggleStory(i) {
      this.$set(this.openStories, i, !this.openStories[i]);
    },
    storyPreview(story) {
      const text = story.map(e => e.link).join(' ');
      const words = text.trim().split(/\s+/);
      return words.length > 6 ? words.slice(0, 6).join(' ') + '…' : text;
    },
    // Title a story after whoever wrote its first line ("Geschichte von Pavlo");
    // fall back to a number when the first author is anonymous/unknown.
    storyTitle(story, i) {
      const first = story && story[0] && story[0].authorName;
      return first ? `Geschichte von ${first}` : `Geschichte ${i + 1}`;
    },
    leaveLobby() {
      this.$socket.emit('lobby:leave');
      this.$router.push('/');
    },
    enterName(event) {
      event.preventDefault();
      const name = this.anonymousJoin ? '' : event.target.playerName.value;
      if (!this.anonymousJoin) localStorage.oocName = name;
      this.loadingName = true;
      this.$socket.emit('member:name', name);
    },
    createLobby() {
      this.creatingLobby = true;
      this.validLobby = true;
      this.$socket.emit('lobby:create');
    },
    testLobby() {
      this.loading = true;
      const lobbyCode = this.$route.params.code;
      fetch(`/api/v1/lobby/${lobbyCode}`)
        .then(resp => {
          if(resp.status === 200) {
            if(this.state === 'NO_LOBBY' || this.state === 'LOADING')
              this.state = 'JOIN_LOBBY';
            this.$socket.emit('lobby:join', lobbyCode);
            this.validLobby = true;
          } else {
            this.state = 'NO_LOBBY';
            this.validLobby = false;
          }
          this.loading = false;
        })
        .catch(() => {
          this.validLobby = false;
          this.state = 'NO_LOBBY';
          this.loading = false;
        });
    },
  },
  sockets: {
    'member:nameOk': function(ok) {
      this.loadingName = false;
      if(!ok) {
        this.validName = false;
      } else {
        this.validLobby = true;
        this.state = this.lobbyInfo && this.lobbyInfo.state === 'PLAYING' ? 'PLAYING' : 'LOBBY_WAITING';
      }
    },
    'lobby:join': function(code) {
      this.creatingLobby = false;
      this.state = 'JOIN_LOBBY';
      this.validLobby = true;
      this.showJoinLobby = false;
      this.lobbyInfo = emptyInfo();
      const lobbyCode = this.$route.params.code;
      if(lobbyCode !== code) {
        this.$router.replace({ query: 'foo' });
        this.$router.push(`/lobby/${code}`);
      }
    },
    'lobby:leave': function(code) {
      this.validLobby = false;
      this.state = 'NO_LOBBY';
    },
    'game:info': function(state) {
      this.gameState = state;
    },
    'lobby:info': function(info) {
      // Remove gameState if we are not playing
      if(info.state !== 'PLAYING')
        this.gameState = { icons: {} };

      // Start playing if the lobby is playing
      if(info.state === 'PLAYING' && this.state === 'LOBBY_WAITING') {
        this.state = 'PLAYING';
        this.openStories = {};
        gtag('event', 'playing_game', {
          game_name: info.game,
          player_count: info.players.length,
          lobby_code: this.$route.params.code,
        });
      }

      // If the lobby says we're not playing, we're probably not playing
      if (this.state === 'PLAYING' && info.state === 'WAITING')
        this.state = 'LOBBY_WAITING';

      // Skip name entry for completed async sessions — join anonymously to read
      if (this.state === 'JOIN_LOBBY' && info.isAsync && info.isComplete) {
        this.loadingName = true;
        this.$socket.emit('member:name', '');
        return;
      }

      let name = localStorage.oocName;
      const target = info.players.find(p => !p.connected && p.name === name);

      if (this.state === 'JOIN_LOBBY' && this.rocketcrab && this.$route.params.code.startsWith('rc')) {
        localStorage.oocName = name = this.rocketcrab.name;
        this.loadingName = true;
        this.$socket.emit('member:name', name);
        if (target)
          this.$socket.emit('lobby:replace', target.playerId);
      }

      // automatically rejoin if there is a joinable slot with this name
      else if (this.state === 'JOIN_LOBBY' && this.validLobby && name && target) {{
        this.loadingName = true;
        this.$socket.emit('member:name', name);
        this.$socket.emit('lobby:replace', target.playerId);
      }}

      this.lobbyInfo = info;
    },
    disconnect(code) {
      // Brief drops are common (network blips, device sleep) and socket.io
      // auto-reconnects. Don't tear down an active game over a momentary loss —
      // keep the view mounted, show a reconnecting overlay, and only give up
      // after a grace period. This keeps the player in their seat and preserves
      // whatever they were typing.
      if (this.state === 'PLAYING' || this.state === 'LOBBY_WAITING') {
        this.beginReconnect();
        return;
      }
      this.validLobby = false;
      this.state = 'NO_LOBBY';
    },
    connect() {
      // Recovered — cancel any pending give-up and rejoin seamlessly.
      this.reconnecting = false;
      clearTimeout(this.reconnectTimer);
      const lobbyCode = this.$route.params.code;
      if(this.loading) {
        return;
      }
      if(!lobbyCode || lobbyCode.length < 4) {
        this.loading = false;
        this.state = 'NO_LOBBY';
      } else {
        this.testLobby();
      }
    }
  },
  beforeDestroy() {
    this.bus.$off('toggle-hide-lobby', this.update);
    clearTimeout(this.reconnectTimer);
    window.removeEventListener('offline', this.onOffline);
    window.removeEventListener('online', this.onOnline);
  },
  created() {
    this.bus.$on('toggle-hide-lobby', this.update);
    window.addEventListener('offline', this.onOffline);
    window.addEventListener('online', this.onOnline);
    const lobbyCode = this.$route.params.code;
    if(!lobbyCode || lobbyCode.length < 4) {
      this.loading = false;
      this.state = 'NO_LOBBY';
    } else {
      this.testLobby();
    }
  }
};
</script>
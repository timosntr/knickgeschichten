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
      <sui-form
               @submit="e => enterName(e)"
        :error="!validName"
        :loading="loadingName">
        <sui-form-field :disabled="anonymousJoin">
          <label>Name</label>
          <input name="playerName"
            :required="!anonymousJoin"
            @input="validName = true"
            v-model="name"
            :disabled="anonymousJoin"
            minlength="1"
            maxlength="15"
            autocomplete="on"
            placeholder="Uwe">
        </sui-form-field>
        <div v-if="!validName" style="color:#db2828; font-size:0.85em; margin:-6px 0 10px; text-align:left;">
          Dieser Name ist nicht erlaubt. Bitte wähle einen anderen.
        </div>
        <sui-form-field v-if="lobbyInfo.isAsync">
          <sui-checkbox
            v-model="anonymousJoin"
            label="anonym"/>
        </sui-form-field>
        <sui-button color="blue"  type="submit">
          mitschreiben
        </sui-button>
        <sui-button basic type="button" @click="leaveLobby">
          zurück
        </sui-button>
      </sui-form>
    </ooc-menu>
    <ooc-menu v-else-if="state === 'LOBBY_WAITING'"
      :title="lobbyInfo.title || (currGame ? currGame.title : 'Knickgeschichten')"
      :subtitle="currGame ? currGame.subtitle : ''">
      <div>
        <div v-if="!lobbyInfo.isAsync">
          <sui-divider horizontal >
            Code
          </sui-divider>
          <sui-statistic  style="margin-bottom: 14px; margin-top: 0;">
            <sui-statistic-value>
              {{$route.params.code}}
            </sui-statistic-value>
          </sui-statistic>
        </div>
        <div v-if="lobbyInfo.admin === $root.playerId && !lobbyInfo.isAsync">
          <div v-if="currGame" style="margin: 1em 0; text-align: center">
            <sui-button
              type="button"
              :disabled="invalidConfig"
              @click="$socket.emit('game:start')"
              color="blue">
              Geschichten starten
            </sui-button>
            <sui-button
              type="button"
              basic
              @click="leaveLobby">
              verlassen
            </sui-button>
          </div>
        </div>
        <div v-else-if="currGame && !lobbyInfo.isAsync">
          <div style="margin-top: 1em; text-align: center">
            <sui-button basic @click="leaveLobby">verlassen</sui-button>
          </div>
        </div>

        <div v-if="!lobbyInfo.isAsync && lobbyInfo.completedStories && lobbyInfo.completedStories.length"
          style="margin-top: 8px;">
          <sui-divider horizontal >
            letzte Runde
          </sui-divider>
          <div class="story-accordion">
            <div v-for="(story, i) in lobbyInfo.completedStories" :key="i" class="story-acc-item">
              <button type="button" class="story-acc-toggle" @click="toggleStory(i)">
                <span class="story-acc-title">{{ storyTitle(story, i) }}</span>
                <span class="story-acc-preview" v-if="!openStories[i]">{{ storyPreview(story) }}</span>
                <span class="story-acc-icon">{{ openStories[i] ? '▲' : '▼' }}</span>
              </button>
              <div v-if="openStories[i]" class="story-acc-body">
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

.player-table td {
  font-weight: normal !important;
}

.story-accordion {
  text-align: left;
}

.story-acc-item {
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  margin-bottom: 6px;
  overflow: hidden;
}

.story-acc-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 0.95em;
}

.story-acc-toggle:hover {
  background: rgba(0, 0, 0, 0.03);
}

.story-acc-title {
  font-weight: bold;
  white-space: nowrap;
}

.story-acc-preview {
  flex: 1;
  color: #999;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-acc-icon {
  margin-left: auto;
  font-size: 0.7em;
  color: #aaa;
}

.story-acc-body {
  padding: 4px 14px 14px;
}

.story-acc-body p {
  font-family: 'Lora', serif;
  line-height: 1.7;
  white-space: pre-wrap;
  margin: 0;
}

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
      gameInfo,
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
    }
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
    configVal(name) {
      const confVal = this.lobbyInfo.config[name];
      const defVal = gameInfo[this.lobbyInfo.game].config[name].defaults;
      return typeof confVal !== 'undefined' ? confVal : defVal;
    },
    deriveConfigText(name) {
      const val = this.configVal(name);
      const conf = gameInfo[this.lobbyInfo.game].config[name];

      switch(conf.type) {
      case 'int':
        return this.deriveConfigValue(name);
      case 'bool':
        return val === 'true' ? 'Yes' : 'No';
      case 'list':
        const entry = conf.options.find(v => v.name === val);
        return entry ? entry.text : '???';
      }
    },
    deriveConfigValue(name) {
      const val = this.configVal(name);
      const conf = gameInfo[this.lobbyInfo.game].config[name];

      switch(conf.type) {
      case 'int':
        switch(val) {
        case '#numPlayers':
          return Math.min(this.lobbyInfo.players.length, conf.max);
        default:
          return val;
        }
      case 'bool':
        return val;
      case 'list':
        return val
      }
    },
    updateConfig(name, val) {
      this.$socket.emit('lobby:game:config', name, val);
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
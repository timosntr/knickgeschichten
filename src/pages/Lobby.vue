<template>
  <ooc-page>
    <ooc-menu v-if="state === 'NO_LOBBY'"
      title="Invalid Lobby"
      subtitle="This lobby does not exist">
      <div>
        <sui-divider horizontal >
          Lobby
        </sui-divider>
        <sui-button-group>
          <sui-button
            color="green"
                       :loading="creatingLobby"
            @click="createLobby">
            Create
          </sui-button>
          <sui-button-or/>
          <sui-button
            color="blue"
                       :loading="showJoinLobby"
            @click="showJoinLobby = true">
            Join
          </sui-button>
        </sui-button-group>
        <sui-divider horizontal >
          Redirect
        </sui-divider>
        <sui-button-group vertical basic>
          <router-link is="sui-button"             to="/">
            Home
          </router-link>
          <a is="sui-button"
            href="https://github.com/meshiest/outofcontext/issues"
            target="_blank"
                                   rel="noopener noreferrer">
            Bug Report
          </a>
        </sui-button-group>
      </div>
    </ooc-menu>
    <ooc-menu v-else-if="state === 'JOIN_LOBBY'"
      title="Enter a Name"
      subtitle="Try to be creative">
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
            placeholder="Ethan">
        </sui-form-field>
        <sui-form-field v-if="lobbyInfo.isAsync">
          <sui-checkbox
            v-model="anonymousJoin"
            label="Anonym bleiben"/>
        </sui-form-field>
        <sui-button color="blue"  type="submit">
          Mitmachen
        </sui-button>
        <sui-button basic type="button" @click="leaveLobby">
          Leave
        </sui-button>
      </sui-form>
    </ooc-menu>
    <ooc-menu v-else-if="state === 'LOBBY_WAITING'"
      :title="lobbyInfo.title || (currGame ? currGame.title : 'Knickgeschichten')"
      :subtitle="currGame ? currGame.subtitle : ''">
      <div>
        <div v-if="!lobbyInfo.isAsync">
          <sui-divider horizontal >
            Lobby Code
          </sui-divider>
          <sui-statistic  style="margin-bottom: 14px; margin-top: 0;">
            <sui-statistic-value>
              {{$route.params.code}}
            </sui-statistic-value>
            <sui-statistic-label>
              {{phonetic}}
            </sui-statistic-label>
          </sui-statistic>
        </div>
        <div v-if="lobbyInfo.admin === $root.playerId && !lobbyInfo.isAsync" style="text-align: left">
          <sui-divider horizontal >
            Game Settings
          </sui-divider>
          <sui-form @submit="event => event.preventDefault()" >
            <div v-if="currGame">
              <sui-form-field v-for="(opt, name) in configFieldsForDisplay" :key="name">
                <label>{{opt.name}}</label>
                <div v-if="opt.type === 'int'" style="display: flex">
                  <sui-input
                    type="number"
                    @input="val => updateConfig(name, val)"
                    :value="deriveConfigValue(name)"
                    :min="opt.min"
                    :max="opt.max || 256"
                    autocomplete="off"/>
                  <sui-button v-if="opt.defaults === '#numPlayers'"
                    type="button"
                    :color="configVal(name) === '#numPlayers' ? 'blue' : undefined"
                                       @click="updateConfig(name, '#numPlayers')"
                    style="margin-left: 8px"
                    icon="users"/>
                </div>
                <div class="char-count" v-if="typeof opt.max !== 'undefined' && deriveConfigValue(name) > opt.max">
                  Maximum: {{opt.max}}
                </div>
                <div class="char-count" v-if="typeof opt.min !== 'undefined' &&
                (deriveConfigValue(name) < opt.min || configVal(name) === '#numPlayers' && lobbyInfo.players.length < opt.min)">
                  Minimum: {{opt.min}}
                </div>
                <sui-dropdown v-else-if="opt.type === 'bool'"
                  :value="deriveConfigValue(name)"
                  :options="[{text: 'Enabled', value: 'true'}, {text: 'Disabled', value: 'false'}]"
                  @input="val => updateConfig(name, val)"
                  selection>
                </sui-dropdown>
                <sui-dropdown v-else-if="opt.type === 'list'"
                  :value="deriveConfigValue(name)"
                  :options="opt.options.map(o => ({
                    text: o.more || o.text,
                    value: o.name,
                  }))"
                  @input="val => updateConfig(name, val)"
                  selection>
                </sui-dropdown>
              </sui-form-field>
              <div style="margin: 1em 0; text-align: center">
                <sui-button
                  type="button"
                  :disabled="invalidConfig"
                  @click="$socket.emit('game:start')"
                  color="blue">
                  Start Game
                </sui-button>
                <sui-button
                  type="button"
                  basic
                  @click="leaveLobby">
                  Leave
                </sui-button>
              </div>
            </div>
          </sui-form>
        </div>
        <div v-else-if="currGame && !lobbyInfo.isAsync">
          <sui-divider horizontal >
            Game Setup
          </sui-divider>
          <sui-card>
            <div style="display: flex; flex-flow: row wrap; align-items: center; justify-content: center;">
              <div v-for="(opt, name) in configFieldsForDisplay"
                :key="name"
                style="margin: 8px;">
                <sui-statistic >
                  <sui-statistic-value>
                    {{deriveConfigText(name)}}
                  </sui-statistic-value>
                  <sui-statistic-label>
                    {{opt.text}}
                  </sui-statistic-label>
                </sui-statistic>
              </div>
            </div>
          </sui-card>
          <div style="margin-top: 1em; text-align: center">
            <sui-button basic @click="leaveLobby">Leave</sui-button>
          </div>
        </div>

        <div v-if="!lobbyInfo.isAsync && lobbyInfo.completedStories && lobbyInfo.completedStories.length"
          style="margin-top: 8px;">
          <sui-divider horizontal >
            Letzte Runde
          </sui-divider>
          <div class="story-accordion">
            <div v-for="(story, i) in lobbyInfo.completedStories" :key="i" class="story-acc-item">
              <button type="button" class="story-acc-toggle" @click="toggleStory(i)">
                <span class="story-acc-title">Geschichte {{ i + 1 }}</span>
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
    <sui-label
      v-if="validLobby && !rocketcrab && !lobbyInfo.isAsync"
      class="lobby-code left"
      attached="top left">
      <code>
        {{$route.params.code.toUpperCase()}}
      </code>
    </sui-label>
    <sui-label
      v-if="lobbyInfo.admin === $root.playerId"
      class="lobby-code right"
      color="green"
      attached="top right">
      <sui-icon name="shield"/>
    </sui-label>
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

.lobby-code {
  position: fixed !important;
  top: 0 !important;
}

.lobby-code.left {
  left: 0 !important;
}

.lobby-code.right {
  right: 0 !important;
}

</style>

<script>

import gameInfo from '../../gameInfo';
import converter, { NATO_PHONETIC_ALPHABET } from 'phonetic-alphabet-converter'

const alphabet = {
  ...NATO_PHONETIC_ALPHABET,
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
}

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
      openStories: {},
    };
  },
  computed:  {
    phonetic() {
      return converter(this.$route.params.code, alphabet).join(' - ');
    },
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
    toggleStory(i) {
      this.$set(this.openStories, i, !this.openStories[i]);
    },
    storyPreview(story) {
      const text = story.map(e => e.link).join(' ');
      const words = text.trim().split(/\s+/);
      return words.length > 6 ? words.slice(0, 6).join(' ') + '…' : text;
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
      this.validLobby = false;
      this.state = 'NO_LOBBY';
    },
    connect() {
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
  },
  created() {
    this.bus.$on('toggle-hide-lobby', this.update);
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
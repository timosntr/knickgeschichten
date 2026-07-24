<template>
  <div class="player-list-widget">
    <div class="kg-divider">
      <span>Schreibraum<span
        v-if="lobbyState === 'PLAYING' && $route.params.code"
        class="lobby-code-inline">{{ $route.params.code.toUpperCase() }}</span></span>
    </div>

    <div class="player-pills">
      <div v-for="p in sortedPlayers"
        :key="p.playerId"
        class="player-pill"
        :class="{ 'is-self': $root.playerId === p.id, 'is-off': !p.connected }">
        <span class="player-pill__name">{{ p.name }}</span>
        <span class="player-pill__icons">
          <sui-button v-if="!p.connected && !isActivePlayer"
            size="tiny"
            basic
            @click="$socket.emit('lobby:replace', p.playerId)">
            beitreten
          </sui-button>
          <img v-if="admin === p.id"
            class="pl-icon pl-icon--shield" :class="{ 'pl-icon--wash': washed('shield', p) }"
            :src="iconFor('shield', p)" alt="Admin">
          <img v-if="gameState.icons[p.playerId]"
            class="pl-icon" :class="{ 'pl-icon--wash': washed(gameState.icons[p.playerId], p) }"
            :src="iconFor(gameState.icons[p.playerId], p)" alt="">
        </span>
      </div>
      <div v-if="!players.length" class="player-empty">keine Autor*innen da</div>
    </div>

    <div>
      <button type="button" class="write-btn"
        :class="confirmEndGame ? 'write-btn--solid' : 'write-btn--outline'"
        @click="tryEndGame"
        v-if="$root.playerId === admin && lobbyState === 'PLAYING' && !gameState.reading">
        {{ confirmEndGame ? 'bist du sicher?' : 'Geschichten beenden' }}
      </button>
    </div>
  </div>
</template>

<style>

/* The "Schreibraum" divider now uses the shared .kg-divider (defined in
   Lobby.vue) so all three lobby dividers match the XD exactly. */
.lobby-code-inline {
  margin-left: 8px;
  font-family: monospace;
  font-size: 0.9em;
  font-weight: normal;
  letter-spacing: 1px;
  opacity: 0.55;
}

/* XD content column is 307 wide, centred. */
.player-list-widget {
  width: 307px;
  max-width: 100%;
  margin: 0 auto;
}

.player-pills {
  margin: 4px 0 12px;
}

/* Each author is a pill; your own row is filled blue, everyone else is an
   outlined pill. Names are italic per the design. */
.player-pill {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 33px;
  padding: 0 16px;
  margin-bottom: 7px;
  border: 1.5px solid var(--kg-green);
  border-radius: var(--kg-radius-pill);
  background: var(--kg-cream); /* unfilled = same cream as the page (self row overrides to blue) */
  color: var(--kg-green);
  font-style: italic;
  font-size: 11px;
}

.player-pill.is-self {
  background: var(--kg-blue);
  border-color: var(--kg-blue);
  color: #fff;
}

.player-pill.is-off {
  opacity: 0.55;
  border-style: dashed;
}

.player-pill__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-pill__icons {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.pl-icon {
  height: 16px;
  width: auto;
  display: block;
}
.pl-icon--shield {
  height: 12px;
}

/* Fallback for icons Luisa didn't ship a light variant of (clock/check):
   whiten the dark icon so it stays legible on the blue self row. */
.pl-icon--wash {
  filter: brightness(0) invert(1);
}

.player-empty {
  font-style: italic;
  color: var(--kg-muted);
  padding: 8px 18px;
}

</style>

<script>
// New design icons (PNG). Light variants are used on the blue "self" row;
// icons without a light variant fall back to a CSS whitening filter.
const ICONS = {
  shield: require('../assets/icons/shield.png'),
  'shield-light': require('../assets/icons/shield-light.png'),
  pencil: require('../assets/icons/pencil.png'),
  'pencil-light': require('../assets/icons/pencil-light.png'),
  clock: require('../assets/icons/clock.png'),
  check: require('../assets/icons/check.png'),
};

export default {
  props: [
    'players', 'admin',
    'lobbyState', 'gameState',
  ],
  methods: {
    tryEndGame() {
      clearTimeout(this.confirmTimeout);
      if(this.confirmEndGame) {
        this.confirmEndGame = false;
        this.$socket.emit('game:end');
      } else {
        this.confirmEndGame = true;
        this.confirmTimeout = setTimeout(() => this.confirmEndGame = false, 1000);
      }
    },
    // Pick the icon file for a player's row: the light variant on the viewer's
    // own (blue) row when one exists, the dark one otherwise.
    iconFor(name, p) {
      const self = this.$root.playerId === p.id;
      return (self && ICONS[name + '-light']) || ICONS[name];
    },
    // True when this icon is shown dark on the blue row and must be whitened.
    washed(name, p) {
      return this.$root.playerId === p.id && !ICONS[name + '-light'];
    },
  },
  computed: {
    // True when the viewer already holds a connected player slot — they should
    // never see the "Join" button on someone else's disconnected slot.
    isActivePlayer() {
      return this.players.some(p => p.id === this.$root.playerId && p.connected);
    },
    // Put the viewer's own row first so they can find themselves at a glance;
    // everyone else keeps the server's order. Sorts a copy — `players` is a
    // prop and must not be mutated.
    sortedPlayers() {
      const self = this.$root.playerId;
      return [...this.players].sort((a, b) => (b.id === self) - (a.id === self));
    },
  },
  data() {
    return {
      confirmTimeout: undefined,
      confirmEndGame: false,
    };
  },
};
</script>

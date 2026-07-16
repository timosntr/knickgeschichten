<template>
  <div class="player-list-widget">
    <sui-divider horizontal >
      Schreibraum<span
        v-if="lobbyState === 'PLAYING' && $route.params.code"
        class="lobby-code-inline">{{ $route.params.code.toUpperCase() }}</span>
    </sui-divider>
    <sui-table unstackable basic class="player-table" >
      <sui-table-header>
        <sui-table-row>
          <th style="position: relative;">
            Autor*innen
          </th>
        </sui-table-row>
      </sui-table-header>
      <sui-table-body>
        <sui-table-row v-for="p in sortedPlayers"
          :key="p.playerId"
          :negative="!p.connected"
          :positive="$root.playerId === p.id">
          <td>
            {{p.name}}
            <span class="user-icons">
              <sui-button v-if="!p.connected && !isActivePlayer"
                size="tiny"
                @click="$socket.emit('lobby:replace', p.playerId)"
                               basic>
                beitreten
              </sui-button>
               <sui-icon
                v-if="admin === p.id"
                color="grey"
                name="shield"/>
              <sui-icon
                v-if="gameState.icons[p.playerId]"
                color="grey"
                :name="gameState.icons[p.playerId]"/>
              <sui-icon
                v-if="!p.connected"
                color="grey"
                name="times"/>
            </span>
          </td>
        </sui-table-row>
        <sui-table-row v-if="!players.length">
          <td>
            <i>keine Autor*innen da</i>
          </td>
        </sui-table-row>
      </sui-table-body>
    </sui-table>
    <div>
      <sui-button :basic="!confirmEndGame"
               color="red"
        @click="tryEndGame"
        v-if="$root.playerId === admin && lobbyState === 'PLAYING' && !gameState.reading">
        {{confirmEndGame ? 'bist du sicher?' : 'Geschichten beenden'}}
      </sui-button>
    </div>
  </div>
</template>

<style>

.lobby-code-inline {
  margin-left: 8px;
  font-family: monospace;
  font-size: 0.85em;
  font-weight: normal;
  letter-spacing: 1px;
  opacity: 0.55;
}

td {
  position: relative;
}

.user-icons {
  position: absolute;
  right: .5em;
  top: 0;
  height: 100%;
  align-items: center;
  display: flex;
}

.user-icons button:not(:last-child) {
  margin-right: 8px !important;
}

.user-icons i {
  height: 18px;
}

</style>

<script>
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
</script>fd
<template>
  <ooc-page>
    <ooc-menu
      title="Knickgeschichten"
      subtitle="Collaborative stories, one line at a time">
      <div>
        <div v-if="quote" class="qotd" @click="$router.push(`/lobby/${quote.code}`)">
          <div class="qotd-label">Satz des Tages</div>
          <div class="qotd-text">„{{ quote.text }}"</div>
        </div>
        <sui-divider horizontal>
          Stories
        </sui-divider>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <sui-button
            color="green"
            :loading="!connected"
            @click="showCreateAsync = true"
            fluid>
            Start Async Story
          </sui-button>
          <sui-button
            color="teal"
            :loading="!connected"
            is="router-link"
            to="/sessions"
            fluid>
            Browse Public Sessions
          </sui-button>
        </div>
        <sui-divider horizontal>
          Private Game
        </sui-divider>
        <sui-button-group>
          <sui-button
            color="blue"
            :loading="!connected || creatingLobby"
            @click="createLobby">
            Create
          </sui-button>
          <sui-button-or/>
          <sui-button
            color="blue"
            @click="showJoinLobby = true"
            :loading="!connected || showJoinLobby">
            Join by Code
          </sui-button>
        </sui-button-group>
      </div>
    </ooc-menu>
    <ooc-join-lobby :active="showJoinLobby" @close="showJoinLobby = false">
    </ooc-join-lobby>
    <ooc-create-async :active="showCreateAsync" @close="showCreateAsync = false">
    </ooc-create-async>
    <ooc-util></ooc-util>
  </ooc-page>
</template>

<style>
.qotd {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-left: 3px solid #21ba45;
  background: rgba(33, 186, 69, 0.06);
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}
.qotd:hover {
  background: rgba(33, 186, 69, 0.13);
}
.qotd-label {
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #21ba45;
  margin-bottom: 4px;
  font-weight: 600;
}
.qotd-text {
  font-family: 'Lora', serif;
  font-style: italic;
  font-size: 0.97em;
  color: #333;
  line-height: 1.5;
}
</style>

<script>
export default {
  sockets: {
    connect() {
      this.connected = true;
    },
    disconnect() {
      this.connected = false;
    },
  },
  methods: {
    createLobby() {
      this.creatingLobby = true;
      this.$socket.emit('lobby:create');
    },
    async fetchQuote() {
      try {
        const res = await fetch('/api/v1/quote');
        if (res.ok) {
          this.quote = await res.json();
        }
      } catch {}
    },
  },
  created() {
    this.$socket.emit('lobby:leave');
    this.fetchQuote();
  },
  data() {
    return {
      connected: this.$root.connected,
      creatingLobby: false,
      showJoinLobby: false,
      showCreateAsync: false,
      quote: null,
    };
  },
};
</script>

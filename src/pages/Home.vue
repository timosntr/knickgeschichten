<template>
  <ooc-page>
    <ooc-menu
      title="Knickgeschichten"
      subtitle="Collaborative stories, one line at a time">
      <div>
        <sui-divider horizontal :inverted="darkMode">
          Stories
        </sui-divider>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <sui-button
            color="green"
            :inverted="darkMode"
            :loading="!connected"
            @click="showCreateAsync = true"
            fluid>
            Start Async Story
          </sui-button>
          <sui-button
            color="teal"
            :inverted="darkMode"
            :loading="!connected"
            is="router-link"
            to="/sessions"
            fluid>
            Browse Public Sessions
          </sui-button>
        </div>
        <sui-divider horizontal :inverted="darkMode">
          Private Game
        </sui-divider>
        <sui-button-group>
          <sui-button
            color="blue"
            :inverted="darkMode"
            :loading="!connected || creatingLobby"
            @click="createLobby">
            Create
          </sui-button>
          <sui-button-or/>
          <sui-button
            color="blue"
            :inverted="darkMode"
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
    update() { this.$forceUpdate(); },
    createLobby() {
      this.creatingLobby = true;
      this.$socket.emit('lobby:create');
    },
  },
  beforeDestroy() {
    this.bus.$off('toggle-dark-mode', this.update);
  },
  created() {
    this.bus.$on('toggle-dark-mode', this.update);
    this.$socket.emit('lobby:leave');
  },
  data() {
    return {
      connected: this.$root.connected,
      creatingLobby: false,
      showJoinLobby: false,
      showCreateAsync: false,
    };
  },
};
</script>

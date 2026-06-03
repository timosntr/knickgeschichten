<template>
  <ooc-page>
    <ooc-menu
      title="Knickgeschichten"
      subtitle="Collaborative stories, one line at a time">
      <div>
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
  },
  created() {
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

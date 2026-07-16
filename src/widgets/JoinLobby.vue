<template>
  <sui-dimmer :active="active" style="position: fixed">
    <sui-form
           @submit="testLobby"
      :error="lobbyError"
      :loading="testingLobby">
      <sui-card>
        <sui-card-content>
          <sui-card-header>
            Raum beitreten
          </sui-card-header>
        </sui-card-content>
        <sui-card-content>
          <sui-form-field
            :error="lobbyError">
            <label>Code</label>
            <input name="lobbyCode"
              required
              @input="lobbyError = false"
              :type="hideLobbyCode ? 'password' : 'text'"
              autocomplete="off"
              placeholder="1c1b">
          </sui-form-field>
          <sui-button
            color="blue"
                       type="submit">
            beitreten
          </sui-button>
          <sui-button
                       type="button"
            @click="$emit('close')">
            zurück
          </sui-button>
        </sui-card-content>
      </sui-card>
      <sui-message
        error
        header="ungültiger Code"
        content="Der Code ist falsch oder der Raum existiert nicht mehr"/>
    </sui-form>
  </sui-dimmer>
</template>

<script>
module.exports = {
  props: ['active'],
  data() {
    return {
      testingLobby: false,
      lobbyError: false,
    }
  },
  sockets: {
    'lobby:join': function(code) {
      this.$emit('close');
      this.$router.push(`/lobby/${code}`);
    },
    disconnect: function() {
      this.$emit('close');
    }
  },
  methods: {
    update() { this.$forceUpdate(); },  // still used for toggle-hide-lobby
    testLobby(event) {
      event.preventDefault();
      const form = event.target;
      const code = form.lobbyCode.value.replace(/\W/g, '');

      this.testingLobby = true;

      // Determine if the lobby exists
      fetch(`/api/v1/lobby/${code}`)
        .then(resp => {
          this.testingLobby = false;

          if(resp.status === 200) {
            console.log('lobby exists');
            this.$emit('close');
            this.$socket.emit('lobby:join', code);
            this.$router.push(`/lobby/${code}`);
          } else {
            this.lobbyError = true;
          }
        })
        .catch(() => {
          this.testingLobby = false;
          this.lobbyError = true;
        });
    },
  },
  created() {
    this.bus.$on('toggle-hide-lobby', this.update);
  },
  beforeDestroy() {
    this.bus.$off('toggle-hide-lobby', this.update);
  }
};
</script>
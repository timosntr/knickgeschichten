<template>
  <sui-dimmer :active="active" class="code-dimmer" style="position: fixed">
    <sui-form
           @submit="testLobby"
      :error="lobbyError"
      :loading="testingLobby"
      class="code-form">
      <h1 class="code-title">Raum beitreten</h1>
      <sui-form-field :error="lobbyError">
        <input class="code-input"
          name="lobbyCode"
          required
          @input="lobbyError = false"
          :type="hideLobbyCode ? 'password' : 'text'"
          autocomplete="off"
          placeholder="1c1b">
      </sui-form-field>
      <div v-if="lobbyError" class="code-error">
        Der Code ist falsch oder der Raum existiert nicht mehr
      </div>
      <div class="code-buttons">
        <!-- shared compact pill (.write-btn is a global class, see Story.vue) -->
        <button type="button" class="write-btn write-btn--outline" @click="$emit('close')">
          zurück
        </button>
        <button type="submit" class="write-btn write-btn--solid">
          beitreten
        </button>
      </div>
    </sui-form>
  </sui-dimmer>
</template>

<style>
.code-dimmer.ui.dimmer {
  background: var(--kg-cream);
  /* Sit below the sticky torn-paper header (z-index 100 in Page.vue) so it
     stays visible, and top-align the content like the XD instead of Semantic's
     default vertical centring. Force a column layout so justify-content
     top-aligns and padding-top places the title where the artboard has it. */
  z-index: 90;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 150px;
}
.code-form {
  width: 100%;
  max-width: 313px;   /* input is 313 in the XD */
  margin: 0 auto;
  text-align: center;
}
.code-title {
  font-family: var(--font-serif);
  font-weight: 900;
  font-size: 33px;
  color: var(--kg-green);
  margin: 0 0 22px;
}
.ui.form input.code-input {
  width: 100%;
  height: 33px;
  box-sizing: border-box;
  border: 1.5px solid var(--kg-green);
  border-radius: 17px;
  background: #fff;              /* XD fill is #FFFFFF */
  padding: 0 20px;
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--kg-green);
  text-align: left;
}
/* Kill Semantic's blue focus glow; keep the green outline. */
.ui.form input.code-input:focus {
  border-color: var(--kg-green);
  box-shadow: 0 0 0 2px rgba(25, 66, 30, 0.12);
  outline: none;
}
.ui.form input.code-input::placeholder {
  font-style: italic;
  font-size: 11px;
  color: var(--kg-muted);
}
.code-error {
  margin-top: 8px;
  font-size: 11px;
  font-style: italic;
  color: #db2828;
}
.code-buttons {
  display: flex;
  gap: 14px;
  justify-content: center;
  margin-top: 18px;
}
/* Fixed 112px each (XD) so the two-button row is narrower than the 313 input. */
.code-buttons .write-btn {
  margin: 0;
  width: 112px;
  min-width: 0;
  padding: 0;
}
</style>

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
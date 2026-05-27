<template>
  <sui-modal :open="active" @close="$emit('close')" size="small">
    <sui-modal-header>Start Async Story</sui-modal-header>
    <sui-modal-content>
      <sui-form :inverted="darkMode" @submit.prevent="submit" :loading="creating">

        <sui-form-field>
          <label>Turn Time Limit</label>
          <sui-dropdown
            v-model="config.timeLimit"
            :options="timeLimitOptions"
            selection/>
        </sui-form-field>

        <sui-form-field>
          <sui-checkbox v-model="anonymousChecked" label="Anonymous (hide author names)"/>
        </sui-form-field>
      </sui-form>
    </sui-modal-content>
    <sui-modal-actions>
      <sui-button @click="$emit('close')" :inverted="darkMode">Cancel</sui-button>
      <sui-button color="green" :inverted="darkMode" @click="submit" :loading="creating">
        Start Session
      </sui-button>
    </sui-modal-actions>
  </sui-modal>
</template>

<script>
export default {
  props: {
    active: Boolean,
  },
  data() {
    return {
      creating: false,
      config: {
        timeLimit: 'none',
      },
      anonymousChecked: false,
      timeLimitOptions: [
        { text: 'None', value: 'none' },
        { text: '30 sec', value: 'sec30' },
        { text: '1 min', value: 'min1' },
        { text: '2 min', value: 'min2' },
        { text: '5 min', value: 'min5' },
      ],
    };
  },
  sockets: {
    'lobby:join': function(code) {
      this.creating = false;
      this.$emit('close');
    },
  },
  methods: {
    update() { this.$forceUpdate(); },
    submit() {
      this.creating = true;
      this.$socket.emit('lobby:create:async', {
        config: {
          timeLimit: this.config.timeLimit,
          anonymous: this.anonymousChecked ? 'true' : 'false',
        },
      });
    },
  },
  beforeDestroy() {
    this.bus.$off('toggle-dark-mode', this.update);
  },
  created() {
    this.bus.$on('toggle-dark-mode', this.update);
  },
};
</script>

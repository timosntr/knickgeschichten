<template>
  <sui-modal :open="active" @close="$emit('close')" size="small">
    <sui-modal-header>Start Async Story</sui-modal-header>
    <sui-modal-content>
      <p :style="{color: '#555', fontSize: '0.9em', margin: 0}">
        Eine öffentliche Knickgeschichte wird erstellt. Du kannst deinen Namen beim Beitreten wählen oder anonym bleiben.
      </p>
    </sui-modal-content>
    <sui-modal-actions>
      <sui-button @click="$emit('close')">Abbrechen</sui-button>
      <sui-button color="green" @click="submit" :loading="creating">
        Story starten
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
    };
  },
  sockets: {
    'lobby:join': function(code) {
      this.creating = false;
      this.$emit('close');
    },
  },
  methods: {
    submit() {
      this.creating = true;
      this.$socket.emit('lobby:create:async', {});
    },
  },
};
</script>

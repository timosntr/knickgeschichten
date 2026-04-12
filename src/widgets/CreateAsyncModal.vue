<template>
  <sui-modal :open="active" @close="$emit('close')" size="small">
    <sui-modal-header>Start Async Story</sui-modal-header>
    <sui-modal-content>
      <sui-form :inverted="darkMode" @submit.prevent="submit" :loading="creating">
        <sui-form-field :error="titleError">
          <label>Session Title</label>
          <input
            v-model="title"
            placeholder="e.g. The Great Adventure"
            maxlength="60"
            @input="titleError = false"
            required/>
          <div v-if="titleError" class="ui pointing red basic label">
            Title is required
          </div>
        </sui-form-field>

        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <sui-form-field style="flex: 1; min-width: 100px;">
            <label>Stories</label>
            <input type="number" v-model.number="config.numStories" min="1" max="10"/>
          </sui-form-field>
          <sui-form-field style="flex: 1; min-width: 100px;">
            <label>Lines per Story</label>
            <input type="number" v-model.number="config.numLinks" min="3" max="50"/>
          </sui-form-field>
        </div>

        <sui-form-field>
          <label>Context Lines Shown</label>
          <sui-dropdown
            v-model="config.contextLen"
            :options="contextOptions"
            selection/>
        </sui-form-field>

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
      title: '',
      titleError: false,
      creating: false,
      config: {
        numStories: 3,
        numLinks: 10,
        contextLen: 'regular',
        timeLimit: 'none',
      },
      anonymousChecked: false,
      contextOptions: [
        { text: '1 Line', value: 'regular' },
        { text: '2 Lines', value: 'two' },
        { text: '3 Lines', value: 'three' },
        { text: '4 Lines', value: 'four' },
      ],
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
      const trimmedTitle = this.title.trim();
      if (!trimmedTitle) {
        this.titleError = true;
        return;
      }
      this.creating = true;
      this.$socket.emit('lobby:create:async', {
        title: trimmedTitle,
        config: {
          numStories: this.config.numStories,
          numLinks: this.config.numLinks,
          contextLen: this.config.contextLen,
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

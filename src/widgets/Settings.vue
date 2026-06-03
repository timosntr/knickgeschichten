<template>
  <div class="settings">
    <sui-accordion styled>
      <sui-accordion-title>
        <sui-icon name="dropdown"/>User Preferences
      </sui-accordion-title>
      <sui-accordion-content>
        <sui-form @submit="event => event.preventDefault()">
          <sui-form-field>
            <label>Turn Notification Sound</label>
            <div style="display: flex;">
              <sui-dropdown
                placeholder="Select a Sound"
                :options="sounds"
                v-model="turnSound"
                @input="handleTurnSound"
                style="flex: 1; margin-right: 8px;"
                selection>
              </sui-dropdown>
              <sui-button
                icon="play circle"
                basic
                style="margin-right: 0;"
                :disabled="!turnSound"
                @click="playTurnSound()">
              </sui-button>
            </div>
          </sui-form-field>
        </sui-form>
      </sui-accordion-content>
    </sui-accordion>
  </div>
</template>

<style scoped>

.settings {
  margin: 14px auto;
  max-width: 290px;
  padding-bottom: 28px;
}

</style>

<script>
export default {
  data() {
    return {
      sounds: [
        {value: '', text: 'Disabled'},
        {value: 'bit', text: 'Bit'},
        {value: 'chime', text: 'Chime'},
        {value: 'chord', text: 'Chord'},
        {value: 'ding', text: 'Ding'},
        {value: 'retro', text: 'Retro'},
      ],
      turnSound: localStorage.oocTurnSound || '',
    };
  },
  methods: {
    handleTurnSound(sound) {
      this.setTurnSound(sound);
    },
  },
};
</script>

<template>
  <div class="settings" :class="{minimal: minimal}">
    <div v-if="minimal" class="minimal-dark-mode">
      <sui-checkbox
        :label="isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode'"
        @input="handleDarkMode"
        v-model="isDarkMode"/>
    </div>
    <sui-accordion v-else styled :inverted="isDarkMode">
      <sui-accordion-title>
        <sui-icon name="dropdown"/>User Preferences
      </sui-accordion-title>
      <sui-accordion-content>
        <sui-form @submit="event => event.preventDefault()" :inverted="isDarkMode">
          <sui-form-field>
            <label>Dark Mode</label>
            <sui-checkbox label="Enabled" @input="handleDarkMode" v-model="isDarkMode" />
          </sui-form-field>
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
                @click="playTurnSound()"
                :inverted="isDarkMode">
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

.settings.minimal {
  padding-bottom: 16px;
}

.minimal-dark-mode {
  text-align: center;
  opacity: 0.5;
  font-size: 0.85em;
}

.minimal-dark-mode:hover {
  opacity: 1;
}

</style>

<script>
import gameInfo from '../../gameInfo';

export default {
  props: {
    minimal: {
      type: Boolean,
      default: false,
    },
  },
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
      isDarkMode: this.darkMode,
      gameInfo: Object.entries(gameInfo)
        .filter((key, val) => !val.hidden),
      showMore: {},
    };
  },
  methods: {
    handleDarkMode(event) {
      this.setDarkMode(event.target.checked);
    },
    handleTurnSound(sound) {
      this.setTurnSound(sound);
    },
  },
};
</script>

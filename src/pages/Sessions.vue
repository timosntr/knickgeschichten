<template>
  <ooc-page>
    <ooc-menu title="Public Stories" subtitle="Join a story in progress">
      <div>
        <div v-if="loading" style="text-align: center; padding: 24px">
          <sui-loader active inline centered :inverted="darkMode">Loading sessions...</sui-loader>
        </div>
        <div v-else>
          <div v-if="activeSessions.length === 0 && completedSessions.length === 0"
            style="text-align: center; padding: 24px; color: #888;">
            No public sessions yet.
            <br>
            <router-link to="/">Start one!</router-link>
          </div>

          <template v-if="activeSessions.length > 0">
            <sui-divider horizontal :inverted="darkMode">Active</sui-divider>
            <div v-for="session in activeSessions" :key="session.code" class="session-card">
              <div class="session-title">{{ session.title }}</div>
              <div class="session-meta">
                {{ session.numStories }} {{ session.numStories === 1 ? 'story' : 'stories' }},
                {{ session.numLinks }} lines each
                <span v-if="session.playersOnline > 0" style="margin-left: 8px">
                  · {{ session.playersOnline }} online
                </span>
              </div>
              <sui-progress
                :percent="Math.round(session.progress * 100)"
                :inverted="darkMode"
                indicating
                size="small"
                style="margin: 6px 0"/>
              <div class="session-footer">
                <span class="session-age">{{ timeAgo(session.createdAt) }}</span>
                <sui-button
                  size="tiny"
                  color="green"
                  :inverted="darkMode"
                  @click="joinSession(session.code)">
                  Join &amp; Write
                </sui-button>
              </div>
            </div>
          </template>

          <template v-if="completedSessions.length > 0">
            <sui-divider horizontal :inverted="darkMode">Completed</sui-divider>
            <div v-for="session in completedSessions" :key="session.code" class="session-card session-complete">
              <div class="session-title">
                <sui-icon name="check circle" color="green"/> {{ session.title }}
              </div>
              <div class="session-meta">
                {{ session.numStories }} {{ session.numStories === 1 ? 'story' : 'stories' }},
                {{ session.numLinks }} lines each
              </div>
              <div class="session-footer">
                <span class="session-age">{{ timeAgo(session.createdAt) }}</span>
                <sui-button
                  size="tiny"
                  color="teal"
                  :inverted="darkMode"
                  @click="joinSession(session.code)">
                  Read
                </sui-button>
              </div>
            </div>
          </template>
        </div>

        <div style="margin-top: 16px; text-align: center">
          <router-link is="sui-button" to="/" :inverted="darkMode" size="small" basic>
            Back
          </router-link>
        </div>
      </div>
    </ooc-menu>
    <ooc-util></ooc-util>
  </ooc-page>
</template>

<style>
.session-card {
  border: 1px solid rgba(34, 36, 38, 0.15);
  border-radius: 4px;
  padding: 12px 14px;
  margin-bottom: 10px;
  text-align: left;
}

.dark-theme .session-card {
  border-color: rgba(255, 255, 255, 0.15);
}

.session-title {
  font-weight: bold;
  font-size: 1.05em;
  margin-bottom: 2px;
}

.session-meta {
  font-size: 0.88em;
  color: #888;
  margin-bottom: 4px;
}

.session-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
}

.session-age {
  font-size: 0.82em;
  color: #aaa;
}

.session-complete {
  opacity: 0.85;
}
</style>

<script>
export default {
  data() {
    return {
      sessions: [],
      loading: true,
      refreshInterval: null,
    };
  },
  computed: {
    activeSessions() {
      return this.sessions.filter(s => !s.isComplete);
    },
    completedSessions() {
      return this.sessions.filter(s => s.isComplete);
    },
  },
  methods: {
    update() { this.$forceUpdate(); },
    async fetchSessions() {
      try {
        const res = await fetch('/api/v1/lobbies');
        if (res.ok) {
          this.sessions = await res.json();
        }
      } catch {}
      this.loading = false;
    },
    joinSession(code) {
      this.$router.push(`/lobby/${code}`);
    },
    timeAgo(ts) {
      const diff = Date.now() - ts;
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    },
  },
  beforeDestroy() {
    this.bus.$off('toggle-dark-mode', this.update);
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  },
  created() {
    this.bus.$on('toggle-dark-mode', this.update);
    this.fetchSessions();
    this.refreshInterval = setInterval(this.fetchSessions, 30000);
  },
};
</script>

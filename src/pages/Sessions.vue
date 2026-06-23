<template>
  <ooc-page>
    <ooc-menu title="Offene Storys" subtitle="Mach mit beim Schreiben">
      <div>
        <div v-if="loading" style="text-align: center; padding: 24px">
          <sui-loader active inline centered>Laden...</sui-loader>
        </div>
        <div v-else>
          <div v-if="activeSessions.length === 0"
            style="text-align: center; padding: 24px; color: #888;">
            Keine offenen Storys vorhanden.
            <br>
            <router-link to="/">Neue starten!</router-link>
          </div>

          <div v-for="session in pagedSessions" :key="session.code" class="session-card">
            <div class="session-title">{{ session.title }}</div>
            <div v-if="session.teaser" class="session-teaser">„{{ session.teaser }}"</div>
            <div class="session-meta">
              <span v-if="session.playersOnline > 0">{{ session.playersOnline }} online</span>
            </div>
            <div class="session-footer">
              <span class="session-age">{{ timeAgo(session.createdAt) }}</span>
              <sui-button size="tiny" color="green" @click="joinSession(session.code)">
                Mitmachen
              </sui-button>
            </div>
          </div>
        </div>

        <div v-if="totalPages > 1" class="pagination">
          <sui-button icon size="small" :disabled="page === 1" @click="page--">
            <sui-icon name="chevron left"/>
          </sui-button>
          <span class="page-info">{{ page }} / {{ totalPages }}</span>
          <sui-button icon size="small" :disabled="page === totalPages" @click="page++">
            <sui-icon name="chevron right"/>
          </sui-button>
        </div>

        <div style="margin-top: 16px; text-align: center">
          <router-link is="sui-button" to="/" size="small" basic>
            Zurück
          </router-link>
        </div>
      </div>
    </ooc-menu>
    <ooc-util></ooc-util>
  </ooc-page>
</template>

<style>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 12px;
}
.page-info {
  font-size: 0.9em;
  color: #888;
}

.session-card {
  border: 1px solid rgba(34, 36, 38, 0.15);
  border-radius: 4px;
  padding: 12px 14px;
  margin-bottom: 10px;
  text-align: left;
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

.session-teaser {
  font-family: 'Lora', serif;
  font-style: italic;
  font-size: 0.92em;
  color: #444;
  margin: 4px 0;
}
</style>

<script>
export default {
  data() {
    return {
      sessions: [],
      loading: true,
      refreshInterval: null,
      page: 1,
      perPage: 15,
    };
  },
  computed: {
    activeSessions() {
      return this.sessions.filter(s => !s.isComplete);
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.activeSessions.length / this.perPage));
    },
    pagedSessions() {
      const start = (this.page - 1) * this.perPage;
      return this.activeSessions.slice(start, start + this.perPage);
    },
  },
  watch: {
    activeSessions() {
      if (this.page > this.totalPages) this.page = this.totalPages;
    },
  },
  methods: {
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
      if (mins < 1) return 'gerade eben';
      if (mins < 60) return `vor ${mins} Min.`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `vor ${hrs} Std.`;
      const days = Math.floor(hrs / 24);
      return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
    },
  },
  beforeDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  },
  created() {
    this.$socket.emit('lobby:leave');
    this.fetchSessions();
    this.refreshInterval = setInterval(this.fetchSessions, 30000);
  },
};
</script>

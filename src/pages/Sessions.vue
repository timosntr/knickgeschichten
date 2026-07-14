<template>
  <ooc-page>
    <ooc-menu title="angefangene Geschichten" subtitle="schreib mit">
      <div>
        <div class="accordion">
          <button class="accordion-toggle" @click="showSort = !showSort">
            <span>Sortieren nach <span class="sort-active-label">· {{ currentSortLabel }}</span></span>
            <span class="accordion-icon">{{ showSort ? '▲' : '▼' }}</span>
          </button>
          <div v-if="showSort" class="accordion-body sort-options">
            <button
              v-for="opt in sortOptions" :key="opt.value"
              class="sort-btn"
              :class="{ active: sortBy === opt.value }"
              @click="setSort(opt.value)">
              {{ opt.label }}
              <span v-if="sortBy === opt.value">{{ sortDesc ? '↓' : '↑' }}</span>
            </button>
          </div>
        </div>

        <div v-if="loading" style="text-align: center; padding: 24px">
          <sui-loader active inline centered>lädt</sui-loader>
        </div>
        <div v-else>
          <div v-if="activeSessions.length === 0"
            style="text-align: center; padding: 24px; color: #888;">
            keine angefangenen Geschichten vorhanden
            <br>
            <router-link to="/">neue Geschichte starten</router-link>
          </div>

          <div v-for="session in pagedSessions" :key="session.code" class="session-card">
            <div class="session-title">
              {{ session.title }}
              <span v-if="storyNumber(session.title)" class="session-number">#{{ storyNumber(session.title) }}</span>
            </div>
            <div v-if="session.teaser" class="session-teaser">„{{ session.teaser }}"</div>
            <div class="session-meta">
              <span v-if="session.playersOnline > 0">{{ session.playersOnline }} online</span>
            </div>
            <div class="kg-progress session-progress">
              <div class="kg-progress__fill" :style="{ width: Math.round((session.progress || 0) * 100) + '%' }"></div>
            </div>
            <div class="session-footer">
              <span class="session-age">{{ timeAgo(session.lastActivity) }}</span>
              <sui-button size="tiny" color="green" @click="joinSession(session.code)">
                mitschreiben
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
.session-number {
  font-weight: normal;
  font-size: 0.78em;
  color: #aaa;
  margin-left: 5px;
}

.session-meta {
  font-size: 0.88em;
  color: #888;
  margin-bottom: 4px;
}

.kg-progress.session-progress {
  margin: 10px 0 0;
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

.accordion {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 12px;
  overflow: hidden;
}
.accordion-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.88em;
  color: #555;
  text-align: left;
}
.accordion-toggle:hover { background: #fafafa; }
.accordion-icon { font-size: 0.75em; color: #aaa; }
.accordion-body.sort-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px 10px;
  border-top: 1px solid #f0f0f0;
}
.sort-active-label { color: #21ba45; font-size: 0.92em; }
.sort-btn {
  padding: 3px 10px;
  font-size: 0.82em;
  border: 1px solid #ddd;
  border-radius: 12px;
  background: none;
  cursor: pointer;
  color: #666;
}
.sort-btn.active {
  border-color: #21ba45;
  color: #21ba45;
  background: rgba(33,186,69,0.06);
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
      showSort: false,
      sortBy: 'lastActivity',
      sortDesc: true,
      sortOptions: [
        { value: 'lastActivity', label: 'zuletzt' },
        { value: 'number',       label: '#' },
      ],
    };
  },
  computed: {
    activeSessions() {
      return this.sessions.filter(s => !s.isComplete);
    },
    currentSortLabel() {
      const opt = this.sortOptions.find(o => o.value === this.sortBy);
      return opt ? opt.label : '';
    },
    sortedSessions() {
      const dir = this.sortDesc ? -1 : 1;
      return [...this.activeSessions].sort((a, b) => {
        if (this.sortBy === 'number') {
          const num = t => { const m = /(\d+)\s*$/.exec(t || ''); return m ? Number(m[1]) : 0; };
          return dir * (num(a.title) - num(b.title));
        }
        return dir * ((a.lastActivity || 0) - (b.lastActivity || 0));
      });
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.sortedSessions.length / this.perPage));
    },
    pagedSessions() {
      const start = (this.page - 1) * this.perPage;
      return this.sortedSessions.slice(start, start + this.perPage);
    },
  },
  watch: {
    sortedSessions() {
      if (this.page > this.totalPages) this.page = this.totalPages;
    },
  },
  methods: {
    storyNumber(title) {
      const m = /(\d+)\s*$/.exec(title || '');
      return m ? m[1] : null;
    },
    setSort(value) {
      if (this.sortBy === value) {
        this.sortDesc = !this.sortDesc;
      } else {
        this.sortBy = value;
        this.sortDesc = value !== 'number';
      }
      this.page = 1;
    },
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
    // Relative time since the last contribution
    timeAgo(ts) {
      const diff = Date.now() - (ts || 0);
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Gerade eben';
      if (mins < 60) return `Vor ${mins} Minute${mins !== 1 ? 'n' : ''}`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `Vor ${hrs} Stunde${hrs !== 1 ? 'n' : ''}`;
      const days = Math.floor(hrs / 24);
      return `Vor ${days} Tag${days !== 1 ? 'en' : ''}`;
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

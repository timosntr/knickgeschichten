<template>
  <ooc-page>
    <ooc-menu title="angefangene Geschichten" subtitle="schreib mit">
      <div class="sessions-col">
        <div class="accordion sessions-sort">
          <button class="accordion-toggle" @click="showSort = !showSort">
            <span><span class="sort-icon">⇅</span> {{ currentSortLabel }}</span>
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
        <div v-else class="sessions-list">
          <div v-if="activeSessions.length === 0"
            style="text-align: center; padding: 24px; color: #888;">
            keine angefangenen Geschichten vorhanden
            <br>
            <router-link to="/">neue Geschichte starten</router-link>
          </div>

          <div v-for="session in pagedSessions" :key="session.code" class="session-card">
            <div class="session-head">
              <span class="session-title">{{ session.title }}</span>
              <span v-if="storyNumber(session.title)" class="session-number">#{{ storyNumber(session.title) }}</span>
              <span v-if="session.playersOnline > 0" class="session-online">{{ session.playersOnline }} online</span>
            </div>
            <div v-if="session.teaser" class="session-teaser">{{ session.teaser }}</div>
            <div class="session-progress">
              <div class="session-progress__fill"
                :style="{ width: Math.round((session.progress || 0) * 100) + '%' }"></div>
            </div>
            <div class="session-footer">
              <span class="session-age">{{ timeAgo(session.lastActivity) }}</span>
              <button class="write-btn write-btn--solid session-join"
                @click="joinSession(session.code)">
                mitschreiben
              </button>
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

/* --- Session cards (XD artboard 7e09c9f6) -----------------------------------
   Card: 310x152 r23, white fill, #19421E 2px border. Title Metropolis Medium
   13px, #number italic 11px muted, teaser Metropolis Light 13px, a 2px
   progress bar (#19421E 25% track + solid fill), age italic 11px + green pill. */
/* Content column: XD cards are 310 wide (centred), so cap the sort control and
   the card list at 310 instead of filling the ~352 menu container. */
.sessions-col {
  width: 310px;
  max-width: 100%;
  margin: 0 auto;
}

/* Scoped under .sessions-list so these beat the global .session-* rules that
   Archive.vue also defines (both pages share the class names). */
.sessions-list .session-card {
  border: 2px solid var(--kg-green);
  border-radius: 23px;
  background: var(--kg-cream);   /* same cream as the page background */
  padding: 18px 20px 16px;
  margin-bottom: 20px;
  text-align: left;
  color: var(--kg-green);
}

.sessions-list .session-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.sessions-list .session-title {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 13px;
  color: var(--kg-green);
}
.sessions-list .session-number {
  font-family: var(--font-sans);
  font-weight: 300;
  font-style: italic;
  font-size: 11px;
  color: var(--kg-muted);
}
.sessions-list .session-online {
  margin-left: auto;
  font-family: var(--font-sans);
  font-weight: 300;
  font-style: italic;
  font-size: 11px;
  color: var(--kg-muted);
}

.sessions-list .session-teaser {
  font-family: var(--font-sans);
  font-weight: 300;
  font-style: normal;
  font-size: 13px;
  line-height: 1.35;
  color: var(--kg-green);
  margin: 8px 0 0;
}

/* 2px rule: 25%-opacity green track with a solid green fill (round caps). */
.sessions-list .session-progress {
  height: 2px;
  border-radius: 2px;
  background: rgba(25, 66, 30, 0.25);
  margin: 18px 0 0;
  overflow: hidden;
}
.sessions-list .session-progress__fill {
  height: 2px;
  border-radius: 2px;
  background: var(--kg-green);
}

.sessions-list .session-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
}
.sessions-list .session-age {
  font-family: var(--font-sans);
  font-weight: 300;
  font-style: italic;
  font-size: 11px;
  color: var(--kg-green);
}
/* Compact green pill sized to "mitschreiben" (.write-btn is global, Story.vue).
   Zero the global button margins so space-between flushes it to the card's
   right padding edge. */
.sessions-list .session-join.write-btn {
  min-width: 0;
  width: auto;
  margin: 0;
  padding: 0 18px;
  height: 26px;
}

/* Sort control: the XD shows a plain italic "⇅ zuletzt" label, no boxed
   accordion. Keep the toggle logic but strip the border/background. Scoped
   under .sessions-sort to beat the global .accordion styles from other pages. */
.sessions-sort.accordion {
  border: none;
  border-radius: 0;
  margin-bottom: 18px;
  overflow: visible;
  text-align: left;
}
.sessions-sort .accordion-toggle {
  width: auto;
  display: inline-flex;
  justify-content: flex-start;
  align-items: center;
  gap: 6px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-sans);
  font-weight: 300;
  font-style: italic;
  font-size: 11px;
  color: var(--kg-green);
  text-align: left;
}
.sessions-sort .accordion-toggle:hover { background: none; }
.sessions-sort .accordion-icon {
  font-size: 0.7em;
  font-style: normal;
  color: var(--kg-green);
}
.sessions-sort .sort-icon {
  color: var(--kg-green);
  font-style: normal;
  font-size: 1.15em;
  margin-right: 2px;
}
.sessions-sort .accordion-body.sort-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 0 2px;
  border-top: none;
}
.sessions-sort .sort-btn {
  padding: 3px 12px;
  font-family: var(--font-sans);
  font-size: 11px;
  border: 1.5px solid var(--kg-green);
  border-radius: var(--kg-radius-pill);
  background: none;
  cursor: pointer;
  color: var(--kg-green);
}
.sessions-sort .sort-btn.active {
  color: var(--kg-cream);
  background: var(--kg-green);
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
      if (mins < 1) return 'gerade eben';
      if (mins < 60) return `vor ${mins} Minute${mins !== 1 ? 'n' : ''}`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `vor ${hrs} Stunde${hrs !== 1 ? 'n' : ''}`;
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

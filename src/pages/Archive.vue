<template>
  <ooc-page>
    <ooc-menu title="Archiv" subtitle="Fertige Geschichten lesen">
      <div>
        <form class="search-form" @submit.prevent="submitSearch">
          <input
            v-model="searchQuery"
            class="search-input"
            type="text"
            placeholder="Titel, Autor …"
            @input="onSearchInput"
          />
          <button type="submit" class="search-btn" :disabled="searching">
            {{ searching ? '…' : 'Suchen' }}
          </button>
          <button v-if="hasSearch" type="button" class="search-clear" @click="clearSearch">✕</button>
        </form>
        <div v-if="fulltextSearched && !searching" class="search-hint">
          {{ filteredSessions.length }} {{ filteredSessions.length === 1 ? 'Ergebnis' : 'Ergebnisse' }} für „{{ lastQuery }}"
        </div>

        <div v-if="loading" style="text-align: center; padding: 24px">
          <sui-loader active inline centered>Laden...</sui-loader>
        </div>
        <div v-else>
          <div v-if="filteredSessions.length === 0"
            style="text-align: center; padding: 24px; color: #888;">
            {{ hasSearch ? 'Keine Ergebnisse gefunden.' : 'Noch keine fertigen Storys.' }}
          </div>

          <div v-for="session in pagedSessions" :key="session.code" class="session-card">
            <div class="session-title">
              <sui-icon name="check circle" color="green"/> {{ session.title }}
            </div>
            <div v-if="session.teaser" class="session-teaser">„{{ session.teaser }}"</div>
            <div class="session-meta">
              {{ session.numAuthors }} {{ session.numAuthors === 1 ? 'Autor' : 'Autoren' }}
            </div>
            <div class="session-footer">
              <span class="session-age">{{ timeAgo(session.createdAt) }}</span>
              <sui-button size="tiny" color="teal" @click="joinSession(session.code)">
                Lesen
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
.session-teaser {
  font-family: 'Lora', serif;
  font-style: italic;
  font-size: 0.92em;
  color: #444;
  margin: 4px 0;
}

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

.search-form {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}
.search-input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95em;
  outline: none;
}
.search-input:focus {
  border-color: #21ba45;
}
.search-btn {
  padding: 6px 12px;
  background: #21ba45;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}
.search-btn:disabled {
  opacity: 0.6;
  cursor: default;
}
.search-clear {
  padding: 6px 10px;
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  color: #888;
  font-size: 0.9em;
}
.search-hint {
  font-size: 0.82em;
  color: #888;
  margin-bottom: 8px;
}
</style>

<script>
export default {
  data() {
    return {
      sessions: [],
      loading: true,
      page: 1,
      perPage: 15,
      searchQuery: '',
      fulltextCodes: null,
      fulltextSearched: false,
      lastQuery: '',
      searching: false,
    };
  },
  computed: {
    completedSessions() {
      return this.sessions.filter(s => s.isComplete);
    },
    hasSearch() {
      return this.searchQuery.trim() !== '' || this.fulltextSearched;
    },
    filteredSessions() {
      const q = this.searchQuery.toLowerCase().trim();
      let result = this.completedSessions;

      if (this.fulltextCodes !== null) {
        const codeSet = new Set(this.fulltextCodes);
        result = result.filter(s => codeSet.has(s.code));
      } else if (q) {
        result = result.filter(s =>
          s.title.toLowerCase().includes(q) ||
          (s.authorNames || []).some(a => a.toLowerCase().includes(q))
        );
      }

      return result;
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.filteredSessions.length / this.perPage));
    },
    pagedSessions() {
      const start = (this.page - 1) * this.perPage;
      return this.filteredSessions.slice(start, start + this.perPage);
    },
  },
  methods: {
    onSearchInput() {
      this.fulltextCodes = null;
      this.fulltextSearched = false;
      this.page = 1;
    },
    async submitSearch() {
      const q = this.searchQuery.trim();
      if (!q) { this.clearSearch(); return; }
      this.searching = true;
      this.lastQuery = q;
      try {
        const res = await fetch(`/api/v1/lobbies/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const codes = await res.json();
          // union: fulltext matches + title/author matches
          const titleMatches = this.completedSessions
            .filter(s =>
              s.title.toLowerCase().includes(q.toLowerCase()) ||
              (s.authorNames || []).some(a => a.toLowerCase().includes(q.toLowerCase()))
            )
            .map(s => s.code);
          this.fulltextCodes = [...new Set([...codes, ...titleMatches])];
        }
      } catch {}
      this.fulltextSearched = true;
      this.searching = false;
      this.page = 1;
    },
    clearSearch() {
      this.searchQuery = '';
      this.fulltextCodes = null;
      this.fulltextSearched = false;
      this.lastQuery = '';
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
  created() {
    this.$socket.emit('lobby:leave');
    this.fetchSessions();
  },
};
</script>

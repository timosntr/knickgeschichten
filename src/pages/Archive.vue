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
              <span v-if="storyNumber(session.title)" class="session-number">#{{ storyNumber(session.title) }}</span>
            </div>
            <div v-if="session.teaser" class="session-teaser">„{{ session.teaser }}"</div>
            <div class="session-footer">
              <span class="session-meta">
                <span class="session-age">{{ dateSpan(session.createdAt, session.completedAt) }}</span>
                <span v-if="session.totalLikes > 0" class="session-likes">
                  <span class="session-likes__heart">♥</span> {{ session.totalLikes }}
                </span>
              </span>
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
      </div>
    </ooc-menu>
    <ooc-util></ooc-util>
  </ooc-page>
</template>

<style>
.session-number {
  font-weight: normal;
  font-size: 0.78em;
  color: #aaa;
  margin-left: 5px;
}
.session-meta {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
}
.session-likes {
  font-size: 0.82em;
  color: #999;
  white-space: nowrap;
}
.session-likes__heart {
  color: #d66;
}
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
.sort-active-label {
  color: #21ba45;
  font-size: 0.92em;
}
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
      page: 1,
      perPage: 15,
      searchQuery: '',
      fulltextCodes: null,
      fulltextSearched: false,
      lastQuery: '',
      searching: false,
      showSort: false,
      sortBy: 'completedAt',
      sortDesc: true,
      sortOptions: [
        { value: 'completedAt', label: 'Beendet' },
        { value: 'createdAt',   label: 'Erstellt' },
        { value: 'number',      label: 'Nummer' },
        { value: 'title',       label: 'Titel' },
        { value: 'totalLikes',  label: 'Likes' },
      ],
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

      // Sorting
      const dir = this.sortDesc ? -1 : 1;
      result = [...result].sort((a, b) => {
        let av, bv;
        if (this.sortBy === 'number') {
          const num = t => { const m = /(\d+)\s*$/.exec(t || ''); return m ? Number(m[1]) : 0; };
          av = num(a.title); bv = num(b.title);
        } else if (this.sortBy === 'title') {
          av = (a.title || '').toLowerCase(); bv = (b.title || '').toLowerCase();
          return dir * av.localeCompare(bv, 'de');
        } else {
          av = a[this.sortBy] || 0; bv = b[this.sortBy] || 0;
        }
        return dir * (av < bv ? -1 : av > bv ? 1 : 0);
      });

      return result;
    },
    currentSortLabel() {
      const opt = this.sortOptions.find(o => o.value === this.sortBy);
      return opt ? opt.label : '';
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
    storyNumber(title) {
      const m = /(\d+)\s*$/.exec(title || '');
      return m ? m[1] : null;
    },
    setSort(value) {
      if (this.sortBy === value) {
        this.sortDesc = !this.sortDesc;
      } else {
        this.sortBy = value;
        this.sortDesc = value !== 'title';
      }
      this.page = 1;
    },
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
    // Format a timestamp as DD.MM.YYYY
    formatDate(ts) {
      const d = new Date(ts);
      const pad = n => String(n).padStart(2, '0');
      return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
    },
    // Creation span of a completed story: "19.06.2026 – 21.06.2026",
    // collapsed to a single date when start and end fall on the same day
    // or completedAt is missing (old data).
    dateSpan(createdAt, completedAt) {
      if (!completedAt) return this.formatDate(createdAt);
      // Legacy data can lack a real createdAt (falls back to "today") — if it's
      // missing or after completion, just show the reliable completion date.
      if (!createdAt || createdAt > completedAt) return this.formatDate(completedAt);
      const start = this.formatDate(createdAt);
      const end = this.formatDate(completedAt);
      return start === end ? end : `${start} – ${end}`;
    },
  },
  created() {
    this.$socket.emit('lobby:leave');
    this.fetchSessions();
  },
};
</script>

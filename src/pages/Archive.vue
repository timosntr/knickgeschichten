<template>
  <ooc-page>
    <ooc-menu title="Archiv" subtitle="Durchstöbere fertiggestellte Geschichten">
      <div class="archive-col">
        <!-- Toolbar: sort label (left) + compact search pill (right), matching XD -->
        <div class="archive-toolbar">
          <button class="archive-sort__toggle" @click="showSort = !showSort">
            <span class="sort-icon">⇅</span> {{ currentSortLabel }}
            <span class="archive-sort__caret">{{ showSort ? '▲' : '▼' }}</span>
          </button>
          <form class="archive-search" @submit.prevent="submitSearch">
            <input
              v-model="searchQuery"
              class="archive-search__input"
              type="text"
              placeholder="suchen"
              @input="onSearchInput"
            />
            <button v-if="hasSearch" type="button" class="archive-search__clear"
              aria-label="Suche zurücksetzen" @click="clearSearch">✕</button>
            <button type="submit" class="archive-search__go" aria-label="suchen" :disabled="searching">
              <svg viewBox="0 0 14 14" class="archive-search__mag" aria-hidden="true">
                <circle cx="5.6" cy="5.6" r="4.2" fill="none" stroke="currentColor" stroke-width="1"/>
                <line x1="8.7" y1="8.7" x2="12.5" y2="12.5" stroke="currentColor" stroke-width="1"/>
              </svg>
            </button>
          </form>
        </div>
        <div v-if="fulltextSearched && !searching" class="archive-search__hint">
          {{ filteredSessions.length }} {{ filteredSessions.length === 1 ? 'Ergebnis' : 'Ergebnisse' }} für „{{ lastQuery }}"
        </div>

        <div v-if="showSort" class="archive-sort__options">
          <button
            v-for="opt in sortOptions" :key="opt.value"
            class="sort-btn"
            :class="{ active: sortBy === opt.value }"
            @click="setSort(opt.value)">
            {{ opt.label }}
            <span v-if="sortBy === opt.value">{{ sortDesc ? '↓' : '↑' }}</span>
          </button>
        </div>

        <div v-if="loading" style="text-align: center; padding: 24px">
          <sui-loader active inline centered>lädt</sui-loader>
        </div>
        <div v-else class="archive-list">
          <div v-if="filteredSessions.length === 0"
            style="text-align: center; padding: 24px; color: #888;">
            {{ hasSearch ? 'keine Ergebnisse gefunden' : 'noch keine abgeschlossenen Geschichten' }}
          </div>

          <div v-for="session in pagedSessions" :key="session.code" class="archive-card">
            <div class="archive-card__head">
              <span class="archive-card__title">{{ session.title }}</span>
              <span v-if="storyNumber(session.title)" class="archive-card__number">#{{ storyNumber(session.title) }}</span>
            </div>
            <div v-if="session.teaser" class="archive-card__teaser">{{ session.teaser }}</div>
            <div class="archive-card__footer">
              <span class="archive-card__date">{{ dateSpan(session.createdAt, session.completedAt) }}</span>
              <button class="write-btn write-btn--read archive-read"
                @click="joinSession(session.code)">
                lesen
              </button>
            </div>
          </div>
        </div>

        <div v-if="totalPages > 1" class="archive-pager">
          <button class="pg-arrow" :disabled="page === 1"
            aria-label="vorherige Seite" @click="page = Math.max(1, page - 1)">‹</button>
          <template v-for="(p, i) in pageWindow">
            <button v-if="typeof p === 'number'" :key="'p' + i"
              class="pg-num" :class="{ active: p === page }" @click="page = p">{{ p }}</button>
            <span v-else :key="'e' + i" class="pg-ellipsis">…</span>
          </template>
          <button class="pg-arrow" :disabled="page === totalPages"
            aria-label="nächste Seite" @click="page = Math.min(totalPages, page + 1)">›</button>
        </div>
      </div>
    </ooc-menu>
    <ooc-util></ooc-util>
  </ooc-page>
</template>

<style>
/* Content column: XD cards are 310 wide, centred (like Sessions). */
.archive-col {
  width: 310px;
  max-width: 100%;
  margin: 0 auto;
}

/* --- Toolbar: sort label + compact search pill on one row --------------------
   XD: search field 117x22 r13, white fill, #19421E 0.7px border, magnifier at
   the right. Sort label italic 11px green with a ⇅ icon (matches Sessions). */
.archive-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
.archive-sort__toggle {
  display: inline-flex;
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
  white-space: nowrap;
}
.archive-sort__caret {
  font-size: 0.7em;
  font-style: normal;
}
.sort-icon {
  font-style: normal;
  font-size: 1.15em;
  color: var(--kg-green);
}

.archive-search {
  position: relative;
  display: flex;
  align-items: center;
  width: 117px;
}
.archive-search__input {
  width: 100%;
  height: 22px;
  box-sizing: border-box;
  padding: 0 24px 0 12px;
  border: 0.7px solid var(--kg-green);
  border-radius: 13px;
  background: #fff;
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 11px;
  color: var(--kg-green);
  outline: none;
}
.archive-search__input::placeholder {
  color: var(--kg-green);
  opacity: 0.55;
  font-style: italic;
}
.archive-search__go {
  position: absolute;
  right: 7px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--kg-green);
}
.archive-search__go:disabled { opacity: 0.5; cursor: default; }
.archive-search__mag { width: 13px; height: 13px; display: block; }
.archive-search__clear {
  position: absolute;
  right: 22px;
  top: 50%;
  transform: translateY(-50%);
  padding: 0 3px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--kg-green);
  font-size: 11px;
  line-height: 1;
}
.archive-search__hint {
  font-family: var(--font-sans);
  font-weight: 300;
  font-style: italic;
  font-size: 11px;
  color: var(--kg-green);
  margin: -8px 0 14px;
  text-align: left;
}

/* Expanded sort options (drops below the toolbar). Same look as Sessions. */
.archive-sort__options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: -8px 0 16px;
}
.archive-sort__options .sort-btn {
  padding: 3px 12px;
  font-family: var(--font-sans);
  font-size: 11px;
  border: 1.5px solid var(--kg-green);
  border-radius: var(--kg-radius-pill);
  background: none;
  cursor: pointer;
  color: var(--kg-green);
}
.archive-sort__options .sort-btn.active {
  color: var(--kg-cream);
  background: var(--kg-green);
}

/* --- Archive cards (XD artboard 75cfeddb) -----------------------------------
   Card: 310x140 r23, GREEN fill (#19421E) with a matching 2px border. Title
   Metropolis Medium 13px cream, #number italic 11px cream, teaser Metropolis
   Light 13px cream, date span italic 11px cream + a cream "lesen" pill. */
.archive-list .archive-card {
  min-height: 140px;
  box-sizing: border-box;
  border: 2px solid var(--kg-green);
  border-radius: 23px;
  background: var(--kg-green);
  padding: 22px 20px 16px;
  margin-bottom: 30px;
  text-align: left;
  color: var(--kg-cream);
  display: flex;
  flex-direction: column;
}
.archive-list .archive-card__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.archive-list .archive-card__title {
  font-family: var(--font-sans);
  font-weight: 500;
  font-size: 13px;
  color: var(--kg-cream);
}
.archive-list .archive-card__number {
  font-family: var(--font-sans);
  font-weight: 300;
  font-style: italic;
  font-size: 11px;
  color: var(--kg-cream);
}
.archive-list .archive-card__teaser {
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 13px;
  line-height: 1.35;
  color: var(--kg-cream);
  margin: 8px 0 0;
}
.archive-list .archive-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
  padding-top: 14px;
}
.archive-list .archive-card__date {
  font-family: var(--font-sans);
  font-weight: 300;
  font-style: italic;
  font-size: 11px;
  color: var(--kg-cream);
}
/* Cream "lesen" pill (XD component "lesen"): cream fill, green text, sized snug
   to the short word. Zero the global .write-btn margins so space-between flushes
   it to the card's right edge. Hover flip handled by .write-btn--read below. */
.archive-list .archive-read.write-btn {
  min-width: 0;
  width: auto;
  margin: 0;
  padding: 0 18px;
  height: 26px;
}

/* Numbered pager (XD): identical to Sessions — 15px green numbers, current one
   Metropolis Medium, flanked by ‹ › chevrons, windowed to 5 numbers. */
.archive-pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 10px 0 4px;
}
.archive-pager .pg-num,
.archive-pager .pg-arrow {
  background: none;
  border: none;
  cursor: pointer;
  font-family: var(--font-sans);
  color: var(--kg-green);
  font-size: 15px;
  font-weight: 300;
  line-height: 1;
  padding: 4px 6px;
}
.archive-pager .pg-num { min-width: 24px; }
.archive-pager .pg-num.active { font-weight: 500; }
.archive-pager .pg-arrow { font-size: 20px; padding: 4px 8px; }
.archive-pager .pg-arrow:disabled { opacity: 0.3; cursor: default; }
.archive-pager .pg-ellipsis {
  color: var(--kg-green);
  font-size: 15px;
  padding: 0 2px;
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
        { value: 'completedAt', label: 'beendet am' },
        { value: 'createdAt',   label: 'erstellt am' },
        { value: 'number',      label: '#' },
        { value: 'title',       label: 'Titel' },
        { value: 'totalLikes',  label: '♥' },
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
    // Same windowed pager as Sessions: always MAX numbers (first, last, and a
    // 3-wide window around the current page, shifted inward at the edges) with
    // '…' filling gaps — e.g. "1 2 3 4 … 6" on page 1, "1 … 3 4 5 6" on the last.
    pageWindow() {
      const total = this.totalPages;
      const cur = this.page;
      const MAX = 5;
      if (total <= MAX) {
        return Array.from({ length: total }, (_, i) => i + 1);
      }
      let mid = cur - 1;
      mid = Math.max(2, Math.min(mid, total - 3));
      const sorted = [1, mid, mid + 1, mid + 2, total];
      const out = [];
      let prev = 0;
      for (const n of sorted) {
        if (n - prev > 1) out.push('…');
        out.push(n);
        prev = n;
      }
      return out;
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

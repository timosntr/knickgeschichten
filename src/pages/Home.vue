<template>
  <ooc-page>
    <ooc-menu
      title="Knickgeschichten"
      subtitle="Gemeinsam kreative Geschichten schreiben – in privaten Sessions mit euren Freund:innen oder zusammen mit Unbekannten.">
      <div>

        <!-- Akkordeon -->
        <div class="accordion">
          <button class="accordion-toggle" @click="showInfo = !showInfo">
            <span>So funktioniert's</span>
            <span class="accordion-icon">{{ showInfo ? '▲' : '▼' }}</span>
          </button>
          <div v-if="showInfo" class="accordion-body">
            <ul class="info-list">
              <li>Der bisher geschriebene Text wird wie beim klassischen Spiel „umgeknickt". Du siehst also nur einen kleinen Teil vom vorherigen Abschnitt.</li>
              <li>Du liest den sichtbaren Teil und schreibst darauf basierend einen neuen Abschnitt – mindestens <strong>15 Wörter</strong>, maximal <strong>250 Zeichen</strong>.</li>
              <li>Alle Beiträge sind anonym. Du weißt nicht, wer vor dir geschrieben hat, und am Ende ist nicht ersichtlich, wer welchen Abschnitt verfasst hat.</li>
              <li>Den Fortschritt einer Geschichte erkennst du am Statusbalken.</li>
              <li>Eine Geschichte ist fertig, wenn das Limit von <strong>4000 Zeichen</strong> erreicht ist.</li>
              <li>Du kannst jederzeit eine neue Geschichte starten.</li>
              <li>Fertige Geschichten findest du im <router-link to="/archive">Archiv</router-link>.</li>
            </ul>
            <p class="info-section-title">Private Räume</p>
            <ul class="info-list">
              <li>Du kannst eigene, private Räume erstellen und gemeinsam mit Freund:innen spielen.</li>
              <li>Dafür wird ein Code generiert, den du mit deinen Freund:innen teilen kannst.</li>
              <li>Nur Personen mit diesem Code können deiner Session beitreten.</li>
              <li>Jede teilnehmende Person startet eine Geschichte. Die „Zettel" werden weitergereicht, bis alle einmal an jeder Geschichte mitgewirkt haben.</li>
              <li>Am Ende könnt ihr eure Geschichten herunterladen.</li>
            </ul>
            <p class="info-section-title">Tipps</p>
            <ul class="info-list">
              <li>Achte darauf, was im vorherigen Abschnitt angedeutet wird (z.B. Zeitform, Perspektive, Setting).</li>
              <li>Achte auf Groß- und Kleinschreibung, sodass ein einheitlicher Gesamttext entsteht.</li>
              <li>Es gibt keine thematischen Einschränkungen.</li>
              <li>Unerwartete Wendungen sind ausdrücklich erwünscht.</li>
            </ul>
            <p class="info-section-title">Disclaimer</p>
            <ul class="info-list">
              <li>Diskriminierende, beleidigende oder anderweitig unangemessene Inhalte sind nicht erlaubt und werden durch Wortfilter erkannt und entfernt.</li>
              <li>Bitte gib keine persönlichen oder sensiblen Daten in deinem Text preis.</li>
              <li>Die Texte können nach dem Absenden nicht mehr geändert werden. Es werden auch extern keine nachträglichen Änderungen vorgenommen.</li>
              <li>Stories aus öffentlichen Sessions werden am Ende automatisch im Archiv veröffentlicht.</li>
              <li>Einige der veröffentlichten Geschichten werden im Rahmen des Projekts in gedruckter Form in einem Magazin festgehalten.</li>
            </ul>
          </div>
        </div>

        <!-- Satz des Tages -->
        <div v-if="quote" class="qotd" @click="$router.push(`/lobby/${quote.code}`)">
          <div class="qotd-label">Satz des Tages</div>
          <div class="qotd-text">„{{ quote.text }}"</div>
          <div class="qotd-author" v-if="quote.authorName !== null">— {{ quote.authorName === '' ? 'Anonym' : quote.authorName }}</div>
        </div>

        <!-- Öffentliche Story starten -->
        <sui-button
          color="green"
          :loading="!connected"
          @click="showCreateAsync = true"
          fluid
          style="margin-bottom: 20px">
          Neue öffentliche Story starten
        </sui-button>

        <!-- Private Geschichten -->
        <div class="section-label">Private Geschichten</div>
        <sui-button-group style="width: 100%">
          <sui-button
            color="blue"
            :loading="!connected || creatingLobby"
            @click="createLobby">
            Lobby erstellen
          </sui-button>
          <sui-button-or/>
          <sui-button
            color="blue"
            @click="showJoinLobby = true"
            :loading="!connected || showJoinLobby">
            Lobby beitreten
          </sui-button>
        </sui-button-group>

        <!-- Öffentliche Geschichten Karussell -->
        <div v-if="recentSessions.length > 0" class="section-label" style="margin-top: 20px">Öffentliche Geschichten</div>
        <div v-if="recentSessions.length > 0"
          class="carousel"
          @touchstart="onTouchStart"
          @touchend="onTouchEnd"
          @wheel="onWheel($event, 'sessions')">
          <div class="carousel-track">
            <transition :name="slideDir">
              <div class="session-card" :key="carouselIndex" @click="$router.push(`/lobby/${recentSessions[carouselIndex].code}`)">
                <div class="session-title">{{ recentSessions[carouselIndex].title }}</div>
                <div v-if="recentSessions[carouselIndex].teaser" class="session-teaser">
                  „{{ recentSessions[carouselIndex].teaser }}"
                </div>
                <div class="session-meta">
                  <span v-if="recentSessions[carouselIndex].playersOnline > 0">
                    {{ recentSessions[carouselIndex].playersOnline }} online
                  </span>
                </div>
                <div class="session-footer">
                  <span class="session-age">{{ timeAgo(recentSessions[carouselIndex].createdAt) }}</span>
                  <sui-button size="tiny" color="green">Mitmachen</sui-button>
                </div>
              </div>
            </transition>
          </div>
          <div class="carousel-dots">
            <span
              v-for="(s, i) in recentSessions"
              :key="i"
              class="carousel-dot"
              :class="{ active: i === carouselIndex }"
              @click="setCarousel(i)">
            </span>
          </div>
        </div>

        <div v-if="recentSessions.length > 0" style="margin-top: 10px; text-align: center">
          <router-link to="/sessions" class="browse-link">alle Geschichten durchstöbern →</router-link>
        </div>

        <!-- Archiv Karussell -->
        <div v-if="recentCompleted.length > 0" class="section-label" style="margin-top: 20px">Archiv</div>
        <div v-if="recentCompleted.length > 0"
          class="carousel"
          @touchstart="onTouchStartArchive"
          @touchend="onTouchEndArchive"
          @wheel="onWheel($event, 'archive')">
          <div class="carousel-track">
            <transition :name="archiveSlideDir">
              <div class="session-card" :key="archiveIndex" @click="$router.push(`/lobby/${recentCompleted[archiveIndex].code}`)">
                <div class="session-title">
                  <sui-icon name="check circle" color="green"/>
                  {{ recentCompleted[archiveIndex].title }}
                </div>
                <div v-if="recentCompleted[archiveIndex].teaser" class="session-teaser">
                  „{{ recentCompleted[archiveIndex].teaser }}"
                </div>
                <div class="session-meta">
                  {{ recentCompleted[archiveIndex].numAuthors }} {{ recentCompleted[archiveIndex].numAuthors === 1 ? 'Autor' : 'Autoren' }}
                </div>
                <div class="session-footer">
                  <span class="session-age">{{ timeAgo(recentCompleted[archiveIndex].createdAt) }}</span>
                  <sui-button size="tiny" color="teal">Lesen</sui-button>
                </div>
              </div>
            </transition>
          </div>
          <div class="carousel-dots">
            <span
              v-for="(s, i) in recentCompleted"
              :key="i"
              class="carousel-dot"
              :class="{ active: i === archiveIndex }"
              @click="setArchive(i)">
            </span>
          </div>
        </div>

        <div style="margin-top: 10px; text-align: center">
          <router-link to="/archive" class="browse-link">alle Geschichten durchstöbern →</router-link>
        </div>

      </div>
    </ooc-menu>
    <ooc-join-lobby :active="showJoinLobby" @close="showJoinLobby = false">
    </ooc-join-lobby>
    <ooc-create-async :active="showCreateAsync" @close="showCreateAsync = false">
    </ooc-create-async>
    <ooc-util></ooc-util>
  </ooc-page>
</template>

<style>
.qotd {
  margin-bottom: 16px;
  padding: 12px 14px;
  border-left: 3px solid #21ba45;
  background: rgba(33, 186, 69, 0.06);
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}
.qotd:hover {
  background: rgba(33, 186, 69, 0.13);
}
.qotd-label {
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #21ba45;
  margin-bottom: 4px;
  font-weight: 600;
}
.qotd-text {
  font-family: 'Lora', serif;
  font-style: italic;
  font-size: 0.97em;
  color: #333;
  line-height: 1.5;
}
.qotd-author {
  margin-top: 4px;
  font-size: 0.8em;
  color: #888;
  text-align: right;
}

.accordion {
  margin-bottom: 16px;
}
.accordion-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0 6px;
  background: none;
  border: none;
  border-bottom: 1px solid rgba(34, 36, 38, 0.12);
  cursor: pointer;
  font-size: 0.8em;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: #999;
  text-align: left;
  text-transform: uppercase;
}
.accordion-toggle:hover { color: #666; }
.accordion-icon { font-size: 0.75em; color: #ccc; }
.accordion-body { padding: 10px 0 4px; text-align: left; }
.info-section-title {
  font-weight: 700;
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #bbb;
  margin: 12px 0 3px;
}
.info-list { margin: 0; padding-left: 14px; }
.info-list li {
  font-size: 0.82em;
  color: #666;
  line-height: 1.55;
  margin-bottom: 4px;
}

.section-label {
  font-size: 0.78em;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #aaa;
  margin-bottom: 8px;
  text-align: left;
}

.carousel {
  user-select: none;
  overflow: hidden;
  position: relative;
}
.carousel .session-card {
  cursor: pointer;
  border: 1px solid rgba(34, 36, 38, 0.15);
  border-radius: 4px;
  padding: 12px 14px;
  text-align: left;
}
.carousel .session-card:hover {
  background: rgba(0,0,0,0.02);
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
  width: 100%;
}
/* Only the leaving card is taken out of flow, so the track sizes to the
   entering card and tall cards (long teasers) don't overflow it. */
.slide-left-leave-active,
.slide-right-leave-active {
  position: absolute;
  top: 0;
}
.slide-left-enter { transform: translateX(100%); opacity: 0; }
.slide-left-leave-to { transform: translateX(-100%); opacity: 0; }
.slide-right-enter { transform: translateX(-100%); opacity: 0; }
.slide-right-leave-to { transform: translateX(100%); opacity: 0; }

.carousel-track {
  position: relative;
  min-height: 90px;
}
.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
}
.carousel-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ddd;
  cursor: pointer;
  transition: background 0.2s;
}
.carousel-dot.active { background: #21ba45; }

.browse-link {
  font-size: 0.82em;
  color: #aaa;
  text-decoration: none;
}
.browse-link:hover { color: #666; }

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
  sockets: {
    connect() { this.connected = true; },
    disconnect() { this.connected = false; },
  },
  methods: {
    createLobby() {
      this.creatingLobby = true;
      this.$socket.emit('lobby:create');
    },
    async fetchQuote() {
      try {
        const res = await fetch('/api/v1/quote');
        if (res.ok) this.quote = await res.json();
      } catch {}
    },
    async fetchSessions() {
      try {
        const res = await fetch('/api/v1/lobbies');
        if (res.ok) {
          const all = await res.json();
          this.recentSessions = all.filter(s => !s.isComplete).slice(0, 5);
          this.recentCompleted = all.filter(s => s.isComplete).slice(0, 5);
        }
      } catch {}
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
    // Shortest circular direction from cur to next: 'slide-left' = forward.
    slideDirection(cur, next, len) {
      let d = next - cur;
      if (d > len / 2) d -= len;
      if (d < -len / 2) d += len;
      return d >= 0 ? 'slide-left' : 'slide-right';
    },
    setCarousel(i) {
      const len = this.recentSessions.length;
      if (len <= 1) return;
      const next = ((i % len) + len) % len;
      if (next === this.carouselIndex) return;
      this.slideDir = this.slideDirection(this.carouselIndex, next, len);
      this.carouselIndex = next;
    },
    setArchive(i) {
      const len = this.recentCompleted.length;
      if (len <= 1) return;
      const next = ((i % len) + len) % len;
      if (next === this.archiveIndex) return;
      this.archiveSlideDir = this.slideDirection(this.archiveIndex, next, len);
      this.archiveIndex = next;
    },
    onTouchStart(e) {
      this.touchStartX = e.changedTouches[0].clientX;
    },
    onTouchEnd(e) {
      const dx = e.changedTouches[0].clientX - this.touchStartX;
      if (Math.abs(dx) < 40) return;
      this.setCarousel(this.carouselIndex + (dx < 0 ? 1 : -1));
    },
    onTouchStartArchive(e) {
      this.touchStartXArchive = e.changedTouches[0].clientX;
    },
    onTouchEndArchive(e) {
      const dx = e.changedTouches[0].clientX - this.touchStartXArchive;
      if (Math.abs(dx) < 40) return;
      this.setArchive(this.archiveIndex + (dx < 0 ? 1 : -1));
    },
    onWheel(e, which) {
      // Vertical gesture: let the page scroll normally (don't trap it).
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      // Horizontal gesture: consume it for the carousel.
      e.preventDefault();
      if (this.wheelCooldown) return;
      this.wheelAccum += e.deltaX;
      if (Math.abs(this.wheelAccum) > 60) {
        const dir = this.wheelAccum > 0 ? 1 : -1;
        this.wheelAccum = 0;
        this.wheelCooldown = true;
        setTimeout(() => { this.wheelCooldown = false; this.wheelAccum = 0; }, 600);
        if (which === 'sessions') this.setCarousel(this.carouselIndex + dir);
        else this.setArchive(this.archiveIndex + dir);
      }
    },
  },
  created() {
    this.$socket.emit('lobby:leave');
    this.fetchQuote();
    this.fetchSessions();
  },
  data() {
    return {
      connected: this.$root.connected,
      creatingLobby: false,
      showJoinLobby: false,
      showCreateAsync: false,
      quote: null,
      showInfo: false,
      recentSessions: [],
      carouselIndex: 0,
      touchStartX: 0,
      recentCompleted: [],
      archiveIndex: 0,
      archiveSlideDir: 'slide-left',
      touchStartXArchive: 0,
      wheelCooldown: false,
      wheelAccum: 0,
      slideDir: 'slide-left',
    };
  },
};
</script>

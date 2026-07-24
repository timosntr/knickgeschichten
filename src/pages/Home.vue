<template>
  <ooc-page>
    <ooc-menu
      title="Knickgeschichten"
      subtitle="Gemeinsam kreative Geschichten schreiben – in privaten Sessions mit euren Freund:innen oder zusammen mit Unbekannten.">
      <div>

        <!-- Akkordeon -->
        <div class="home-howto">
          <button class="home-howto__toggle" @click="showInfo = !showInfo">
            <span>So funktioniert's</span>
            <span class="home-howto__caret">{{ showInfo ? '⌃' : '⌄' }}</span>
          </button>
          <div v-if="showInfo" class="home-howto__body">
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
          <div class="qotd-card">
            <div class="qotd-label">Satz des Tages</div>
            <div class="qotd-text">{{ quote.text }}</div>
            <div class="qotd-author" v-if="quote.authorName !== null">
              – {{ quote.authorName === '' ? 'Anonym' : quote.authorName }}
            </div>
          </div>
        </div>

        <!-- Öffentliche Story starten -->
        <button
          class="kg-btn kg-btn--solid"
          :disabled="!connected || creatingAsync"
          @click="createAsync">
          öffentliche Geschichte starten
        </button>

        <!-- Private Geschichten -->
        <div class="kg-divider"><span>private Geschichten</span></div>
        <button
          class="kg-btn kg-btn--outline"
          :disabled="!connected || creatingLobby"
          @click="createLobby">
          Raum erstellen
        </button>
        <button
          class="kg-btn kg-btn--outline"
          :disabled="!connected || showJoinLobby"
          @click="showJoinLobby = true">
          Raum beitreten
        </button>

        <!-- Öffentliche Geschichten Karussell -->
        <section v-if="recentSessions.length > 0" class="kg-sheet">
          <h2 class="kg-sheet__title">angefangene Geschichten</h2>
          <div class="carousel"
            @touchstart="onTouchStart"
            @touchend="onTouchEnd"
            @wheel="onWheel($event, 'sessions')">
            <button
              v-if="recentSessions.length > 1"
              class="kg-arrow kg-arrow--prev"
              @click.stop="setCarousel(carouselIndex - 1)">‹</button>
            <div class="carousel-track">
              <transition :name="slideDir">
                <div class="kg-card kg-card--outline" :key="carouselIndex" @click="$router.push(`/lobby/${recentSessions[carouselIndex].code}`)">
                  <div class="kg-card__top">
                    <h3 class="kg-card__title">{{ recentSessions[carouselIndex].title }}</h3>
                    <span class="kg-card__id">#{{ storyNumber(recentSessions[carouselIndex].title) }}</span>
                  </div>
                  <p v-if="recentSessions[carouselIndex].teaser" class="kg-card__body">
                    „{{ recentSessions[carouselIndex].teaser }}"
                  </p>
                  <div class="kg-progress">
                    <div class="kg-progress__fill"
                      :style="{ width: Math.round((recentSessions[carouselIndex].progress || 0) * 100) + '%' }"></div>
                  </div>
                  <div class="kg-card__foot">
                    <span class="kg-card__time">
                      {{ timeAgo(recentSessions[carouselIndex].createdAt) }}
                      <template v-if="recentSessions[carouselIndex].playersOnline > 0">
                        · {{ recentSessions[carouselIndex].playersOnline }} online
                      </template>
                    </span>
                    <span class="kg-pill kg-pill--solid">beitreten</span>
                  </div>
                </div>
              </transition>
            </div>
            <button
              v-if="recentSessions.length > 1"
              class="kg-arrow kg-arrow--next"
              @click.stop="setCarousel(carouselIndex + 1)">›</button>
          </div>
          <router-link to="/sessions" class="kg-link">alle Geschichten durchstöbern</router-link>
        </section>

        <!-- Archiv Karussell (kein Hintergrundbild) -->
        <section v-if="recentCompleted.length > 0" class="kg-section-plain">
          <h2 class="kg-sheet__title">Archiv</h2>
          <div class="carousel"
            @touchstart="onTouchStartArchive"
            @touchend="onTouchEndArchive"
            @wheel="onWheel($event, 'archive')">
            <button
              v-if="recentCompleted.length > 1"
              class="kg-arrow kg-arrow--prev"
              @click.stop="setArchive(archiveIndex - 1)">‹</button>
            <div class="carousel-track">
              <transition :name="archiveSlideDir">
                <div class="kg-card kg-card--dark" :key="archiveIndex" @click="$router.push(`/lobby/${recentCompleted[archiveIndex].code}`)">
                  <div class="kg-card__top">
                    <h3 class="kg-card__title">{{ recentCompleted[archiveIndex].title }}</h3>
                    <span class="kg-card__id">#{{ storyNumber(recentCompleted[archiveIndex].title) }}</span>
                  </div>
                  <p v-if="recentCompleted[archiveIndex].teaser" class="kg-card__body">
                    „{{ recentCompleted[archiveIndex].teaser }}"
                  </p>
                  <div class="kg-card__foot">
                    <span class="kg-card__meta">
                      <span class="kg-card__time">
                        {{ dateSpan(recentCompleted[archiveIndex].createdAt, recentCompleted[archiveIndex].completedAt) }}
                      </span>
                      <span v-if="recentCompleted[archiveIndex].totalLikes > 0" class="kg-card__likes">
                        ♥ {{ recentCompleted[archiveIndex].totalLikes }}
                      </span>
                    </span>
                    <span class="kg-pill kg-pill--cream">lesen</span>
                  </div>
                </div>
              </transition>
            </div>
            <button
              v-if="recentCompleted.length > 1"
              class="kg-arrow kg-arrow--next"
              @click.stop="setArchive(archiveIndex + 1)">›</button>
          </div>
          <router-link to="/archive" class="kg-link">alle Geschichten durchstöbern</router-link>
        </section>

      </div>
    </ooc-menu>

    <!-- Footer (nur Startseite) -->
    <footer class="site-footer">
      <p class="site-footer__note">
        Diese Website wurde im Rahmen des Projektmoduls „Schreibszenen“ im
        akademischen Jahr 2025/26 an der Ruhr-Universität Bochum von Luisa Bytom,
        Jingtian Dong, Pavlos Gkegkas, Timo Santehanser und Marlen Stuka entwickelt.
      </p>
      <nav class="site-footer__links">
        <router-link to="/impressum" class="site-footer__link">Impressum</router-link>
        <router-link to="/datenschutz" class="site-footer__link">Datenschutz</router-link>
      </nav>
    </footer>

    <ooc-join-lobby :active="showJoinLobby" @close="showJoinLobby = false">
    </ooc-join-lobby>
    <ooc-util></ooc-util>
  </ooc-page>
</template>

<style>
/* Footer (home only) ----------------------------------------------------- */
.site-footer {
  /* torn-paper sheet with the ragged edge along the top (IMG_4565.6) */
  background: url('../assets/band-footer.webp') no-repeat top center;
  background-size: 140% 140%;
  margin-top: 24px;
  padding: 78px 24px 44px;
  text-align: center;
}
.site-footer__note {
  max-width: 320px;
  margin: 0 auto;
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 13px;
  line-height: 1.55;
  color: var(--kg-green);
}
/* Impressum / Datenschutz links (XD footer). */
.site-footer__links {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 18px;
}
.site-footer__link {
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 13px;
  color: var(--kg-green);
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.2s ease;
}
.site-footer__link:hover { color: var(--kg-blue); }

/* Action buttons --------------------------------------------------------- */
.kg-btn {
  appearance: none;
  width: 100%;
  border: 1.5px solid var(--kg-green);
  border-radius: var(--kg-radius-pill);
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 13px;                 /* XD: Metropolis-Light 13 */
  font-weight: 300;
  padding: 14px 20px;
  margin-bottom: 12px;
  text-align: center;
  transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
}
.kg-btn--solid { background: var(--kg-green); color: var(--kg-cream); }
.kg-btn--outline { background: transparent; color: var(--kg-green); }
/* XD hover states: the solid button turns blue; the outline buttons switch to
   a blue border + blue text. */
.kg-btn--solid:not([disabled]):hover {
  background: var(--kg-blue);
  border-color: var(--kg-blue);
}
.kg-btn--outline:not([disabled]):hover {
  border-color: var(--kg-blue);
  color: var(--kg-blue);
}
.kg-btn[disabled] { cursor: default; opacity: 0.45; }

/* Labelled divider ------------------------------------------------------- */
.kg-divider {
  align-items: center;
  color: var(--kg-green);
  display: flex;
  font-size: 11px;
  font-weight: 500;
  gap: 12px;
  margin: 6px 0 12px;
}
.kg-divider::before,
.kg-divider::after {
  background: var(--kg-line);
  content: '';
  flex: 1;
  height: 1px;
}

/* "So funktioniert's" toggle (XD: plain centred text + caret, no box).
   Uniquely named to avoid the global .accordion box from Einladen.vue. */
.home-howto { margin-bottom: 18px; text-align: center; }
.home-howto__toggle {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--kg-green);
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 13px;                 /* XD: Metropolis-Light 13 */
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 4px;
}
.home-howto__toggle:hover { opacity: 0.7; }
.home-howto__caret { font-size: 0.8em; }
.home-howto__body {
  padding: 10px 4px 4px;
  text-align: left;
}
.info-section-title {
  font-family: var(--font-serif);
  font-weight: 700;
  font-size: 16px;
  color: var(--kg-green);
  margin: 14px 0 4px;
}
.info-list { margin: 0; padding-left: 18px; }
.info-list li {
  font-size: 13px;
  color: var(--kg-green);
  line-height: 1.55;
  margin-bottom: 5px;
}
.info-list a { color: var(--kg-green); }

/* Satz des Tages (torn-paper card) -------------------------------------- */
.qotd { margin: 8px 0 22px; cursor: pointer; padding-bottom: 10%;}
.qotd-card {
  aspect-ratio: 700 / 470;
  background-image: url('../assets/quote-card.webp');
  /* Frame the torn scrap (it sits inset and slightly left in the image) so all
     its torn edges — including the bottom-right — stay inside the card. */
  background-size: 150% 140%;
  background-position-x: 54%;
  background-position-y: 46%;
  background-repeat: no-repeat;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
  max-width: 320px;
  padding: 17% 15% 15%;
  text-align: center;
  transition: transform 0.15s ease;
}
.qotd:hover .qotd-card { transform: translateY(-2px); }
.qotd-label {
  font-family: var(--font-serif);
  font-weight: 700;
  font-size: 30px;               /* XD: Boska-Black ~33 */
  margin-bottom: 14px;
}
.qotd-text {
  font-family: var(--font-sans);
  font-weight: 500;              /* upright, no quotation marks (per template) */
  font-size: 13px;
  line-height: 1.5;
}
.qotd-author {
  margin-top: 8px;
  font-family: var(--font-sans);
  font-weight: 500;
  font-style: italic;
  font-size: 11px;
}

/* Section sheet (whole section on one torn-paper sheet) ------------------ */
.kg-sheet {
  /* full-bleed: break out of the max-width menu container, edge to edge */
  position: relative;
  left: 50%;
  right: 50%;
  width: 100vw;
  margin: 26px -50vw;
  padding: 42px 20px 34px;
}
.kg-sheet::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url('../assets/band-section.webp') no-repeat;
  background-size: 140% 100%;
  /* drop-shadow follows the torn alpha edge (box-shadow would be a rectangle) */
  filter: drop-shadow(-3px 4px 6px rgba(25, 66, 30, 0.22));
  z-index: 0;
  background-position-x: -40px;
}
/* keep the inner content readable + centered while the sheet spans full width */
.kg-sheet > * {
  position: relative;
  z-index: 1;
  max-width: 360px;
  margin-left: auto;
  margin-right: auto;
}

/* Plain section (no torn-paper background) — used by Archiv */
.kg-section-plain {
  margin: 26px 0;
}
.kg-sheet__title {
  font-family: var(--font-serif);
  font-weight: 700;
  /* XD is Boska-Black 33; capped a touch lower so the longer wording
     ("angefangene Geschichten") still fits on one line like the XD. */
  font-size: clamp(25px, 8vw, 31px);
  color: var(--kg-green);
  letter-spacing: 0.3px;
  margin: 0 auto 16px;
  text-align: center;
}

/* Carousel --------------------------------------------------------------- */
.carousel {
  user-select: none;
  overflow: hidden;
  position: relative;
}
.carousel-track {
  position: relative;
  min-height: 120px;
  margin: 0 24px;
}

.kg-arrow {
  appearance: none;
  background: none;
  border: 0;
  color: var(--kg-green);
  cursor: pointer;
  font-size: 26px;
  line-height: 1;
  padding: 4px 6px;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
}
.kg-arrow:hover { opacity: 0.6; }
.kg-arrow--prev { left: 0; }
.kg-arrow--next { right: 0; }

/* Story cards ------------------------------------------------------------ */
.kg-card {
  cursor: pointer;
  border-radius: var(--kg-radius-card);
  padding: 16px 18px;
  text-align: left;
  display: flex;
  flex-direction: column;
}
.kg-card--outline {
  background: transparent;
  border: 1.5px solid var(--kg-green);
  color: var(--kg-green);
}
.kg-card--dark {
  background: var(--kg-green);
  box-shadow: 0 4px 14px rgba(25, 66, 30, 0.28);
  color: var(--kg-cream);
}
.kg-card__top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.kg-card__title {
  font-family: var(--font-sans);
  font-size: 13px;
  font-weight: 500;                /* XD: Metropolis Medium 13 */
  margin: 0;
}
.kg-card__id {
  font-weight: 300;                /* XD: Metropolis LightItalic 11 */
  font-size: 11px;
  font-style: italic;
  opacity: 0.8;
  white-space: nowrap;
}
.kg-card__body {
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 13px;                 /* XD: Metropolis Light 13 */
  line-height: 1.35;
  margin: 8px 0 0;
}
.kg-progress {
  height: 2px;                     /* XD: 2px rule */
  border-radius: 2px;
  background: rgba(25, 66, 30, 0.25);
  margin: 16px 0 0;
  overflow: hidden;
}
.kg-progress__fill {
  height: 100%;
  border-radius: 2px;
  background: var(--kg-green);
}
.kg-card__foot {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
}
.kg-card__time { font-weight: 300; font-size: 11px; font-style: italic; opacity: 0.85; }
.kg-card__meta {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
}
.kg-card__likes {
  font-size: 11px;
  opacity: 0.85;
  white-space: nowrap;
}

.kg-pill {
  border-radius: var(--kg-radius-pill);
  border: 1.5px solid transparent;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 300;                /* XD: Light (9px; kept at 11 for consistency) */
  padding: 4px 16px;
  white-space: nowrap;
  transition: background 0.2s ease, color 0.2s ease;
}
.kg-pill--solid {
  background: var(--kg-green);
  border-color: var(--kg-green);
  color: var(--kg-cream);
}
.kg-pill--cream {
  background: var(--kg-cream);
  border-color: var(--kg-cream);
  color: var(--kg-green);
}
/* XD hover: hovering a card flips its action pill to the outline look
   (beitreten → green outline, lesen → cream outline). */
.kg-card--outline:hover .kg-pill--solid {
  background: transparent;
  color: var(--kg-green);
}
.kg-card--dark:hover .kg-pill--cream {
  background: transparent;
  color: var(--kg-cream);
}

/* Carousel slide transitions -------------------------------------------- */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
  width: 100%;
}
.slide-left-leave-active,
.slide-right-leave-active {
  position: absolute;
  top: 0;
}
.slide-left-enter { transform: translateX(100%); opacity: 0; }
.slide-left-leave-to { transform: translateX(-100%); opacity: 0; }
.slide-right-enter { transform: translateX(-100%); opacity: 0; }
.slide-right-leave-to { transform: translateX(100%); opacity: 0; }

/* Browse link ------------------------------------------------------------ */
.kg-link {
  display: block;
  margin-top: 16px;
  font-family: var(--font-sans);
  font-weight: 300;                /* XD: Metropolis-Light 13 */
  font-size: 13px;
  color: var(--kg-green);
  text-align: center;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.2s ease;
}
/* XD hover: link (and its underline) turn blue. */
.kg-link:hover { color: var(--kg-blue); }
</style>

<script>
export default {
  sockets: {
    connect() { this.connected = true; },
    disconnect() { this.connected = false; },
    'lobby:join'() { this.creatingAsync = false; },
  },
  methods: {
    storyNumber(title) {
      const m = /(\d+)\s*$/.exec(title || '');
      return m ? m[1] : '';
    },
    createAsync() {
      this.creatingAsync = true;
      this.$socket.emit('lobby:create:async', {});
    },
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
      if (mins < 60) return `vor ${mins} Minute${mins !== 1 ? 'n' : ''}`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `vor ${hrs} Stunde${hrs !== 1 ? 'n' : ''}`;
      const days = Math.floor(hrs / 24);
      return `vor ${days} Tag${days !== 1 ? 'en' : ''}`;
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
      creatingAsync: false,
      showJoinLobby: false,
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

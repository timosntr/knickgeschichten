<template>
  <ooc-page>
    <ooc-menu :title="info ? info.title : '…'" subtitle="">
      <div v-if="loading" style="text-align:center; padding: 24px">
        <sui-loader active inline centered>lädt</sui-loader>
      </div>
      <div v-else-if="notFound" class="einladen-empty">
        Diese Geschichte existiert nicht mehr.
        <router-link to="/" class="kg-link">Zurück zur Startseite</router-link>
      </div>
      <div v-else>

        <!-- So funktioniert's: reuses Home.vue's un-boxed toggle + info-list
             (both globally defined, unscoped SFC styles). -->
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
              <li>Eine Geschichte ist fertig, wenn das Limit von <strong>4000 Zeichen</strong> erreicht ist.</li>
            </ul>
          </div>
        </div>

        <!-- Kontext: same torn-paper snippet used mid-game in Story.vue
             (.context-block/.write-label/.context-snippet/.context-text). -->
        <div v-if="info.teaser" class="context-block">
          <div class="write-label">Die Geschichte endet gerade mit…</div>
          <div class="context-snippet">
            <div class="context-text">{{ info.teaser }}</div>
          </div>
        </div>

        <button type="button" class="write-btn write-btn--solid einladen-cta" @click="$router.push(`/lobby/${code}`)">
          weiterschreiben
        </button>
      </div>
    </ooc-menu>
    <ooc-util></ooc-util>
  </ooc-page>
</template>

<style>
.einladen-empty {
  text-align: center;
  padding: 24px 0 8px;
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 13px;
  color: var(--kg-green);
}
.einladen-cta.write-btn {
  margin-top: 16px;
}
</style>

<script>
export default {
  data() {
    return {
      info: null,
      loading: true,
      notFound: false,
      showInfo: false,
    };
  },
  computed: {
    code() {
      return this.$route.params.code;
    },
  },
  async created() {
    try {
      const res = await fetch(`/api/v1/lobby/${this.code}/preview`);
      if (res.ok) {
        this.info = await res.json();
        if (this.info.isComplete) {
          this.$router.replace(`/lobby/${this.code}`);
          return;
        }
      } else {
        this.notFound = true;
      }
    } catch {
      this.notFound = true;
    }
    this.loading = false;
  },
};
</script>

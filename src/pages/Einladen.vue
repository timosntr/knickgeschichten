<template>
  <ooc-page>
    <ooc-menu :title="info ? info.title : '…'" subtitle="">
      <div v-if="loading" style="text-align:center; padding: 24px">
        <sui-loader active inline centered>Laden...</sui-loader>
      </div>
      <div v-else-if="notFound" style="text-align:center; padding: 24px; color: #888">
        Diese Geschichte existiert nicht mehr.
        <br><router-link to="/">Zurück zur Startseite</router-link>
      </div>
      <div v-else>

        <!-- So funktioniert's -->
        <div class="accordion">
          <button class="accordion-toggle" @click="showInfo = !showInfo">
            <span>So funktioniert's</span>
            <span class="accordion-icon">{{ showInfo ? '▲' : '▼' }}</span>
          </button>
          <div v-if="showInfo" class="accordion-body">
            <ul class="info-list">
              <li>Der bisher geschriebene Text wird wie beim klassischen Spiel „umgeknickt". Du siehst also nur einen kleinen Teil vom vorherigen Abschnitt.</li>
              <li>Du liest den sichtbaren Teil und schreibst darauf basierend einen neuen Abschnitt – mindestens <strong>15 Wörter</strong>, maximal <strong>300 Zeichen</strong>.</li>
              <li>Alle Beiträge sind anonym. Du weißt nicht, wer vor dir geschrieben hat, und am Ende ist nicht ersichtlich, wer welchen Abschnitt verfasst hat.</li>
              <li>Eine Geschichte ist fertig, wenn das Limit von <strong>3900 Zeichen</strong> erreicht ist.</li>
            </ul>
          </div>
        </div>

        <!-- Kontext -->
        <div v-if="info.teaser" class="teaser-box">
          <div class="teaser-label">Die Geschichte endet gerade mit …</div>
          <div class="teaser-text">„{{ info.teaser }}"</div>
        </div>

        <sui-button color="green" fluid style="margin-top: 16px" @click="$router.push(`/lobby/${code}`)">
          Jetzt weiterschreiben
        </sui-button>
      </div>
    </ooc-menu>
    <ooc-util></ooc-util>
  </ooc-page>
</template>

<style>
.teaser-box {
  border-left: 3px solid #21ba45;
  background: rgba(33,186,69,0.05);
  border-radius: 0 4px 4px 0;
  padding: 10px 14px;
  margin: 16px 0;
}
.teaser-label {
  font-size: 0.78em;
  color: #aaa;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.teaser-text {
  font-family: 'Lora', serif;
  font-style: italic;
  font-size: 1em;
  color: #333;
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
.accordion-body {
  padding: 10px 14px 12px;
  border-top: 1px solid #f0f0f0;
}
.info-list {
  margin: 0;
  padding-left: 18px;
  font-size: 0.88em;
  color: #555;
  line-height: 1.6;
}
.info-list li { margin-bottom: 4px; }
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

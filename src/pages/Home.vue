<template>
  <ooc-page>
    <ooc-menu
      title="Knickgeschichten"
      subtitle="Collaborative stories, one line at a time">
      <div>
        <p class="intro-text">
          Gemeinsam kreative Geschichten schreiben – in privaten Sessions mit euren Freund:innen oder zusammen mit Unbekannten.
        </p>
        <details class="how-it-works">
          <summary class="how-it-works__title">so funktioniert's</summary>
          <div class="how-it-works__content">
            <ul>
              <li>Der bisher geschriebene Text wird wie beim klassischen Spiel „umgeknickt". Du siehst also nur die letzte Zeile vom vorherigen Abschnitt.</li>
              <li>Du liest den sichtbaren Teil des vorherigen Textes und schreibst darauf basierend einen neuen Abschnitt mit mindestens XXX und maximal XXX Zeichen.</li>
              <li>Alle Beiträge sind anonym. Du weißt also nicht, wer vor dir geschrieben hat und am Ende ist nicht ersichtlich, wer welchen Absatz verfasst hat.</li>
              <li>Wie weit die Geschichten bereits fortgeschritten sind, erkennst du am Statusbalken.</li>
              <li>Eine Geschichte ist fertig, wenn das Limit von XXX Zeichen erreicht ist. Die Geschichte kann durch Teilnehmer:innen ab XXX Zeichen auch manuell beendet werden.</li>
              <li>Du kannst jederzeit eine neue Geschichte starten.</li>
              <li>Fertige Geschichten kannst du im Archiv einsehen.</li>
            </ul>

            <p class="how-it-works__section">Private Räume</p>
            <ul>
              <li>Du kannst eigene, private Räume erstellen und gemeinsam mit Freund:innen spielen. Dafür wird ein Code generiert, den du mit deinen Freund:innen teilen kannst.</li>
              <li>Nur Personen mit diesem Code können deiner Session beitreten.</li>
              <li>Jede teilnehmende Person startet eine Geschichte. Die „Zettel" werden weitergereicht, bis alle einmal an jeder Geschichte mitgewirkt haben.</li>
              <li>Am Ende könnt ihr eure Geschichte herunterladen und / oder freiwillig veröffentlichen, sodass sie im öffentlichen Archiv erscheint.</li>
            </ul>

            <p class="how-it-works__section">Tipps</p>
            <ul>
              <li>Achte darauf, was im vorherigen Abschnitt angedeutet wird (z.B. Zeitform, Perspektive, Setting).</li>
              <li>Achte auf Groß- und Kleinschreibung, sodass ein einheitlicher Gesamttext entsteht.</li>
              <li>Es gibt keine thematischen Einschränkungen.</li>
              <li>Unerwartete Wendungen sind ausdrücklich erwünscht.</li>
            </ul>

            <p class="how-it-works__section">Disclaimer</p>
            <ul>
              <li>Diskriminierende, beleidigende oder anderweitig unangemessene Inhalte sind nicht erlaubt und werden durch Wortfilter erkannt und entfernt.</li>
              <li>Bitte gib keine persönlichen oder sensiblen Daten in deinem Text preis.</li>
              <li>Die Texte können nach dem Absenden nicht mehr geändert werden.</li>
              <li>Es werden auch extern keine nachträglichen Änderungen (z.B. Rechtschreibung oder Grammatik) vorgenommen.</li>
              <li>Stories, die in einer öffentlichen Session geschrieben wurden, werden am Ende automatisch im Archiv veröffentlicht.</li>
              <li>Einige der im Archiv veröffentlichten Geschichten werden im Rahmen des Projekts in gedruckter Form in einem Magazin festgehalten.</li>
            </ul>
          </div>
        </details>

        <sui-divider horizontal :inverted="darkMode">
          Stories
        </sui-divider>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <sui-button
            color="green"
            :inverted="darkMode"
            :loading="!connected"
            @click="showCreateAsync = true"
            fluid>
            Start Async Story
          </sui-button>
          <sui-button
            color="teal"
            :inverted="darkMode"
            :loading="!connected"
            is="router-link"
            to="/sessions"
            fluid>
            Browse Public Sessions
          </sui-button>
        </div>
        <sui-divider horizontal :inverted="darkMode">
          Private Game
        </sui-divider>
        <sui-button-group>
          <sui-button
            color="blue"
            :inverted="darkMode"
            :loading="!connected || creatingLobby"
            @click="createLobby">
            Create
          </sui-button>
          <sui-button-or/>
          <sui-button
            color="blue"
            :inverted="darkMode"
            @click="showJoinLobby = true"
            :loading="!connected || showJoinLobby">
            Join by Code
          </sui-button>
        </sui-button-group>
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
.intro-text {
  color: #555;
  font-family: Lato, sans-serif;
  font-size: 0.95em;
  line-height: 1.5;
  margin: 0 0 8px 0;
}

.dark-theme .intro-text {
  color: #bbb;
}

.how-it-works {
  margin: 0 0 12px 0;
  text-align: left;
}

.how-it-works__title {
  color: #888;
  cursor: pointer;
  font-family: Lato, sans-serif;
  font-size: 0.85em;
  font-style: italic;
  list-style: none;
  padding: 4px 0;
  user-select: none;
}

.how-it-works__title::-webkit-details-marker { display: none; }

.how-it-works__title::before {
  content: '▶ ';
  font-size: 0.75em;
}

details[open] .how-it-works__title::before {
  content: '▼ ';
}

.how-it-works__content {
  border-left: 2px solid #ddd;
  color: #555;
  font-family: Lato, sans-serif;
  font-size: 0.88em;
  line-height: 1.55;
  margin-top: 8px;
  padding-left: 12px;
}

.how-it-works__content ul {
  margin: 4px 0 10px 0;
  padding-left: 18px;
}

.how-it-works__content li {
  margin-bottom: 4px;
}

.how-it-works__section {
  font-weight: bold;
  margin: 10px 0 2px 0;
}

.dark-theme .how-it-works__title {
  color: #aaa;
}

.dark-theme .how-it-works__content {
  border-left-color: #444;
  color: #bbb;
}
</style>

<script>
export default {
  sockets: {
    connect() {
      this.connected = true;
    },
    disconnect() {
      this.connected = false;
    },
  },
  methods: {
    update() { this.$forceUpdate(); },
    createLobby() {
      this.creatingLobby = true;
      this.$socket.emit('lobby:create');
    },
  },
  beforeDestroy() {
    this.bus.$off('toggle-dark-mode', this.update);
  },
  created() {
    this.bus.$on('toggle-dark-mode', this.update);
    this.$socket.emit('lobby:leave');
  },
  data() {
    return {
      connected: this.$root.connected,
      creatingLobby: false,
      showJoinLobby: false,
      showCreateAsync: false,
    };
  },
};
</script>

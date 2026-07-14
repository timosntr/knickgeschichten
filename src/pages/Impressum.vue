<template>
  <ooc-page>
    <ooc-menu title="Impressum" subtitle="Angaben gemäß § 5 DDG">
      <div class="legal">
        <p class="legal-draft">
          ⚠️ Entwurf – vor Veröffentlichung mit der zuständigen Einrichtung der
          Ruhr-Universität Bochum (Lehrstuhl, Justiziariat, Datenschutz)
          abstimmen und alle <code>[PLATZHALTER]</code> ausfüllen.
        </p>

        <h3>Diensteanbieter</h3>
        <p>
          Ruhr-Universität Bochum<br>
          [PLATZHALTER: Lehrstuhl / Einrichtung, z. B. Institut für Medienwissenschaft]<br>
          Universitätsstraße 150<br>
          44801 Bochum<br>
          Deutschland
        </p>
        <p>
          Die Ruhr-Universität Bochum ist eine Körperschaft des öffentlichen
          Rechts. Sie wird [PLATZHALTER: durch das Rektorat / durch die
          verantwortliche Person des Lehrstuhls] vertreten.
        </p>

        <h3>Kontakt</h3>
        <p>
          E-Mail: [PLATZHALTER: kontakt@rub.de]<br>
          Telefon: [PLATZHALTER: optional]
        </p>

        <h3>Zuständige Aufsichtsbehörde</h3>
        <p>
          [PLATZHALTER: z. B. Ministerium für Kultur und Wissenschaft des Landes
          Nordrhein-Westfalen – nur angeben, falls einschlägig.]
        </p>

        <h3>Zum Projekt</h3>
        <p>
          Diese Website ist im Rahmen des Projektmoduls „Schreibszenen“ im
          akademischen Jahr 2025/26 an der Ruhr-Universität Bochum entstanden.
          [PLATZHALTER: Ob die Universität bzw. der Lehrstuhl formal
          Diensteanbieter ist, mit der Einrichtung klären und ggf. auf deren
          zentrales Impressum verweisen.]
        </p>

        <h3>Haftung für Inhalte</h3>
        <p>
          Die Inhalte der von Nutzer:innen verfassten Geschichten geben nicht
          notwendigerweise die Auffassung des Anbieters wieder. Als
          Diensteanbieter sind wir für eigene Inhalte nach den allgemeinen
          Gesetzen verantwortlich; für nutzergenerierte Inhalte gelten die
          §§ 7–10 DDG. Rechtswidrige Inhalte entfernen wir nach Kenntnisnahme.
        </p>

        <div class="legal-back">
          <router-link is="sui-button" to="/" size="small" basic>Zurück</router-link>
        </div>
      </div>
    </ooc-menu>
    <ooc-util></ooc-util>
  </ooc-page>
</template>

<style>
.legal {
  text-align: left;
  font-size: 0.92em;
  line-height: 1.6;
  color: #333;
}
.legal h3 {
  margin: 18px 0 4px;
  font-size: 1em;
}
.legal-draft {
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.85em;
}
.legal code {
  background: #f0f0f0;
  padding: 0 3px;
  border-radius: 3px;
}
.legal-back {
  margin-top: 20px;
  text-align: center;
}
</style>

<script>
export default {};
</script>

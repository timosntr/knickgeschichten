<template>
  <ooc-page>
    <ooc-menu title="Impressum" subtitle="Angaben gemäß § 5 DDG">
      <div class="legal">
        <p class="legal-draft">
          ⚠️ Entwurf – vor Veröffentlichung rechtlich prüfen lassen und alle
          <code>[PLATZHALTER]</code> ausfüllen.
        </p>

        <h3>Diensteanbieter</h3>
        <p>
          [PLATZHALTER: Name der verantwortlichen Person oder Einrichtung]<br>
          [PLATZHALTER: Straße und Hausnummer]<br>
          [PLATZHALTER: PLZ und Ort]<br>
          [PLATZHALTER: Land]
        </p>

        <h3>Kontakt</h3>
        <p>
          E-Mail: [PLATZHALTER: kontakt@example.de]<br>
          Telefon: [PLATZHALTER: optional]
        </p>

        <h3>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h3>
        <p>
          [PLATZHALTER: Name]<br>
          [PLATZHALTER: Anschrift, falls abweichend]
        </p>

        <h3>Zum Projekt</h3>
        <p>
          Diese Website ist im Rahmen des Projektmoduls „Schreibszenen“ im
          akademischen Jahr 2025/26 an der Ruhr-Universität Bochum entstanden.
          [PLATZHALTER: Falls die Universität bzw. ein Lehrstuhl Diensteanbieter
          ist, hier auf deren Impressum/Trägerschaft verweisen.]
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

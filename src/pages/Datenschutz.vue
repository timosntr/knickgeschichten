<template>
  <ooc-page>
    <ooc-menu title="Datenschutzerklärung" subtitle="Informationen nach Art. 13 DSGVO">
      <div class="legal">
        <p class="legal-draft">
          ⚠️ Entwurf – vor Veröffentlichung rechtlich prüfen lassen und alle
          <code>[PLATZHALTER]</code> ausfüllen. Mit Hetzner und Cloudflare sollten
          Auftragsverarbeitungsverträge (AVV) geschlossen werden.
        </p>

        <h3>1. Verantwortlicher</h3>
        <p>
          Ruhr-Universität Bochum,
          [PLATZHALTER: Lehrstuhl / Einrichtung], Universitätsstraße 150,
          44801 Bochum, E-Mail: [PLATZHALTER: kontakt@rub.de] – siehe
          <router-link to="/impressum">Impressum</router-link>.
        </p>

        <h3>1a. Datenschutzbeauftragte:r</h3>
        <p>
          [PLATZHALTER: Kontaktdaten der/des behördlichen
          Datenschutzbeauftragten der Ruhr-Universität Bochum – bei der
          Einrichtung erfragen.]
        </p>

        <h3>2. Hosting (Hetzner)</h3>
        <p>
          Die Website wird bei der Hetzner Online GmbH, Industriestr. 25,
          91710 Gunzenhausen, betrieben. Beim Aufruf werden serverseitig
          technische Zugriffsdaten verarbeitet, insbesondere die
          <strong>IP-Adresse</strong>, Datum/Uhrzeit, angefragte Ressource und
          User-Agent. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse an einem sicheren, störungsfreien Betrieb).
          Mit Hetzner besteht ein Auftragsverarbeitungsvertrag.
        </p>

        <h3>3. Content Delivery / Tunnel (Cloudflare)</h3>
        <p>
          Zur Auslieferung und Absicherung nutzen wir Cloudflare (Cloudflare,
          Inc., USA). Dabei wird die <strong>IP-Adresse</strong> der Besucher:innen
          verarbeitet; es kann zu einer <strong>Übermittlung in die USA</strong>
          kommen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; die
          Übermittlung wird auf Standardvertragsklauseln (Art. 46 DSGVO)
          gestützt. [PLATZHALTER: AVV/DPA mit Cloudflare abschließen und ggf.
          verlinken.]
        </p>

        <h3>4. Spieldaten (Geschichten &amp; Namen)</h3>
        <p>
          Beiträge, die Nutzer:innen schreiben, werden gespeichert und – bei
          öffentlichen Sessions – im <router-link to="/archive">Archiv</router-link>
          veröffentlicht. Ein selbst gewählter <strong>Anzeigename</strong> wird
          zusammen mit den Beiträgen gespeichert; eine <strong>anonyme</strong>
          Teilnahme ist möglich. Bitte gib keine personenbezogenen oder sensiblen
          Daten in deinen Texten preis. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
          bzw. f DSGVO (Durchführung des Spiels). Unangemessene Inhalte werden
          durch einen Wortfilter erkannt und/oder nach Kenntnis entfernt.
        </p>

        <h3>5. Lokale Speicherung (localStorage)</h3>
        <p>
          Zur Funktion des Spiels speichern wir wenige Angaben lokal in deinem
          Browser (z. B. deinen zuletzt genutzten Namen und einen noch nicht
          abgesendeten Textentwurf). Diese Daten verbleiben auf deinem Gerät und
          werden nicht zu Analyse- oder Werbezwecken übertragen. Es werden
          <strong>keine Tracking- oder Analyse-Cookies</strong> gesetzt.
        </p>

        <h3>6. Keine Analyse-Tools</h3>
        <p>
          Diese Website nutzt <strong>kein</strong> Google Analytics und keine
          vergleichbaren Tracking-Dienste.
        </p>

        <h3>7. Speicherdauer</h3>
        <p>
          Laufende, unfertige Sessions werden nach ca. 30 Tagen Inaktivität
          gelöscht. Im Archiv veröffentlichte Geschichten bleiben dauerhaft
          verfügbar. [PLATZHALTER: an tatsächliche Aufbewahrung anpassen.]
        </p>

        <h3>8. Deine Rechte</h3>
        <p>
          Du hast das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16),
          Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit
          (Art. 20) und Widerspruch (Art. 21 DSGVO) sowie ein Beschwerderecht bei
          einer Aufsichtsbehörde. Wende dich dazu an den unter Punkt 1 genannten
          Verantwortlichen.
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

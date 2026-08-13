<template>
  <ooc-page>
    <ooc-menu title="Datenschutzerklärung" subtitle="Informationen nach Art. 13 DSGVO">
      <div class="legal">
        <h3>1. Verantwortlicher</h3>
        <p>
          Ruhr-Universität Bochum<br>
          Der Rektor, Universitätsstraße 150<br>
          44801 Bochum<br>
          E-Mail:
          <a href="mailto:support@knickgeschichten.com">support@knickgeschichten.com</a>
          – siehe <router-link to="/impressum">Impressum</router-link>.
        </p>

        <h3>1a. Datenschutzbeauftragter</h3>
        <p>
          Ruhr-Universität Bochum<br>
          Dr. Kai-Uwe Loser<br>
          Datenschutzbeauftragter<br>
          Universitätsstraße 150<br>
          44780 Bochum
        </p>
        <p>
          Telefon: +49 234 32 28720<br>
          E-Mail: <a href="mailto:dsb@rub.de">dsb@rub.de</a><br>
          Webseite:
          <a href="https://dsb.ruhr-uni-bochum.de/" target="_blank" rel="noopener">dsb.ruhr-uni-bochum.de</a>
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
          gestützt.
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
          Private Sessions (nur per Code zugänglich) werden nach ca. 30 Tagen
          ohne Aktivität automatisch gelöscht. Öffentliche Sessions sind Teil
          des Archivs und bleiben – ob abgeschlossen oder noch laufend –
          dauerhaft verfügbar; die dort veröffentlichten Beiträge und
          Anzeigenamen werden nicht automatisch gelöscht. Eine Löschung auf
          Anfrage (Art. 17 DSGVO) ist über die im Impressum genannte
          Kontaktadresse möglich.
        </p>

        <h3>8. Deine Rechte</h3>
        <p>
          Du hast das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16),
          Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit
          (Art. 20) und Widerspruch (Art. 21 DSGVO) sowie ein Beschwerderecht bei
          einer Aufsichtsbehörde. Wende dich dazu an den unter Punkt 1 genannten
          Verantwortlichen.
        </p>
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
.legal code {
  background: #f0f0f0;
  padding: 0 3px;
  border-radius: 3px;
}
</style>

<script>
export default {};
</script>

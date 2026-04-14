# Knickgeschichten – Mitmachen: Anleitung für Medienwissenschaftler

Diese Anleitung erklärt Schritt für Schritt, wie ihr das Projekt lokal einrichtet, den Entwicklungsserver startet, Änderungen vorschlagt und Claude Pro als KI-Assistenten nutzt. Ihr braucht keine Programmiererfahrung, aber ein bisschen Geduld beim ersten Mal.

---

## Inhaltsverzeichnis

1. [Voraussetzungen installieren](#1-voraussetzungen-installieren)
2. [Repository klonen](#2-repository-klonen)
3. [Abhängigkeiten installieren & Server starten](#3-abhängigkeiten-installieren--server-starten)
4. [Claude Pro einrichten](#4-claude-pro-einrichten)
5. [An GitHub teilnehmen: Pull Requests](#5-an-github-teilnehmen-pull-requests)
6. [Häufige Probleme](#6-häufige-probleme)

---

## 1. Voraussetzungen installieren

Ihr braucht drei Dinge: **Git**, **Node.js** und einen **GitHub-Account**.

---

### 1.1 GitHub-Account anlegen

1. Geht auf [github.com](https://github.com) und klickt auf **Sign up**.
2. E-Mail-Adresse, Passwort, Benutzername eingeben – fertig.
3. Die Bestätigungs-E-Mail öffnen und den Account verifizieren.

> **Tipp:** Nutzt idealerweise eure Uni-E-Mail-Adresse – damit könnt ihr später GitHub Education (kostenlose Pro-Features) beantragen.

---

### 1.2 Git installieren

Git ist das Werkzeug, das euren Code mit GitHub synchronisiert.

**Mac:**
1. Öffnet das Terminal (Spotlight → `Terminal`).
2. Tippt `git --version` und drückt Enter.
3. Falls Git noch nicht installiert ist, erscheint automatisch ein Dialog, der die Xcode Command Line Tools anbietet – auf **Installieren** klicken und warten.
4. Kontrollieren: `git --version` → sollte `git version 2.x.x` zeigen.

**Windows:**
1. Geht auf [git-scm.com/download/win](https://git-scm.com/download/win) – der Download startet automatisch.
2. Installer öffnen. Bei allen Fragen die Voreinstellungen belassen und auf **Next** klicken, dann **Install**.
3. Nach der Installation: **Git Bash** öffnen (Rechtsklick auf den Desktop → *Git Bash Here*, oder im Startmenü suchen).
4. Kontrollieren: `git --version` → sollte `git version 2.x.x` zeigen.

> Für den Rest dieser Anleitung: **Mac-Nutzer** verwenden das Terminal, **Windows-Nutzer** die Git Bash. Beide sehen gleich aus.

---

### 1.3 Node.js installieren

Node.js ist die Laufzeitumgebung für den Server.

**Mac & Windows (gleicher Weg):**
1. Geht auf [nodejs.org](https://nodejs.org) und ladet die **LTS**-Version herunter (die linke Schaltfläche – LTS = Long-Term Support, also die stabile Version).
2. Installer öffnen, alle Voreinstellungen belassen, auf **Next** / **Install** klicken.
3. Terminal / Git Bash öffnen und kontrollieren:
   ```
   node --version
   npm --version
   ```
   Beide Befehle sollten eine Versionsnummer ausgeben (z. B. `v20.x.x` und `10.x.x`).

---

### 1.4 Git konfigurieren (einmalig)

Sagt Git, wer ihr seid – diese Info erscheint später bei euren Beiträgen:

```bash
git config --global user.name "Euer Name"
git config --global user.email "eure@email.de"
```

---

## 2. Repository klonen

„Klonen" bedeutet: das Projekt von GitHub auf euren Computer herunterladen.

1. Geht auf die Projektseite auf GitHub und klickt auf den grünen **Code**-Button.
2. Kopiert die URL (sie endet auf `.git`).
3. Im Terminal / Git Bash navigiert ihr in den Ordner, wo das Projekt landen soll:

   ```bash
   # Beispiel: Ordner "Projekte" im Heimverzeichnis
   cd ~/Projekte
   ```

   Falls der Ordner noch nicht existiert:

   ```bash
   mkdir ~/Projekte
   cd ~/Projekte
   ```

4. Repo klonen:

   ```bash
   git clone https://github.com/ORGANISATION/knickgeschichten.git
   ```

   *(Die genaue URL findet ihr auf der GitHub-Seite des Projekts unter dem Code-Button.)*

5. In den neuen Ordner wechseln:

   ```bash
   cd knickgeschichten
   ```

---

## 3. Abhängigkeiten installieren & Server starten

Das Projekt braucht eine Reihe von Bibliotheken. npm holt diese automatisch.

### 3.1 Abhängigkeiten installieren

```bash
npm install
```

Das dauert beim ersten Mal ein bis drei Minuten. Ihr seht viele Zeilen durchlaufen – das ist normal. Am Ende sollte stehen: `added XXX packages`.

> **Windows-Hinweis:** Falls eine Fehlermeldung erscheint, die „Execution Policy" erwähnt, öffnet PowerShell als Administrator und führt aus: `Set-ExecutionPolicy RemoteSigned`. Dann zurück zu Git Bash und `npm install` erneut probieren.

### 3.2 Entwicklungsserver starten

```bash
npm run dev
```

Dieser Befehl startet zwei Dinge gleichzeitig:
- **webpack** – compiliert den Frontend-Code automatisch bei jeder Änderung
- **node** – startet den Backend-Server

Wenn ihr seht:

```
[webpack] compiled successfully
[server]  listening on port 8080
```

... dann läuft alles. Öffnet jetzt im Browser:

```
http://localhost:8080
```

Ihr seht die Knickgeschichten-Oberfläche. Zum Testen nutzt den Lobby-Code `devaaaa`.

### 3.3 Server stoppen

Im Terminal `Ctrl + C` drücken (Mac und Windows gleich).

> **Wichtig:** Wenn ihr Backend-Dateien (z. B. `main.js`) ändert, müsst ihr den Server manuell neu starten: `Ctrl + C`, dann `npm run dev` erneut. Frontend-Änderungen werden automatisch übernommen.

---

## 4. Claude Pro einrichten

Claude ist ein KI-Assistent von Anthropic, der euch beim Schreiben von Code, Texten und Analysen unterstützt. Claude Code ist die Terminal-Integration davon.

### 4.1 Claude Pro abonnieren

1. Geht auf [claude.ai](https://claude.ai) und erstellt einen Account (oder loggt euch ein).
2. Klickt oben links auf euren Namen → **Upgrade to Pro**.
3. Pro kostet aktuell 20 $/Monat (mit Uni-Adresse ggf. vergünstigt).
4. Nach dem Upgrade habt ihr Zugang zu den leistungsfähigsten Modellen.

### 4.2 Claude Code installieren (Terminal-Integration)

Claude Code ist ein Kommandozeilen-Tool, das Claude direkt in euer Projekt bringt.

**Mac:**
```bash
npm install -g @anthropic-ai/claude-code
```

**Windows (Git Bash):**
```bash
npm install -g @anthropic-ai/claude-code
```

Nach der Installation:
```bash
claude
```

Beim ersten Start werdet ihr aufgefordert, euch mit eurem Claude-Account zu authentifizieren – folgt den Anweisungen im Terminal.

### 4.3 Claude Code im Projekt verwenden

Navigiert in den Projektordner und startet Claude:

```bash
cd ~/Projekte/knickgeschichten
claude
```

Jetzt könnt ihr Claude im Chat Fragen stellen, z. B.:

- *„Erkläre mir, was die Datei `main.js` macht"*
- *„Wo wird der Lobby-Code generiert?"*
- *„Schreib mir einen neuen Button im Stil der bestehenden Komponenten"*

Claude sieht dabei euren gesamten Code und kann direkt Änderungen vorschlagen oder vornehmen.

---

## 5. An GitHub teilnehmen: Pull Requests

Ein **Pull Request (PR)** ist der offizielle Weg, Änderungen am Projekt vorzuschlagen. Ihr bearbeitet eine eigene Kopie des Codes und schlagt dann vor, diese Änderungen ins Hauptprojekt zu übernehmen.

### 5.1 Das Repo forken

„Forken" erstellt eine eigene Kopie des Repos unter eurem GitHub-Account.

1. Auf der GitHub-Seite des Projekts oben rechts auf **Fork** klicken.
2. Euren Account als Ziel auswählen → **Create fork**.
3. Ihr habt jetzt `euer-name/knickgeschichten` als eigene Kopie.

### 5.2 Euren Fork klonen (statt des Originals)

Falls ihr das Original schon geklont habt, fügt euren Fork als neue Remote-Quelle hinzu:

```bash
git remote add mein-fork https://github.com/EUER-NAME/knickgeschichten.git
```

Oder klont gleich euren Fork:

```bash
git clone https://github.com/EUER-NAME/knickgeschichten.git
cd knickgeschichten
# Original-Repo als "upstream" eintragen, um Updates zu holen:
git remote add upstream https://github.com/ORGANISATION/knickgeschichten.git
```

### 5.3 Einen neuen Branch erstellen

Jede Änderung gehört auf einen eigenen Branch (Arbeitszweig). Nennt ihn beschreibend:

```bash
git checkout -b fix/tippfehler-lobby-text
# oder
git checkout -b feature/dunkelmodus-button
```

### 5.4 Änderungen machen und speichern

Ändert die gewünschten Dateien in eurem Editor (z. B. VS Code: `code .` im Projektordner).

Danach die Änderungen für Git vormerken und speichern (committen):

```bash
# Alle geänderten Dateien vormerken:
git add .

# Oder nur eine bestimmte Datei:
git add src/pages/Home.vue

# Commit mit Beschreibung erstellen:
git commit -m "Tippfehler in der Lobby-Beschreibung korrigiert"
```

> **Gute Commit-Nachrichten:** Schreibt auf Deutsch oder Englisch, was ihr geändert habt – nicht warum, das gehört in den PR. Beispiele: `Farbe des Buttons angepasst`, `Neuen Willkommenstext hinzugefügt`.

### 5.5 Branch auf GitHub hochladen

```bash
git push mein-fork fix/tippfehler-lobby-text
```

*(Falls ihr direkt den geklonten Fork nutzt, ohne extra Remote: `git push origin fix/tippfehler-lobby-text`)*

### 5.6 Pull Request erstellen

1. Geht auf GitHub zu eurem Fork (`github.com/EUER-NAME/knickgeschichten`).
2. Ihr seht einen gelben Banner: **„Compare & pull request"** – darauf klicken.
3. Füllt das Formular aus:
   - **Titel:** Kurz und klar, z. B. `Tippfehler in Lobby-Beschreibung behoben`
   - **Beschreibung:** Was habt ihr geändert, und warum? Gibt es Hintergründe oder Screenshots?
4. Klickt auf **Create pull request**.

Das war's – die Projektverantwortlichen werden euren Vorschlag sehen, kommentieren und ggf. übernehmen.

### 5.7 Feedback einarbeiten

Wenn jemand euren PR kommentiert und Änderungen wünscht:

1. Macht die Änderungen lokal in eurem Branch.
2. Committet wie gehabt: `git add .` → `git commit -m "..."`.
3. Pusht erneut: `git push mein-fork fix/tippfehler-lobby-text`.
4. Der PR aktualisiert sich automatisch – kein neuer PR nötig.

### 5.8 Euren Fork aktuell halten

Wenn das Hauptprojekt Änderungen bekommt, holt ihr diese so:

```bash
git checkout master
git pull upstream master
git push mein-fork master
```

---

## 6. Häufige Probleme

**`npm install` schlägt fehl mit `EACCES`-Fehler (Mac)**
→ Ihr habt keine Schreibrechte. Lösung: Node.js neu installieren über [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager), dann braucht ihr kein `sudo`.

**`npm run dev` startet, aber `localhost:8080` zeigt nichts**
→ Wartet, bis im Terminal `compiled successfully` erscheint. webpack braucht beim ersten Mal ~30 Sekunden.

**Git fragt nach Passwort bei jedem Push**
→ Richtet SSH-Authentifizierung ein: [docs.github.com/en/authentication/connecting-to-github-with-ssh](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)

**`git push` meldet `rejected` / `non-fast-forward`**
→ Euer Branch ist hinter dem Remote. Führt zuerst aus:
```bash
git pull --rebase mein-fork fix/euer-branch-name
```
Dann erneut pushen.

**Windows: `npm` wird nicht erkannt**
→ Node.js wurde nicht korrekt installiert oder das Terminal wurde nicht neu gestartet. Node.js nochmals installieren, Git Bash neu öffnen.

**Claude Code: `claude: command not found`**
→ npm global bin ist nicht im PATH. Führt aus:
```bash
npm config get prefix
```
Den angezeigten Pfad + `/bin` (Mac) oder `\bin` (Windows) zu eurer PATH-Variable hinzufügen, oder Node.js über nvm neu installieren.

---

## Schnellreferenz

| Aufgabe | Befehl |
|---|---|
| Abhängigkeiten installieren | `npm install` |
| Server starten | `npm run dev` |
| Server stoppen | `Ctrl + C` |
| Claude starten | `claude` |
| Neuen Branch erstellen | `git checkout -b name/beschreibung` |
| Änderungen vormerken | `git add .` |
| Commit erstellen | `git commit -m "Beschreibung"` |
| Branch hochladen | `git push mein-fork branch-name` |
| Upstream-Updates holen | `git pull upstream master` |

---

*Bei Fragen: Issue auf GitHub öffnen oder im Projektchat melden.*

// Self-contained internal metrics dashboard. No external assets — served on the
// private metrics port only. Polls /metrics.json and re-renders the tiles.
// Kept as a single string so the metrics listener has no static-file deps.

const PAGE = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Knickgeschichten · Metriken</title>
<style>
  :root {
    --green: #19421e;
    --green-soft: #2c5a33;
    --cream: #f4f1e8;
    --card: #fffdf7;
    --line: #d9d3c2;
    --muted: #7a7566;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--cream);
    color: var(--green);
    padding: 28px 20px 48px;
  }
  .wrap { max-width: 880px; margin: 0 auto; }
  header { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
  h1 { font-size: 22px; margin: 0; font-weight: 700; letter-spacing: -0.01em; }
  .updated { font-size: 12px; color: var(--muted); }
  .updated .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--green-soft); margin-right: 6px; vertical-align: middle; }
  .updated.stale .dot { background: #b23b3b; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 28px 0 12px; font-weight: 600; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
  .tile { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; }
  .tile .val { font-size: 30px; font-weight: 700; line-height: 1.1; font-variant-numeric: tabular-nums; }
  .tile .lbl { font-size: 12px; color: var(--muted); margin-top: 6px; }
  .tile.live .val { color: var(--green-soft); }
  footer { margin-top: 32px; font-size: 12px; color: var(--muted); }
  code { background: #ece7d8; padding: 1px 5px; border-radius: 4px; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>Knickgeschichten · Metriken</h1>
    <div class="updated" id="updated"><span class="dot"></span><span id="updated-text">lädt …</span></div>
  </header>

  <h2>Live</h2>
  <div class="grid" id="live"></div>

  <h2>Gesamt</h2>
  <div class="grid" id="cumulative"></div>

  <footer>
    Aggregiert & anonym — nur Zählwerte. Prometheus: <code>/metrics</code> · JSON: <code>/metrics.json</code>
  </footer>
</div>

<script>
  var LIVE = [
    ['onlineClients', 'online'],
    ['publicSessionsActive', 'öffentliche Sessions'],
    ['privateSessionsActive', 'private Sessions'],
    ['writersNow', 'schreiben gerade'],
  ];
  var CUM = [
    ['storiesCompleted', 'fertige Geschichten'],
    ['storiesInProgress', 'in Arbeit'],
    ['contributions', 'Beiträge'],
    ['wordsWritten', 'Wörter'],
    ['charsWritten', 'Zeichen'],
    ['avgContributionWords', 'Ø Wörter/Beitrag'],
    ['avgContributionChars', 'Ø Zeichen/Beitrag'],
    ['avgTurnSeconds', 'Ø Zug-Dauer (s, seit Neustart)'],
    ['likes', 'Likes'],
  ];

  function fmt(n) { return (n == null ? '–' : n.toLocaleString('de-DE')); }

  function tiles(el, defs, data, cls) {
    el.innerHTML = defs.map(function (d) {
      return '<div class="tile ' + (cls || '') + '">' +
             '<div class="val">' + fmt(data[d[0]]) + '</div>' +
             '<div class="lbl">' + d[1] + '</div></div>';
    }).join('');
  }

  function setUpdated(ok, iso) {
    var box = document.getElementById('updated');
    var txt = document.getElementById('updated-text');
    box.className = 'updated' + (ok ? '' : ' stale');
    if (ok) {
      var t = new Date(iso);
      txt.textContent = 'aktualisiert ' + t.toLocaleTimeString('de-DE');
    } else {
      txt.textContent = 'keine Verbindung';
    }
  }

  function refresh() {
    fetch('metrics.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (s) {
        tiles(document.getElementById('live'), LIVE, s.live, 'live');
        tiles(document.getElementById('cumulative'), CUM, s.cumulative);
        setUpdated(true, s.generatedAt);
      })
      .catch(function () { setUpdated(false); });
  }

  refresh();
  setInterval(refresh, 5000);
</script>
</body>
</html>`;

module.exports = { PAGE };

// Generates a short story title with a locally-run LLM (via Ollama).
//
// Runs entirely on our own server — no story text leaves the machine, so this
// adds no third-party data processor (relevant for GDPR).
//
// RAM budget: the box has 4 GB and the web server needs ~2 GB, so we must stay
// well under 2 GB. Titles are generated ONCE per finished story (a handful of
// times a day), so the model does not need to stay resident: `keep_alive: 0`
// tells Ollama to unload it immediately after the request. RAM is only used for
// the few seconds of generation. A ~1 GB model (qwen2.5:1.5b, Q4) leaves
// headroom; anything ~2 GB would sit exactly at the limit and risk an OOM if
// generation coincides with a traffic spike.

const Sanitize = require('./games/util/Sanitize');
const WordFilter = require('./games/util/WordFilter');

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:1.5b';
// Off by default: if Ollama isn't installed, nothing changes and stories keep
// their "Knickgeschichte N" title.
const ENABLED = process.env.AI_TITLES === '1';

// Generous: because keep_alive is 0 the model is reloaded from disk on every
// call (that is the price for not holding ~1 GB resident). Measured ~10-15 s on
// a fast laptop, so a modest CPU-only server needs plenty of room. Nothing is
// blocked while we wait — the story is already finished.
const TIMEOUT_MS = 60000;
const MAX_TITLE_LEN = 60;
// Only feed the model the beginning of the story — enough to get the gist,
// and keeps CPU time (and the KV cache) small on a modest server.
const MAX_INPUT_CHARS = 1500;

const SYSTEM = [
  'Du bist Lektor:in und gibst Kurzgeschichten einen Titel.',
  'Antworte AUSSCHLIESSLICH mit dem Titel — ohne Anführungszeichen,',
  'ohne Erklärung, ohne Punkt am Ende. Höchstens 6 Wörter, auf Deutsch.',
].join(' ');

// Strip the things small models like to add anyway: quotes, a "Titel:" prefix,
// trailing punctuation, extra lines.
function cleanTitle(raw) {
  let t = (raw || '').split('\n')[0].trim();
  t = t.replace(/^\s*(titel|title)\s*[:\-–]\s*/i, '');
  t = t.replace(/^["'„“”«»]+|["'„“”«»]+$/g, '');
  t = t.replace(/[.!?,;:]+$/, '');
  t = t.trim();
  return t;
}

async function ollamaTitle(storyText) {
  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `Gib dieser Geschichte einen Titel:\n\n${storyText}` },
      ],
      stream: false,
      // Unload the model right after this request — see the RAM note above.
      keep_alive: 0,
      options: { temperature: 0.8, num_predict: 24 },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${(await res.text()).slice(0, 120)}`);
  const data = await res.json();
  const content = data && data.message && data.message.content;
  if (typeof content !== 'string') throw new Error('unexpected Ollama response shape');
  return content;
}

module.exports = {
  enabled: () => ENABLED,

  // Returns a clean title string, or null if generation is disabled/failed/unusable.
  // Never throws — the caller must be able to fire-and-forget this.
  async generate(storyText) {
    if (!ENABLED) return null;

    const input = (storyText || '').trim().slice(0, MAX_INPUT_CHARS);
    if (input.length < 40) return null; // too little to title meaningfully

    try {
      const title = cleanTitle(await ollamaTitle(input));

      // The model is untrusted output: sanitize, censor slurs, bound the length.
      const safe = WordFilter.censor(Sanitize.str(title));
      if (!safe || safe.length > MAX_TITLE_LEN) return null;
      // Reject degenerate answers (model echoing the instruction, single char, etc.)
      if (safe.length < 3 || /^(titel|title|geschichte)$/i.test(safe)) return null;

      return safe;
    } catch (err) {
      console.log(new Date(), '!- AI title generation failed:', err.message);
      return null;
    }
  },
};

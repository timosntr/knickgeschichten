const _ = require('lodash');

const AI_NAMES = ['Aria', 'Felix', 'Mila', 'Leo', 'Nora', 'Max'];
const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 5000;

// Must match constants in core/games/story.js
const CONTEXT_LEN   = 1;
const CONTEXT_WORDS = 6;

const OLLAMA_HOST  = process.env.OLLAMA_HOST  || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

async function ollamaChat(messages) {
  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.message.content.trim();
}

class AiPlayer {
  constructor(lobby, index = 0) {
    this.lobby = lobby;
    this.playerId = _.uniqueId('ai_');
    this.name = AI_NAMES[index % AI_NAMES.length];
    this.game = null;
  }

  // Hook into the game's assignChain so we know when we get a turn
  attachToGame(game) {
    this.game = game;
    const self = this;
    const original = game.assignChain.bind(game);
    game.assignChain = function(pid, chain) {
      original(pid, chain);
      if (pid === self.playerId) {
        self._onAssigned(chain);
      }
    };
  }

  destroy() {
    this.game = null;
  }

  _onAssigned(chain) {
    const delay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
    setTimeout(() => this._generate(chain), delay);
  }

  async _generate(chain) {
    if (!this.game) return;

    // Verify we're still assigned (could have been timed out)
    const assignedChain = this.game.chains.find(s => s.editor === this.playerId);
    if (!assignedChain) return;

    // Use the same context a human player sees: last CONTEXT_LEN lines,
    // last line truncated to CONTEXT_WORDS words (matching getPlayerState in story.js)
    const rawLines = assignedChain.chain.slice(-CONTEXT_LEN);
    const context = rawLines.map((line, i, arr) => {
      if (i < arr.length - 1) return line;
      const words = line.trim().split(/\s+/);
      return words.length > CONTEXT_WORDS ? words.slice(-CONTEXT_WORDS).join(' ') : line;
    });

    const userMessage = context.length > 0
      ? `Continue the story with exactly one sentence (10 to 40 words). Output only the sentence — no quotes, no explanation.\n\nThe story so far ends with:\n${context.join('\n')}\n\nYour next line:`
      : `Write an interesting opening sentence for a collaborative story (10 to 40 words). Output only the sentence — no quotes, no explanation.`;

    let line;
    try {
      line = await ollamaChat([
        {
          role: 'system',
          content: 'You are a creative participant in a collaborative story-writing game. Write vivid, engaging sentences that flow naturally from what came before.',
        },
        { role: 'user', content: userMessage },
      ]);

      // Strip any surrounding quotes the model may add
      line = line.replace(/^["'„"«»]+|["'"»«]+$/g, '').trim();
    } catch (err) {
      console.error(new Date(), `-- [AI ${this.playerId}] Ollama error:`, err.message);
      line = 'The story continued in ways nobody could have predicted, leaving everyone speechless with anticipation.';
    }

    if (line.length > 512) line = line.slice(0, 512);

    // Submit — verify still assigned before writing
    if (this.game && this.game.chains.find(s => s.editor === this.playerId)) {
      console.log(new Date(), `-- [AI ${this.playerId} (${this.name})] submitting line`);
      this.game.handleMessage(this.playerId, 'story:line', line);
    }
  }
}

// Check if Ollama is reachable and the configured model is available.
// Sets AiPlayer.available (true/false) and logs the result.
// Call once on server startup.
AiPlayer.available = null;

AiPlayer.checkAvailability = async function() {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const models = (data.models || []).map(m => m.name);
    const modelFound = models.some(m => m === OLLAMA_MODEL || m.startsWith(`${OLLAMA_MODEL}:`));

    AiPlayer.available = true;

    if (modelFound) {
      console.log(new Date(), `-- [AI] Ollama ready — model "${OLLAMA_MODEL}" available. AI players enabled.`);
    } else {
      console.warn(new Date(), `-- [AI] Ollama reachable but model "${OLLAMA_MODEL}" not found.`);
      console.warn(new Date(), `-- [AI] Available models: ${models.join(', ') || '(none)'}. Run: ollama pull ${OLLAMA_MODEL}`);
    }
  } catch (err) {
    AiPlayer.available = false;
    console.warn(new Date(), `-- [AI] Ollama not reachable at ${OLLAMA_HOST} — AI players disabled. (${err.message})`);
  }

  return AiPlayer.available;
};

module.exports = AiPlayer;

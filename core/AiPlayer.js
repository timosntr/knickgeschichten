const Anthropic = require('@anthropic-ai/sdk');
const _ = require('lodash');

const AI_NAMES = ['Aria', 'Felix', 'Mila', 'Leo', 'Nora', 'Max'];
const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 5000;

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

    // Use last 3 lines as context
    const context = assignedChain.chain.slice(-3);

    let line;
    try {
      const client = new Anthropic();

      const prompt = context.length > 0
        ? `You are playing a collaborative story-writing game. Continue the story with exactly one sentence (10 to 40 words). Output only the sentence — no quotes, no explanation.\n\nPrevious line${context.length > 1 ? 's' : ''}:\n${context.join('\n')}\n\nYour next line:`
        : `You are playing a collaborative story-writing game. Write an interesting opening sentence for a story (10 to 40 words). Output only the sentence — no quotes, no explanation.`;

      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        messages: [{ role: 'user', content: prompt }],
      });

      line = msg.content[0].text.trim().replace(/^["']|["']$/g, '');
    } catch (err) {
      console.error(new Date(), `-- [AI ${this.playerId}] API error:`, err.message);
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

module.exports = AiPlayer;

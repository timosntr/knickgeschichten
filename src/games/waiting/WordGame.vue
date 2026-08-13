<template>
  <div class="wg">
    <div class="wg-board">
      <div v-for="(row, r) in rows" :key="r" class="wg-row">
        <div v-for="(cell, c) in row" :key="c" class="wg-cell" :class="cell.state">{{ cell.char }}</div>
      </div>
    </div>

    <div v-if="status !== 'playing'" class="wg-end">
      <span v-if="status === 'lost'" class="wg-reveal">Wort: {{ answerStr }}</span>
      <button type="button" class="wg-new" @click="newWord">neues Wort</button>
    </div>

    <div class="wg-keys">
      <div v-for="(krow, i) in keyRows" :key="i" class="wg-krow">
        <button v-for="k in krow" :key="k" type="button"
          class="wg-key" :class="[keyClass(k), { 'wg-key--wide': k === 'ENTER' || k === 'BACK' }]"
          @click="onKey(k)">
          <span v-if="k === 'BACK'">&#9003;</span>
          <span v-else-if="k === 'ENTER'">&#9166;</span>
          <span v-else>{{ k }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style>
.wg {
  margin: 14px auto 4px;
  max-width: 340px;
}
.wg-board {
  max-width: 296px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  /* Tighter between rows than within a row, so the six rows stay compact. */
  gap: 4px;
}
.wg-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
.wg-cell {
  aspect-ratio: 1;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-weight: 500;
  font-size: clamp(16px, 6vw, 22px);
  color: var(--kg-green);
  background: #fff;
  border: 1.5px solid #d8d5c8;
  text-transform: none;
}
.wg-cell.filled { border-color: var(--kg-green); }
.wg-cell.correct { background: var(--kg-green); color: var(--kg-cream); border-color: var(--kg-green); }
.wg-cell.present { background: #9a8b3a; color: #fff; border-color: #9a8b3a; }
.wg-cell.absent { background: #c8c5b7; color: #6a685e; border-color: #c8c5b7; }

.wg-end {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  margin: 12px 0 4px;
}
.wg-reveal {
  font-family: var(--font-sans);
  font-size: 12px;
  font-style: italic;
  color: var(--kg-muted);
}
.wg-new {
  appearance: none;
  border: none;
  cursor: pointer;
  background: var(--kg-green);
  color: var(--kg-cream);
  font-family: var(--font-sans);
  font-size: 12px;
  padding: 7px 20px;
  border-radius: 15px;
}
.wg-new:active { transform: scale(0.98); }

.wg-keys {
  margin: 12px auto 0;
  max-width: 340px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.wg-krow {
  display: flex;
  gap: 4px;
  justify-content: center;
}
.wg-key {
  flex: 1 1 0;
  min-width: 0;
  height: 42px;
  appearance: none;
  cursor: pointer;
  background: #fff;
  border: 1px solid #d0cdbf;
  border-radius: 5px;
  color: var(--kg-green);
  font-family: var(--font-sans);
  font-size: 13px;
  padding: 0;
}
.wg-key--wide { flex: 1.5 1 0; font-size: 15px; }
.wg-key:active { transform: scale(0.96); }
.wg-key.correct { background: var(--kg-green); color: var(--kg-cream); border-color: var(--kg-green); }
.wg-key.present { background: #9a8b3a; color: #fff; border-color: #9a8b3a; }
.wg-key.absent { background: #c8c5b7; color: #6a685e; border-color: #c8c5b7; }
</style>

<script>
import WORDS from './words';

const VALID = new Set(WORDS);
const ROWS = 6;
const LEN = 5;
const KEY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Z', 'U', 'I', 'O', 'P', 'Ü'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ö', 'Ä'],
  ['ENTER', 'Y', 'X', 'C', 'V', 'B', 'N', 'M', 'ß', 'BACK'],
];

// Uppercase a physical-keyboard char without turning ß into "SS".
function up(ch) {
  return ch === 'ß' ? 'ß' : ch.toUpperCase();
}

export default {
  props: {
    // Only react to the physical keyboard while the waiting screen is showing;
    // otherwise typing in the story textarea would drive the game too.
    active: { type: Boolean, default: true },
  },
  data() {
    return {
      answer: [],       // array of 5 chars
      guesses: [],      // array of scored rows: [{ char, state }]
      current: [],      // chars typed for the in-progress row
      status: 'playing',
      keyState: {},     // char -> 'correct' | 'present' | 'absent'
      recent: [],       // recently used answers, to avoid quick repeats
      keyRows: KEY_ROWS,
    };
  },
  computed: {
    answerStr() { return this.answer.join(''); },
    rows() {
      const out = [];
      for (let r = 0; r < ROWS; r++) {
        if (r < this.guesses.length) {
          out.push(this.guesses[r]);
        } else if (r === this.guesses.length && this.status === 'playing') {
          const row = [];
          for (let c = 0; c < LEN; c++)
            row.push({ char: this.current[c] || '', state: this.current[c] ? 'filled' : 'empty' });
          out.push(row);
        } else {
          out.push(Array.from({ length: LEN }, () => ({ char: '', state: 'empty' })));
        }
      }
      return out;
    },
  },
  methods: {
    newWord() {
      let word;
      do {
        word = WORDS[Math.floor(Math.random() * WORDS.length)];
      } while (WORDS.length > this.recent.length && this.recent.includes(word));
      this.recent.push(word);
      if (this.recent.length > 30) this.recent.shift();
      this.answer = [...word];
      this.guesses = [];
      this.current = [];
      this.keyState = {};
      this.status = 'playing';
    },
    onKey(k) {
      if (k === 'ENTER') this.submit();
      else if (k === 'BACK') this.current.pop();
      else if (this.status === 'playing' && this.current.length < LEN) this.current.push(k);
    },
    submit() {
      if (this.status !== 'playing' || this.current.length !== LEN) return;
      const guess = this.current.slice();
      if (!VALID.has(guess.join(''))) {
        this.$emit('invalid');
        return;
      }
      const scored = this.score(guess);
      this.guesses.push(scored);
      for (const cell of scored) {
        const prev = this.keyState[cell.char];
        if (cell.state === 'correct' || (cell.state === 'present' && prev !== 'correct')
          || (cell.state === 'absent' && !prev)) {
          this.$set(this.keyState, cell.char, cell.state);
        }
      }
      this.current = [];
      if (guess.join('') === this.answerStr) this.status = 'won';
      else if (this.guesses.length >= ROWS) this.status = 'lost';
    },
    // Wordle two-pass scoring so duplicate letters are coloured correctly.
    score(guess) {
      const res = guess.map(ch => ({ char: ch, state: 'absent' }));
      const remain = {};
      this.answer.forEach((ch, i) => {
        if (guess[i] === ch) res[i].state = 'correct';
        else remain[ch] = (remain[ch] || 0) + 1;
      });
      res.forEach(cell => {
        if (cell.state === 'correct') return;
        if (remain[cell.char] > 0) { cell.state = 'present'; remain[cell.char]--; }
      });
      return res;
    },
    keyClass(k) {
      if (k === 'ENTER' || k === 'BACK') return '';
      return this.keyState[k] || '';
    },
    onPhysical(e) {
      if (!this.active) return;
      if (e.key === 'Enter') { this.onKey('ENTER'); }
      else if (e.key === 'Backspace') { this.onKey('BACK'); }
      else if (/^[a-zA-ZäöüÄÖÜß]$/.test(e.key)) { this.onKey(up(e.key)); }
      else return;
      e.preventDefault();
    },
  },
  created() {
    this.newWord();
  },
  mounted() {
    window.addEventListener('keydown', this.onPhysical);
  },
  beforeDestroy() {
    window.removeEventListener('keydown', this.onPhysical);
  },
};
</script>

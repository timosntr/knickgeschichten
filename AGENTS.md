# AGENTS.md

Guidance for AI agents (and humans) working in this repo.

## What this is

**Knickgeschichten** — a collaborative, turn-based story-writing party game. Players
write a story one line at a time, seeing only minimal context (the previous line),
"Out of Context" / Consequences style. German rebrand and fork of
[Meshiest/outofcontext](https://github.com/Meshiest/outofcontext).

## ⚠️ Repo & contribution rules (read first)

- **Work in THIS repo: `timosntr/knickgeschichten`.** Do **not** use, target, or pull
  from the original upstream `Meshiest/outofcontext`. Upstream is the historical origin
  only — all current work lives here.
- **Do NOT create separate forks of this repo.** Push feature branches directly to
  `timosntr/knickgeschichten` and open PRs against `main` here.
- **Open a PR for every feature / change.** Don't commit straight to `main`. Branch,
  push, PR, let it be reviewed/merged.
- Branch naming: `feature/<short-name>` (existing convention: `feature/cleanup`,
  `feature/home-intro-text`, `feature/story-end-by-last-writer`).
- PR description: short **Summary** + a **Test plan** checklist. German or English both
  fine — match the area you're touching.
- End commit messages with a co-author trailer, e.g.
  `Co-Authored-By: <name> <email>`.

## Architecture

Two halves in one Node process: a socket.io backend and a Vue 2 SPA frontend, bundled
by webpack and served by Express.

### Backend (`main.js` + `core/`)

- **`main.js`** — entry point. Express static server + socket.io. Holds the big
  `io.on('connection', …)` block that wires every socket event to lobby/game logic.
  Also sets up `node-cron` jobs (lobby culling, persistence) and restores persisted
  async sessions on boot.
- **`core/Member.js`** — one connected client. Has `id`, `name` (`null` = no name yet,
  `''` = joined anonymously, otherwise a chosen name), `color`, activity timestamps,
  and a back-reference to its `lobby`.
- **`core/Lobby.js`** — a room, keyed by a 4-char `code`. Static `Lobby.lobbies` is the
  in-memory registry. Tracks `members`, `players`, `spectators`, the selected game,
  `gameConfig`, and the live `game` instance. Distinguishes **private** lobbies from
  **public async** sessions via `isAsync`. Handles join/leave, mid-game joins (async),
  and culling of empty lobbies.
- **`core/games/game.js`** — base `Game` class. Key lifecycle/IO hooks:
  `start()`, `stop()`, `pause()`, `save()`, `restore(blob)`, `handleMessage(pid, type,
  data)`, `getState()`, `getPlayerState(pid)`, `sendGameInfo()`, plus async helpers
  `addPlayer`, `detachPlayer`, and chain-release on disconnect.
- **`core/games/story.js`** — the only game ("Raconteur" / story). Manages per-story
  **chains** (`core/games/util/Chain.js`), whose turn it is (`editor`), turn timers /
  deadlines, word-count rules, and end conditions. Player input arrives through
  `handleMessage` as `story:*` messages.
- **`core/Persistence.js`** — snapshots lobbies to gzipped JSON under `persistence/`
  (~30-day expiry). Used to survive restarts; async sessions are persisted and restored.
- **`gameInfo.js`** — game metadata + the **config schema** (field name, type, defaults,
  min/max, options). Config fields can be marked `hidden: true` to keep them out of the
  UI while still applying server-side defaults.

### Frontend (`src/`)

- Vue 2 + `vue-router` + `vue-socket.io` + `semantic-ui-vue`. Entry `src/app.js`.
- **`src/pages/`** — routed views: `Home.vue`, `Lobby.vue`, `Sessions.vue` (public async
  list), `NotFound.vue`.
- **`src/games/Story.vue`** — the story game UI (writing/reading/waiting states).
- **`src/widgets/`** — reusable components: `Page.vue`, `Menu.vue`, `PlayerList.vue`,
  `Settings.vue`, `JoinLobby.vue`, `CreateAsyncModal.vue`, etc.

### Session modes

- **Private session** — created with a lobby `code` you share. Full player list, lobby
  code visible, full user-preferences UI, configurable.
- **Public async session** — auto-titled `Knickgeschichte N`, hardcoded config
  (1 story, 10 lines, 100 s turn limit), joinable mid-game, persisted, supports
  per-player anonymity. Minimal UI (dark-mode toggle only). No lobby code / player list.

## Conventions

- **Socket message names are `domain:action`** — e.g. `member:name`,
  `lobby:create:async`, `lobby:leave`, `story:line`, `story:skip`, `story:end`,
  `story:done`, `story:export`. Follow this when adding events.
- Game state flows one way: backend computes `getState()` / `getPlayerState(pid)` and
  pushes via `sendGameInfo()`; the frontend renders from `game` / `player` objects.
- Distinguish **member** (connected client) vs **player** (in the active game) vs
  **spectator**. New players can be promoted from members; async lobbies add players
  mid-game.
- `lodash` is imported as `_` everywhere.
- Sanitize all user text via `core/games/util/Sanitize.js`.
- New tunables that should be server-fixed go in `gameInfo.js` with `hidden: true`
  rather than being threaded through the UI.

## Local development

```bash
npm install
npm run dev      # webpack --watch + node main.js (concurrently)
```

- Open `http://localhost:8080`.
- Use lobby code **`devaaaa`** for development.
- Backend changes require a manual server restart (`Ctrl+C`, rerun `npm run dev`).

### Build / verify a change

- `npm run build` — production webpack build; use it to confirm `.vue` files compile.
- `node --check <file.js>` — quick syntax check for backend edits.
- There is no automated test suite yet; verify behaviour by running the app and
  exercising the affected flow (and note it in the PR test plan).

## Production (reference)

Dockerized (`Dockerfile`, `docker-compose.yml`, `nginx.conf`). Build with
`export MODE=production; npm run build`, then `docker-compose up -d`. See `README.md`
for the full deploy / update / LetsEncrypt steps. **Note:** `npm run update` restarts
the game container and kills running games.

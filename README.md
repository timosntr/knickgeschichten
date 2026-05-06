# Knickgeschichten

A fork of [Out Of Context Party Games](https://github.com/Meshiest/outofcontext) by Meshiest.

## Contribute

### Setup

1. Clone Repo
2. `npm install`

### Development

1. Run `npm run dev` to start the frontend watcher and backend in one terminal.
2. Restart the server manually when backend changes are made (`Ctrl+C`, then `npm run dev` again).
3. Use Lobby `devaaaa` for development
4. Open `localhost:8080` in browser

### Production

1. Setup your `docker-compose.yml`
2. Run `export MODE=production; npm run build` to build production frontend
3. `docker-compose up -d` to start containers
4. `git pull && npm i && npm run update` to update, will kill running games
5. `docker-compose kill && docker-compose rm -f` to stop containers
6. Setup nginx based on the `nginx.conf` (no ssl) or `nginx.letsencrypt.conf`

### LetsEncrypt

Follow nginx instructions on certbot

import Vue from 'vue'
import VueRouter from 'vue-router';
import SemanticUI from 'semantic-ui-vue';
import VueSocketIO from 'vue-socket.io'
import PortalVue from 'portal-vue';

import './style.css';
import '../res/favicon.ico';
import appleTouchIcon from '../res/apple-touch-icon.png';

// iOS home-screen icon (KG logo)
const appleIconLink = document.createElement('link');
appleIconLink.rel = 'apple-touch-icon';
appleIconLink.href = appleTouchIcon;
document.head.appendChild(appleIconLink);

const VERSION = require('../package.json').version;

Vue.prototype.rocketcrab = false;
Vue.prototype.bus = new Vue();

window.vibrate = arg =>
  window.navigator &&
  window.navigator.vibrate &&
  window.navigator.vibrate(arg);

// streamer mode (prevent lobby codes from being visible)
Vue.prototype.hideLobbyCode = localStorage.oocHideLobby === 'true';
Vue.prototype.setLobbyHidden = isHidden => {
  localStorage.oocHideLobby = Vue.prototype.hideLobbyCode = isHidden;
  Vue.prototype.bus.$emit('toggle-hide-lobby');
};


Vue.use(VueRouter);
Vue.use(PortalVue);
Vue.use(SemanticUI);
Vue.use(new VueSocketIO({
  connection: io(),
}));

const router = new VueRouter({
  mode: 'history',
  base: '/',
  routes: [
    { name: 'lobby', path: '/lobby/:code?' },
    { name: 'sessions', path: '/sessions' },
    { name: 'archive', path: '/archive' },
    { name: 'einladen', path: '/einladen/:code' },
    { name: 'impressum', path: '/impressum' },
    { name: 'datenschutz', path: '/datenschutz' },
    { name: 'home', path: '/' },
  ]
});

import './widgets';

import Home from './pages/Home.vue';
import Lobby from './pages/Lobby.vue';
import Sessions from './pages/Sessions.vue';
import Archive from './pages/Archive.vue';
import Einladen from './pages/Einladen.vue';
import Impressum from './pages/Impressum.vue';
import Datenschutz from './pages/Datenschutz.vue';
import NotFound from './pages/NotFound.vue';

import GameRenderer from './games/GameRenderer.vue';
Vue.component('ooc-game', GameRenderer);

new Vue({
  router,
  el: '#app',
  data() {
    return {
      connected: false,
      disconnected: false,
      playerId: undefined,
    };
  },
  created() {
    // rocketcrab query parsing
    let { rocketcrab, name, ishost } = this.$route.query;
    if (rocketcrab === 'true') {
      name = (name || '').replace(/[\u200B-\u200D\uFEFF\n\t]/g, '').trim();
      console.log('Hello', name, 'from rocketcrab!');
      Vue.prototype.rocketcrab = {
        name: !name ? 'Player' : name.length >= 16 ? name.slice(0, 15) : name,
        isHost: ishost === 'true',
      };
    }
  },
  sockets: {
    connect() {
      console.log('Connected');
      this.connected = true;
      this.disconnected = false;
    },
    'version': function(version) {
      if(version !== VERSION) {
        console.warn('Incompatible version. Server has', version + '. I have', VERSION);
        setTimeout(() => location.reload(), 2000);
      }
    },
    disconnect() {
      console.log('Disconnected');
      this.connected = false;
      this.disconnected = true;
    },
    'member:id': function(id) {
      this.playerId = id;
    }
  },
  render(h) {
    return h({
      home: Home,
      lobby: Lobby,
      sessions: Sessions,
      archive: Archive,
      einladen: Einladen,
      impressum: Impressum,
      datenschutz: Datenschutz,
    }[this.$route.name] || NotFound);
  }
});



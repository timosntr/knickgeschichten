<template>
  <div class="page">
    <header class="top-bar">
      <div class="top-bar-band">
        <div class="top-bar-inner">
          <router-link to="/" class="top-bar-logo">KG</router-link>
        </div>
      </div>
    </header>
    <div class="page-content">
      <slot></slot>
    </div>
    <footer class="page-legal">
      <router-link to="/impressum">Impressum</router-link>
      ·
      <router-link to="/datenschutz">Datenschutz</router-link>
    </footer>
    <!-- <ooc-settings></ooc-settings> -->
  </div>
</template>

<style>
body {
  height: 100vh;
  max-height: 100vh;
  position: relative;
  overflow-y: auto;
}

.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* full-bleed sheets use 100vw; clip the horizontal overflow.
     Use `clip` (not `hidden`): `hidden` would make .page a scroll container,
     which captures the sticky top-bar and prevents it from sticking to the
     body scroller. `clip` clips without establishing a scroll container. */
  overflow-x: clip;
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 100;
}

.top-bar-band {
  /* torn-paper strip with the ragged edge along the bottom */
  background: url('../assets/band-header.webp') no-repeat;
  background-size: 180% 140%;
  background-position-y: -20px;
  background-position-x: -50px;
}

.top-bar-inner {
  display: flex;
  align-items: flex-start;
  max-width: 360px;
  width: 100%;
  margin: 0 auto;
  padding: 14px 22px 30px;
}

.top-bar-logo {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -3px;
  color: var(--kg-green);
  text-decoration: none;
  line-height: 1;
}

.top-bar-logo:hover {
  color: var(--kg-green-hover);
}

.page-content {
  flex: 1;
}

.page-legal {
  text-align: center;
  padding: 14px 0 18px;
  font-size: 0.75em;
  color: #aaa;
}
.page-legal a {
  color: #999;
  text-decoration: none;
}
.page-legal a:hover {
  color: var(--kg-green);
  text-decoration: underline;
}
</style>

<script>
export default {};
</script>

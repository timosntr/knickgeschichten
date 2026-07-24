<template>
  <div class="page">
    <header class="top-bar">
      <div class="top-bar-band">
        <div class="top-bar-inner">
          <router-link to="/" class="top-bar-logo" aria-label="Knickgeschichten">
            <svg viewBox="0 0 210.76 208.84" xmlns="http://www.w3.org/2000/svg">
              <path d="M76.8,36.65v-1.3h-42.5v1.3h10.28v112h-10.28v1.27h42.5v-1.27h-10.28V36.65h10.28Z"/>
              <path d="M176.45,118.51v1.3h-9.58v52.08h-1.27l-16.53-8.01c-1.44,5.11-7.21,9.61-18.09,9.61-16.12,0-28.25-7.14-35.74-21.43-1.17-2.24-2.6-4.62-3.69-7.81-2.84-8.35-7.57-25.35-10.25-33.75-3.62-11.34-9.78-18.43-14.92-18.9l34.95-44.23c2.57-3.37,3.67-4.81,3.67-7.04,0-1.77-1.77-3.67-6.88-3.67h-7.38v-1.3h34.92v1.3h-1.9c-11.05,0-15.22,3.97-20.66,10.88l-23.1,29.64c4.04.83,10.69,10.2,11.08,15.76,5.31-25.81,20.83-37.22,45.5-37.22,8.35,0,11.05,1.9,16.83,1.9,1.14,0,2.57-.17,4.17-.63h2.24v29.64h-1.6c-1.77-16.83-6.58-29.64-21.8-29.64-18.09,0-24.84,9.98-24.84,52.28,0,8.61.33,16.06,1,22.47.97,9.28,2.64,23.03,5.01,28.21,3.74,8.25,9.21,11.78,16.42,11.78s13.32-4.47,13.95-9.15v-42.76h-14.56v-1.3h43.03Z"/>
            </svg>
          </router-link>
        </div>
      </div>
    </header>
    <div class="page-content">
      <slot></slot>
    </div>
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
  display: block;
  color: var(--kg-green);
  line-height: 1;
  transition: color 0.15s ease;
}

.top-bar-logo svg {
  display: block;
  width: 30px;
  height: 30px;
  fill: currentColor;
}

.top-bar-logo:hover {
  color: var(--kg-green-hover);
}

.page-content {
  flex: 1;
}
</style>

<script>
export default {};
</script>

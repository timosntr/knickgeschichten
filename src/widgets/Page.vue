<template>
  <div class="page">
    <header class="top-bar">
      <div class="top-bar-inner">
        <router-link to="/" class="top-bar-logo">KG</router-link>
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
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
  border-bottom: 1px solid rgba(34, 36, 38, 0.1);
}

.top-bar-inner {
  display: flex;
  align-items: center;
  max-width: 300px;
  width: 100%;
  margin: 0 auto;
  padding: 10px 4px;
}

.top-bar-logo {
  font-size: 1.2em;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #21ba45;
  text-decoration: none;
  line-height: 1;
}

.top-bar-logo:hover {
  color: #16a534;
}

.page-content {
  flex: 1;
}
</style>

<script>
export default {};
</script>

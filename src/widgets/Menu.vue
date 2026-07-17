<style>

.menu {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  margin: 0 auto;
  margin-bottom: 32px;
  padding: 4px;
  max-width: 360px;
  width: 100%;
  text-align: center;
}

.menu header {
  padding: 28px 16px 12px 16px;
}

.menu .subtitle {
  color: var(--kg-green);
  font-family: var(--font-sans);
  font-weight: 300;
  font-size: 15px;
  line-height: 1.5;
  opacity: 0.92;
}

.menu .title {
  font-family: var(--font-serif);
  font-weight: 700;
  color: var(--kg-green);
  /* Keep the title (incl. its number) on one line; scale down on narrow
     screens instead of breaking between the word and the number. */
  font-size: clamp(22px, 6.5vw, 32px);
  white-space: nowrap;
  letter-spacing: 0.3px;
  margin: 8px 0 12px;
}


</style>

<template>
  <div>
    <div class="menu">
      <header>
        <div class="title">
          {{title}}
        </div>
        <div class="subtitle">
          {{subtitle}}
        </div>
      </header>
      <div class="menu-items" :style="{textAlign: left ? 'left' : 'inherit'}">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: ['title', 'subtitle', 'left'],
};
</script>
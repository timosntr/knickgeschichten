<style>
.not-found-actions {
  text-align: center;
  margin-top: 8px;
}
.not-found-actions .write-btn { margin: 0 auto; }
</style>

<template>
  <ooc-page>
    <ooc-menu
      title="Seite nicht gefunden"
      subtitle="Diese Seite scheint es nicht zu geben.">
      <div class="not-found-actions">
        <router-link to="/" class="write-btn write-btn--solid">
          zur Startseite
        </router-link>
      </div>
    </ooc-menu>
  </ooc-page>
</template>

<script>
export default {};
</script>

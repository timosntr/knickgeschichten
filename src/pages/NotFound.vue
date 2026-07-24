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
      title="Page Not Found"
      subtitle="It appears this page does not exist!">
      <div class="not-found-actions">
        <router-link to="/" class="write-btn write-btn--solid">
          Home
        </router-link>
      </div>
    </ooc-menu>
  </ooc-page>
</template>

<script>
export default {};
</script>

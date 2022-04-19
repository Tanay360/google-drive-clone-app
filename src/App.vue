<script setup lang="ts">
  import { initializeApp } from 'firebase/app'
  import config from './firebase/config.json';
  initializeApp(config)
</script>

<template>
  <router-view></router-view>
</template>

<style>
  @import url('./assets/base.css');
</style>

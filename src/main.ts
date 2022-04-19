import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import VueFileToolbarMenu from 'vue-file-toolbar-menu'
import './index.css';
import VWave from 'v-wave'
import { createPinia } from 'pinia'
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";
import Popper from 'vue3-popper';
import 'vue-universal-modal/dist/index.css'
import VueUniversalModal from 'vue-universal-modal'

createApp(App)
  .use(router)
  .use(VWave)
  .use(Toast)
  .use(VueUniversalModal, {
    teleportTarget: '#modals'
  })
  .use(createPinia())
  .component('vue-file-toolbar-menu', VueFileToolbarMenu)
  .component('v-tooltip', Popper)
  .mount('#app')

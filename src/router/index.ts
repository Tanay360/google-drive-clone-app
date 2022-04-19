import { nextTick } from "vue";
import { createWebHistory, createRouter } from "vue-router";
import HomeView from "../views/HomeView.vue";
import LoginView from '../views/LoginView.vue';
import NotFound from '../views/404.vue'

const routes = [
  {
    path: "/",
    name: "Home",
    component: HomeView,
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: {
      title: 'Login to Google Drive Clone'
    }
  },
  {
    path: '*',
    name: '404',
    component: NotFound,
    meta: {
      title: '404 Not found'
    }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

const DEFAULT_TITLE = 'Google Drive Clone';

router.afterEach((to, _) => {
  nextTick(() => {
    document.title = to.meta.title as string || DEFAULT_TITLE
  })
})

export default router;

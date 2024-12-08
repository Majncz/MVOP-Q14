import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/TimelineView.vue'),
    },
    {
      path: '/liked',
      name: 'liked',
      component: () => import('../views/LikedView.vue'),
    },
  ],
})

export default router

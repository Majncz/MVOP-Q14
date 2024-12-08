<template>
  <aside class="app-aside admin-aside">
    <h1 class="admin-title">Postify</h1>
    <div>
      <p>Logged in as {{ user?.username }}</p>
      <button @click="showPostModal = true" class="admin-button secondary mt-4">
        Create post
        <Plus size="16" />
      </button>
    </div>
    <button v-if="globalStore.token" class="admin-button secondary" @click="globalStore.logout">
      Logout
      <LogOut size="16" />
    </button>
  </aside>
  <main class="admin-main">
    <div class="admin-section">
      <header class="admin-horizontal-nav">
        <TabMenu :links="links" />
      </header>
      <router-view v-slot="{ Component }">
        <transition :name="transitionDirection" mode="out-in">
          <component :is="Component"></component>
        </transition>
      </router-view>
    </div>
  </main>
  <LoginModal v-if="globalStore.loginModal" />
  <PostModal v-if="showPostModal" @close="showPostModal = false" />
</template>

<script setup>
import axios from 'axios';
import { ref, onMounted } from 'vue';
import { useGlobalStore } from './stores/global';
import { useRoute } from 'vue-router';
import router from '@/router';
import LoginModal from '@/components/ui/loginModal.vue';
import PostModal from '@/components/postModal.vue';
import TabMenu from '@/components/ui/tabMenu.vue';
import { LogOut, Plus } from 'lucide-vue-next';
import { usePostsStore } from '@/stores/posts';

const route = useRoute();
const globalStore = useGlobalStore();
const postsStore = usePostsStore();
const user = ref(null);
const showPostModal = ref(false);

const links = ref([{
  name: 'Timeline',
  path: '/',
}, {
  name: 'Liked posts',
  path: '/liked',
},
]);

const transitionDirection = ref('slide-right');

router.beforeEach((to, from, next) => {
  const currentPathIndex = links.value.findIndex(link => link.path === to.path);
  const previousPathIndex = links.value.findIndex(link => link.path === from.path);

  if (currentPathIndex !== previousPathIndex) {
    transitionDirection.value = currentPathIndex > previousPathIndex ? 'slide-right' : 'slide-left';
  }
  next();
});

onMounted(async () => {
  const response = await axios.get('/user');
  user.value = response.data;
});
</script>

<style lang="scss" scoped></style>
<template>
  <div class="flex flex-col gap-4">
    <div v-for="post in postsStore.posts" :key="post.id" class="admin-card w-[40rem]">
      <h3 class="admin-small-title expandable">{{ post.title }}</h3>
      <p class="admin-card-content">{{ post.content }}</p>
      <button class="absolute top-6 right-6" @click="postsStore.likePost(post._id)">
        <Heart size="24" :fill="postsStore.likedPosts.filter(p => p._id === post._id).length > 0 ? 'red' : 'none'"
          :color="postsStore.likedPosts.filter(p => p._id === post._id).length > 0 ? 'red' : 'black'" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { usePostsStore } from '@/stores/posts';
import { Heart } from 'lucide-vue-next';

const postsStore = usePostsStore()
</script>

<style lang="scss" scoped></style>
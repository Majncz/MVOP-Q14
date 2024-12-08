import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

export const usePostsStore = defineStore('posts', () => {
    const posts = ref([]);
    const likedPosts = ref([]);

    async function fetchPosts() {
        const response = await axios.get('/posts');
        posts.value = response.data;

        const likedResponse = await axios.get('/posts/liked');
        likedPosts.value = likedResponse.data;
        console.log(likedPosts.value);
    }
    fetchPosts();

    async function likePost(id) {
        const response = await axios.patch(`/posts/${id}/like`, { like: likedPosts.value.filter(p => p._id === id).length === 0 });
        fetchPosts();
    }

    return {
        posts,
        likedPosts,
        likePost
    }
})
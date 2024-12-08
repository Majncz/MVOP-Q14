<template>
    <div class="admin-login-modal">
        <div v-click-outside="() => emit('close')">
            <h1>Create new post</h1>
            <p>Please enter the title and content of the post.</p>
            <div>
                <div class="admin-login-modal-input-container">
                    <input class="admin-input" type="text" v-model="title" placeholder="Title" />
                    <textarea class="admin-textarea" type="text" v-model="content" placeholder="Content"></textarea>
                </div>
                <InlineError v-if="errorMessage !== null" :error="errorMessage" />
            </div>
            <button class="admin-button" :disabled="submitDisabled" @click="handleSubmit">Create post</button>
        </div>
    </div>
</template>

<script setup>
import InlineError from '@/components/ui/inlineError.vue';
import { ref, computed } from 'vue';
import axios from 'axios';
import { useGlobalStore } from '@/stores/global';
import { usePostsStore } from '@/stores/posts';

const globalStore = useGlobalStore();
const postsStore = usePostsStore();

const title = ref('');
const content = ref('');
const errorMessage = ref(null);
const submitDisabled = computed(() => title.value === '' || content.value === '');

const emit = defineEmits(['close']);

async function handleSubmit() {
    const response = await axios.post('/posts', { title: title.value, content: content.value });
    postsStore.posts = [response.data, ...postsStore.posts];
    emit('close');
}
</script>

<style lang="scss" scoped></style>
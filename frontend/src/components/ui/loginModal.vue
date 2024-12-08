<template>
    <div class="admin-login-modal">
        <div>
            <h1>{{ modes[mode].title }}</h1>
            <p>{{ modes[mode].smallText }}</p>
            <div>
                <div class="admin-login-modal-input-container">
                    <input class="admin-input" type="text" v-model="username" placeholder="Username" />
                    <input class="admin-input" type="password" id="password" v-model="password"
                        placeholder="SuperSecretPassword987" @input="errorMessage = null" @keyup.enter="login" />
                </div>
                <InlineError v-if="errorMessage !== null" :error="errorMessage" />
            </div>
            <div>
                <button class="admin-text-button" @click="mode = mode === 'login' ? 'register' : 'login'">{{ mode ===
                    'login' ? 'Register' : 'Login'
                    }}</button>
                <button class="admin-button" @click="handleSubmit">{{ modes[mode].button }}</button>
            </div>
            <div class="flex gap-2">
                <p>API:</p>
                <select class="admin-select" v-model="globalStore.apiUrl">
                    <option v-for="api in globalStore.apiUrls" :key="api.url" :value="api.url">{{ api.name }}</option>
                </select>
            </div>
        </div>
    </div>
</template>

<script setup>
import InlineError from '@/components/ui/inlineError.vue';
import { ref } from 'vue';
import axios from 'axios';
import { useGlobalStore } from '@/stores/global';

const globalStore = useGlobalStore();

const password = ref('');
const username = ref('');
const errorMessage = ref(null);
const mode = ref("login");

const modes = ref({
    login: {
        title: 'Login',
        smallText: 'Please enter your password to login.',
        button: 'Login'
    },
    register: {
        title: 'Register',
        smallText: 'Please enter your username and password to register.',
        button: 'Create account'
    }
});

function handleSubmit() {
    if (mode.value === 'login') {
        login();
    } else {
        register();
    }
}

async function login() {
    try {
        const response = await axios.post('/login', { password: password.value, username: username.value });
        globalStore.setToken(response.data.token);
    } catch (error) {
        errorMessage.value = error.response.data.error || 'Something went wrong';
    }
}

async function register() {
    try {
        const response = await axios.post('/register', { password: password.value, username: username.value });
        globalStore.setToken(response.data.token);
    } catch (error) {
        errorMessage.value = error.response.data.error || 'Something went wrong';
    }
}
</script>

<style lang="scss" scoped></style>
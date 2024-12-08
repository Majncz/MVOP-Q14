import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import axios from 'axios'

export const useGlobalStore = defineStore('global', () => {
    const apiUrls = ref([
        { name: "Prisma", url: "http://localhost:3000" },
        { name: "SQL", url: "http://localhost:3001" },
        { name: "MongoDB", url: "http://localhost:3002" }
    ]);

    const apiUrl = ref(localStorage.getItem('apiUrl') || apiUrls.value[0].url);
    const loginModal = ref(false);
    const token = ref(localStorage.getItem('authToken'));

    watch(apiUrl, (newUrl) => {
        localStorage.setItem('apiUrl', newUrl);
        axios.defaults.baseURL = newUrl;
    });

    if (!localStorage.getItem('authToken')) {
        loginModal.value = true;
    }

    function setToken(token) {
        localStorage.setItem('authToken', token);
        window.location.reload();
    }

    function logout() {
        localStorage.removeItem('authToken');
        window.location.reload();
    }

    return {
        apiUrl,
        token,
        loginModal,
        setToken,
        logout,
        apiUrls
    }
})
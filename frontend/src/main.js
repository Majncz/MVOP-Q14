import './assets/main.scss'
import './assets/administration.scss'
import clickOutside from './directives/clickOutside';

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import axios from 'axios';
import { useGlobalStore } from "@/stores/global.js";

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

axios.defaults.baseURL = useGlobalStore().apiUrl;
axios.defaults.headers.common['authorization'] = `${useGlobalStore().token}`;
axios.interceptors.response.use(
    response => {
        // Normal response processing
        return response;
    },
    error => {
        // Check for a 401 status and specific message
        if (error.response && error.response.status === 401 && error.response.data.error === "Invalid token") {
            // Redirect to /signin
            useGlobalStore().loginModal = true;
        }
        // Log the error and reject the promise to propagate the error
        console.error('An error occurred:', error.response.data.error);
        return Promise.reject(error);
    }
);

app.directive('click-outside', clickOutside);

app.mount('#app')
<template>
    <nav ref="navRef">
        <router-link v-for="link in links" :to="link.path" :key="link.path"
            :class="{ selected: $route.path === link.path }" @click="handleClick($event)">{{ link.name }}</router-link>
    </nav>
</template>

<script setup>
import { useRoute } from 'vue-router';
import { watch, ref, onMounted } from 'vue';

const route = useRoute();

const props = defineProps({
    links: {
        type: Array,
        required: true,
    },
});

const navRef = ref(null);

function handleClick(event) {
    const target = event.target;
    if (navRef.value && target) {
        const targetLeft = target.getBoundingClientRect().left;
        const targetWidth = target.getBoundingClientRect().width;
        const navLeft = navRef.value.getBoundingClientRect().left;
        const left = targetLeft - navLeft;
        navRef.value.style.setProperty('--before-left', `${left}px`);
        navRef.value.style.setProperty('--before-width', `${targetWidth}px`);
    }
}

onMounted(() => {
    // Set initial position based on the current route
    const initialLink = navRef.value.querySelector('.selected');
    if (initialLink) {
        handleClick({ target: initialLink });
    }
});
</script>

<style lang="scss" scoped></style>
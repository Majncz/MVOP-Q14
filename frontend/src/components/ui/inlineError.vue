<template>
    <div class="flex items-center gap-2 mt-3 text-red-500">
        <CircleAlert size="20" />
        <p class="text-sm">{{ error }}</p>
    </div>
</template>

<script setup>
import { CircleAlert } from 'lucide-vue-next';

defineProps({
    error: {
        type: String,
        required: true,
    },
});
</script>

<style lang="scss" scoped></style>
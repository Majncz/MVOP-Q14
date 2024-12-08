export default {
    beforeMount(el, binding) {
        el.clickOutsideEvent = function (event) {
            // Skip if the click event happened too soon after mounting
            if (el.justMounted) return;

            const path = event.composedPath();
            if (!path.includes(el)) {
                binding.value(event);
            }
        };

        // Set a flag to ignore immediate clicks
        el.justMounted = true;
        setTimeout(() => {
            el.justMounted = false;
        }, 100);

        document.addEventListener('click', el.clickOutsideEvent);
    },
    unmounted(el) {
        document.removeEventListener('click', el.clickOutsideEvent);
    },
};
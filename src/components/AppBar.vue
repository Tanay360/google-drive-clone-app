<script>
    export default {
        
    }
</script>

<template>
    <div class="app-bar-container w-full">
        <div class="app-bar">
            <slot/>
        </div> 
        <div class="divider"></div>
    </div>
    
</template>

<style>
    slot {
        width: 100%;
    }
    .app-bar {
        width: 100%;
        padding: 1rem;
        background: #1e1e1e;
    }

    .divider {
        width: 100%;
        height: 1px;
        background: rgb(67, 67, 67);
    }
</style>
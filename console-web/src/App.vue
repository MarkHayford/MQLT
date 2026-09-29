<template>
        <PageLogin v-if="view==='login'" />
        <PageGate v-else-if="view==='gate'" />
        <PageShell v-else />
</template>

<script setup>
import { provide, defineAsyncComponent } from "vue"
import { useConsoleState } from "./state/useConsole.js"
import PageLogin from "./pages/login.vue"
import PageGate from "./pages/gate.vue"

const PageShell = defineAsyncComponent(() => import("./pages/shell.vue"))

const consoleState = useConsoleState()
provide("console", consoleState)
const { view } = consoleState
</script>

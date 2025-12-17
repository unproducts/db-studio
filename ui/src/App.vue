<script setup lang="ts">
import { ref, onBeforeMount } from 'vue';
import useDBStudio from './composables/useDBStudio';
import TableList from './components/TableList.vue';
import DataTable from './components/DataTable.vue';

const { listTables } = useDBStudio();

const tables = ref<string[]>([]);
const selectedTable = ref<string>();
const loading = ref(true);

onBeforeMount(async () => {
  const result = await listTables();
  tables.value = result.tables;
  if (result.tables.length) selectedTable.value = result.tables[0];
  loading.value = false;
});
</script>

<template>
  <div class="h-screen flex flex-col font-sans antialiased text-neutral-900">
    <!-- Header -->
    <header class="h-12 border-b border-neutral-200 px-4 flex items-center gap-2 shrink-0">
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" /><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </svg>
      <span class="font-semibold text-sm">DB Studio</span>
    </header>

    <!-- Main -->
    <div class="flex flex-1 min-h-0">
      <div v-if="loading" class="flex-1 flex items-center justify-center text-neutral-400">Loading...</div>
      <template v-else>
        <TableList :tables="tables" :selected="selectedTable" @select="selectedTable = $event" />
        <DataTable :table="selectedTable" />
      </template>
    </div>
  </div>
</template>

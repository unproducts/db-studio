<script setup lang="ts">
defineProps<{ tables: string[]; selected?: string }>();
defineEmits<{ select: [table: string] }>();
</script>

<template>
  <aside class="w-56 border-r border-neutral-200 bg-neutral-50 p-3 flex flex-col gap-1">
    <div class="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2 px-2">Tables</div>
    <button
      v-for="table in tables"
      :key="table"
      @click="$emit('select', table)"
      class="text-left px-3 py-1.5 rounded text-sm transition-colors"
      :class="selected === table ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-200 text-neutral-700'"
    >
      {{ table }}
    </button>
    <div v-if="!tables.length" class="text-sm text-neutral-400 px-2">No tables found</div>
  </aside>
</template>

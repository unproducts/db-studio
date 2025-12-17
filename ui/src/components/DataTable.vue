<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import useDBStudio from '../composables/useDBStudio';

const props = defineProps<{ table?: string }>();
const db = useDBStudio();

// SQL query state
const sql = ref('');
const rows = ref<Record<string, unknown>[]>([]);
const columns = ref<string[]>([]);
const loading = ref(false);
const status = ref<{ type: 'success' | 'error'; message: string } | null>(null);

// Table schema state
const schema = ref<{ name: string; type: string; nullable: boolean }[]>([]);
const schemaLoading = ref(false);

// Pagination state
const page = ref(1);
const pageSize = ref(50);
const totalRows = ref(0);
const isBrowsingTable = ref(false); // Track if we're browsing a table vs custom query

// Computed pagination info
const totalPages = computed(() => Math.ceil(totalRows.value / pageSize.value));
const startRow = computed(() => (page.value - 1) * pageSize.value + 1);
const endRow = computed(() => Math.min(page.value * pageSize.value, totalRows.value));
const hasPagination = computed(() => isBrowsingTable.value && totalRows.value > pageSize.value);

// Load table schema
async function loadSchema(table: string) {
  if (!table) return;
  schemaLoading.value = true;
  try {
    const result = await db.getTableInfo(table);
    schema.value = result.columns;
  } catch (error: any) {
    console.error('Failed to load schema:', error);
    schema.value = [];
  } finally {
    schemaLoading.value = false;
  }
}

// Auto-execute query when table is selected
watch(() => props.table, async (table) => {
  if (table) {
    await loadSchema(table);
    sql.value = `SELECT * FROM "${table}" LIMIT ${pageSize.value} OFFSET 0`;
    page.value = 1;
    isBrowsingTable.value = true;
    await execute();
  } else {
    sql.value = '';
    rows.value = [];
    columns.value = [];
    schema.value = [];
    status.value = null;
    isBrowsingTable.value = false;
    totalRows.value = 0;
  }
}, { immediate: true });

// Execute SQL query
async function execute() {
  if (!sql.value.trim()) return;
  loading.value = true;
  status.value = null;
  
  // Check if this is a browse query (auto-generated SELECT * FROM table)
  const isBrowseQuery = props.table && 
    sql.value.trim().toUpperCase().replace(/\s+/g, ' ').startsWith(`SELECT * FROM "${props.table}"`);
  
  // If user manually edited the query, disable browse mode
  if (!isBrowseQuery) {
    isBrowsingTable.value = false;
  }
  
  try {
    const result = await db.query(sql.value);
    rows.value = result.rows;
    // Extract columns from first row, or use empty array if no rows
    columns.value = result.rows.length > 0 ? Object.keys(result.rows[0]) : [];
    
    // Get total count for pagination if browsing a table
    if (isBrowsingTable.value && props.table) {
      try {
        const countResult = await db.query(`SELECT COUNT(*) as count FROM "${props.table}"`);
        totalRows.value = (countResult.rows[0]?.count as number) || result.rows.length;
      } catch {
        // If count fails, just use the result length
        totalRows.value = result.rows.length;
      }
    } else {
      totalRows.value = result.rows.length;
    }
    
    status.value = { 
      type: 'success', 
      message: `✓ Executed successfully. ${result.rows.length} row${result.rows.length !== 1 ? 's' : ''} returned` 
    };
  } catch (error: any) {
    status.value = { type: 'error', message: `✗ Error: ${error?.message || String(error)}` };
    rows.value = [];
    columns.value = [];
    totalRows.value = 0;
  } finally {
    loading.value = false;
  }
}

// Pagination functions
async function goToPage(newPage: number) {
  if (newPage < 1 || newPage > totalPages.value || !props.table) return;
  page.value = newPage;
  const offset = (newPage - 1) * pageSize.value;
  sql.value = `SELECT * FROM "${props.table}" LIMIT ${pageSize.value} OFFSET ${offset}`;
  await execute();
}

function nextPage() {
  if (page.value < totalPages.value) {
    goToPage(page.value + 1);
  }
}

function prevPage() {
  if (page.value > 1) {
    goToPage(page.value - 1);
  }
}

// Better data formatting
function formatValue(val: unknown): string {
  if (val === null) return 'NULL';
  if (val === undefined) return '';
  
  if (typeof val === 'boolean') {
    return val ? 'true' : 'false';
  }
  
  if (typeof val === 'number') {
    return val.toLocaleString();
  }
  
  if (typeof val === 'string') {
    // Check if it's a date string
    const dateMatch = val.match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/);
    if (dateMatch) {
      try {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString();
        }
      } catch {
        // Not a valid date, continue
      }
    }
    return val;
  }
  
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  }
  
  return String(val);
}

function getValueClass(val: unknown): string {
  if (val === null) return 'text-neutral-400 italic';
  if (typeof val === 'number') return 'text-blue-600 font-mono';
  if (typeof val === 'boolean') return 'text-purple-600';
  return 'text-neutral-900';
}
</script>

<template>
  <div class="flex-1 flex flex-col min-w-0 bg-white">
    <!-- Table Schema Display -->
    <div v-if="props.table && schema.length > 0" class="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
      <div class="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Schema: {{ props.table }}</div>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="col in schema"
          :key="col.name"
          class="text-xs px-2 py-1 bg-white border border-neutral-200 rounded"
        >
          <span class="font-mono font-semibold text-neutral-900">{{ col.name }}</span>
          <span class="text-neutral-500 mx-1">•</span>
          <span class="text-neutral-600">{{ col.type }}</span>
          <span class="text-neutral-500 mx-1">•</span>
          <span :class="col.nullable ? 'text-green-600' : 'text-red-600'">
            {{ col.nullable ? 'NULL' : 'NOT NULL' }}
          </span>
        </div>
      </div>
    </div>

    <!-- SQL Input -->
    <div class="border-b border-neutral-200 p-4">
      <div class="flex gap-2">
        <input
          v-model="sql"
          @keydown.ctrl.enter.prevent="execute"
          @keydown.meta.enter.prevent="execute"
          class="flex-1 text-sm font-mono border border-neutral-300 rounded px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-neutral-400"
          rows="3"
          placeholder="Enter SQL query... (Ctrl/Cmd+Enter to execute)"
        />
        <button
          @click="execute"
          :disabled="loading || !sql.trim()"
          class="px-4 py-2 text-sm bg-neutral-900 text-white rounded hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed h-fit"
        >
          Execute
        </button>
      </div>
      <div v-if="status" class="mt-2 text-sm" :class="status.type === 'success' ? 'text-green-600' : 'text-red-600'">
        {{ status.message }}
      </div>
    </div>

    <!-- Pagination Controls (only for table browsing) -->
    <div v-if="hasPagination && !loading" class="border-b border-neutral-200 px-4 py-2 bg-neutral-50 flex items-center justify-between text-sm">
      <div class="text-neutral-600">
        Showing {{ startRow }}–{{ endRow }} of {{ totalRows }} rows
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="prevPage"
          :disabled="page === 1"
          class="px-3 py-1 border border-neutral-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span class="text-neutral-600">
          Page {{ page }} of {{ totalPages }}
        </span>
        <button
          @click="nextPage"
          :disabled="page === totalPages"
          class="px-3 py-1 border border-neutral-300 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>

    <!-- Results Table -->
    <div class="flex-1 overflow-auto">
      <div class="overflow-x-auto min-w-full">
        <table class="w-full text-sm border-collapse">
          <thead class="bg-neutral-50 sticky top-0 z-10">
            <tr>
              <th
                v-for="col in columns"
                :key="col"
                class="text-left px-4 py-2 font-medium text-neutral-600 border-b border-neutral-200 whitespace-nowrap min-w-[120px]"
              >
                {{ col }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td :colspan="columns.length || 1" class="px-4 py-12 text-center text-neutral-400">
                <div class="flex flex-col items-center gap-2">
                  <svg class="animate-spin h-5 w-5 text-neutral-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Executing query...</span>
                </div>
              </td>
            </tr>
            <tr v-else-if="!rows.length">
              <td :colspan="columns.length || 1" class="px-4 py-12 text-center text-neutral-400">
                <div class="flex flex-col items-center gap-2">
                  <svg class="h-8 w-8 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                  </svg>
                  <span class="text-sm">No results found</span>
                  <span v-if="status?.type === 'success'" class="text-xs text-neutral-500">Query executed successfully but returned no rows</span>
                </div>
              </td>
            </tr>
            <tr
              v-for="(row, i) in rows"
              :key="i"
              class="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
            >
              <td 
                v-for="col in columns" 
                :key="col" 
                class="px-4 py-2 whitespace-nowrap"
                :class="getValueClass(row[col])"
                :title="formatValue(row[col])"
              >
                <div class="max-w-md truncate">
                  {{ formatValue(row[col]) }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

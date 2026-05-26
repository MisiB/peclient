<template>
  <div>
    <button class="btn btn-outline btn-sm" @click="openModal">
      <Icon name="lucide:upload" />
      <span class="hidden md:block">Import Items</span>
    </button>

    <dialog id="import_apitem_modal" class="modal">
      <div class="modal-box max-w-2xl">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold">Import Plan Items</h3>
          <button class="btn btn-ghost btn-circle" :disabled="isPolling" @click="closeModal">
            <Icon name="lucide:x" />
          </button>
        </div>

        <p class="mt-2 text-sm text-base-content/60">
          Upload an Excel (.xlsx, .xls) or CSV file. The first row must be the header.
          Large files are processed in the background — you can leave this dialog open to watch progress.
        </p>

        <button
          type="button"
          class="link link-primary mt-2 inline-flex items-center gap-1 text-sm disabled:opacity-50"
          :disabled="downloadingTemplate"
          @click="downloadTemplate"
        >
          <Icon name="lucide:download" />
          {{ downloadingTemplate ? 'Preparing template...' : 'Download Excel template (with dropdowns)' }}
        </button>

        <!-- Upload form -->
        <div v-if="!current" class="mt-4 flex flex-col gap-3">
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx,.xls,.csv,.txt"
            class="file-input file-input-bordered w-full"
            @change="onFileChange"
          />
          <div class="modal-action">
            <button class="btn" type="button" @click="closeModal">Close</button>
            <button
              class="btn btn-primary"
              :disabled="!file || uploading"
              @click="upload"
            >
              <span v-if="uploading">Uploading...</span>
              <span v-else>Upload &amp; Import</span>
            </button>
          </div>
        </div>

        <!-- Status / Progress -->
        <div v-else class="mt-4">
          <div class="flex items-center justify-between">
            <div class="font-semibold">{{ current.original_filename }}</div>
            <span :class="['badge', statusBadge(current.status)]">{{ current.status }}</span>
          </div>

          <div class="mt-3">
            <progress
              v-if="current.total_rows"
              class="progress progress-primary w-full"
              :value="current.processed_rows ?? 0"
              :max="current.total_rows"
            ></progress>
            <progress v-else class="progress progress-primary w-full"></progress>

            <div class="mt-1 flex justify-between text-xs text-base-content/60">
              <span>
                {{ current.processed_rows ?? 0 }}<template v-if="current.total_rows"> / {{ current.total_rows }}</template> rows
              </span>
              <span>
                Inserted {{ current.inserted ?? 0 }} · Skipped {{ current.skipped ?? 0 }}
              </span>
            </div>
          </div>

          <div v-if="current.failure_reason" role="alert" class="alert alert-error mt-3 text-sm">
            <Icon name="lucide:alert-circle" />
            <span>{{ current.failure_reason }}</span>
          </div>

          <div v-if="current.errors?.length" class="mt-3">
            <div class="text-sm font-semibold">First {{ current.errors.length }} row error{{ current.errors.length === 1 ? '' : 's' }}:</div>
            <ul class="mt-1 max-h-48 overflow-auto rounded border border-base-200 bg-base-100 p-2 text-xs">
              <li v-for="(e, i) in current.errors" :key="i" class="font-mono">{{ e }}</li>
            </ul>
          </div>

          <div class="modal-action">
            <button class="btn" type="button" :disabled="isPolling" @click="closeModal">
              {{ isTerminal ? 'Done' : 'Hide' }}
            </button>
            <button
              v-if="isTerminal"
              class="btn btn-primary"
              type="button"
              @click="startNew"
            >
              Import Another
            </button>
          </div>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
});

const store = useAnnualprocurementplanStore();

const fileInput = ref(null);
const file = ref(null);
const uploading = ref(false);
const current = ref(null);
const downloadingTemplate = ref(false);
let pollHandle = null;

const client = usePeClient();
const toast = useToast();

const downloadTemplate = async () => {
  if (downloadingTemplate.value) return;
  downloadingTemplate.value = true;
  try {
    const blob = await client('/api/v1/annual-procurement-plans/items/template', {
      method: 'GET',
      responseType: 'blob',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annualprocurementplan_items_template.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast.error({
      title: 'Download failed',
      message: err?.data?.message || 'Could not download the template.',
      position: 'topRight',
      layout: 2,
    });
  } finally {
    downloadingTemplate.value = false;
  }
};

const isTerminal = computed(() =>
  current.value?.status === 'COMPLETED' || current.value?.status === 'FAILED',
);

const isPolling = computed(() =>
  current.value && !isTerminal.value,
);

const openModal = () => {
  document.getElementById('import_apitem_modal').showModal();
};

const closeModal = () => {
  document.getElementById('import_apitem_modal').close();
  stopPolling();
  current.value = null;
  file.value = null;
  if (fileInput.value) fileInput.value.value = '';
};

const onFileChange = (event) => {
  file.value = event.target.files?.[0] ?? null;
};

const upload = async () => {
  if (!file.value) return;
  uploading.value = true;
  try {
    const importRecord = await store.beginImport(props.planUuid, file.value);
    if (importRecord) {
      current.value = importRecord;
      startPolling();
    }
  } finally {
    uploading.value = false;
  }
};

const startPolling = () => {
  stopPolling();
  pollHandle = setInterval(pollOnce, 1500);
};

const stopPolling = () => {
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
};

const pollOnce = async () => {
  if (!current.value?.uuid) return;
  const fresh = await store.fetchImport(props.planUuid, current.value.uuid);
  if (fresh) {
    current.value = fresh;
    if (fresh.status === 'COMPLETED' || fresh.status === 'FAILED') {
      stopPolling();
      if (fresh.status === 'COMPLETED') {
        // Refresh paginated items + aggregates + unresolved summary so the
        // newly imported rows + totals + Issues badge update.
        await Promise.all([
          store.fetchPlan(props.planUuid),
          store.fetchPlanItems(props.planUuid, { page: 1 }),
          store.fetchItemTotals(props.planUuid),
          store.fetchItemTotalsByGroup(props.planUuid),
          store.fetchItemTotalsByFlag(props.planUuid),
          store.fetchUnresolved(props.planUuid),
        ]);
      }
    }
  }
};

const startNew = () => {
  current.value = null;
  file.value = null;
  if (fileInput.value) fileInput.value.value = '';
};

const statusBadge = (status) => {
  if (status === 'COMPLETED') return 'badge-success';
  if (status === 'PROCESSING') return 'badge-info';
  if (status === 'PENDING') return 'badge-warning';
  if (status === 'FAILED') return 'badge-error';
  return 'badge-ghost';
};

onBeforeUnmount(stopPolling);
</script>

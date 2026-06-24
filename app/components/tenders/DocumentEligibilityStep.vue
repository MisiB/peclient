<template>
  <div class="w-full space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-lg font-semibold">Document eligibility</h2>
        <p class="text-sm text-base-content/60">
          Select documents bidders must supply when responding. For <strong>PROVIDE</strong> types, attach the file bidders will download.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn btn-ghost btn-sm" type="button" @click="emit('back')">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          Back
        </button>
        <button class="btn btn-primary btn-sm" type="button" :disabled="saving || loading" @click="saveAndContinue">
          <span v-if="saving" class="loading loading-spinner loading-xs" />
          <span v-else>Save &amp; continue</span>
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-error border border-error/30 bg-error/10">
      <Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <div v-if="loading" class="card w-full border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body flex items-center justify-center gap-2 p-10 text-base-content/50">
        <span class="loading loading-spinner loading-md" />
        <span class="text-sm">Loading documents…</span>
      </div>
    </div>

    <div v-else-if="!catalog.length" class="card w-full border border-dashed border-base-200 bg-base-100/50 shadow-sm">
      <div class="card-body p-10 text-center text-base-content/50">
        <Icon name="lucide:file-x" class="mx-auto mb-2 h-10 w-10" />
        <p class="text-sm">No tender documents in your catalog yet.</p>
        <NuxtLink to="/my-tender-documents" class="btn btn-link btn-sm mt-2">Manage tender documents</NuxtLink>
      </div>
    </div>

    <div v-else class="card w-full border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body gap-4 p-4 sm:p-6">
        <input
          v-model="search"
          type="text"
          placeholder="Search catalog…"
          class="input input-bordered w-full max-w-md"
        />

        <div class="space-y-3">
          <div
            v-for="doc in filteredCatalog"
            :key="doc.uuid"
            class="rounded-lg border border-base-200 p-4"
            :class="selection[doc.uuid]?.selected ? 'border-primary/40 bg-primary/5' : ''"
          >
            <label class="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                class="checkbox checkbox-primary mt-1"
                :checked="!!selection[doc.uuid]?.selected"
                @change="toggleDoc(doc.uuid, $event.target.checked)"
              />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold">{{ doc.name }}</span>
                  <span
                    :class="['badge badge-sm', doc.type === 'REQUEST' ? 'badge-warning' : 'badge-info']"
                  >
                    {{ doc.type }}
                  </span>
                  <span v-if="!doc.company_id" class="badge badge-sm badge-neutral">Global</span>
                  <span v-if="doc.expires === 'Y'" class="badge badge-sm badge-ghost">Expires</span>
                </div>
                <p v-if="doc.description" class="mt-1 text-xs text-base-content/60">{{ doc.description }}</p>
                <p v-if="doc.type === 'REQUEST'" class="mt-2 text-xs text-base-content/50">
                  Bidder uploads this document with their response.
                </p>
              </div>
            </label>

            <div
              v-if="doc.type === 'PROVIDE' && selection[doc.uuid]?.selected"
              class="mt-3 ml-9 border-t border-base-200 pt-3"
            >
              <span class="text-xs font-medium text-base-content/70">Attach file for bidders</span>
              <input
                type="file"
                class="file-input file-input-bordered file-input-sm mt-2 w-full max-w-md"
                @change="(e) => onFile(doc.uuid, e)"
              />
              <p v-if="uploadingUuid === doc.uuid" class="mt-1 text-xs text-info">Uploading…</p>
              <p
                v-else-if="selection[doc.uuid]?.original_filename"
                class="mt-1 text-xs text-success"
              >
                ✓ {{ selection[doc.uuid].original_filename }}
              </p>
              <p v-else class="mt-1 text-xs text-base-content/50">Optional until you publish the tender.</p>
            </div>
          </div>
        </div>

        <p v-if="filteredCatalog.length === 0" class="text-center text-sm text-base-content/50">
          No documents match your search.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  tenderUuid: { type: String, required: true },
});

const emit = defineEmits(['saved', 'back']);

const toast = useToast();
const catalogStore = useTenderdocumentStore();
const { getTenderDocumentRequirements, syncTenderDocumentRequirements } = useTenderHelper();
const { uploadFile } = useDocmanUpload();

const loading = ref(true);
const saving = ref(false);
const errorMessage = ref('');
const search = ref('');
const uploadingUuid = ref('');
/** @type {Record<string, { selected: boolean, file_disk?: string|null, file_path?: string|null, original_filename?: string|null, mime_type?: string|null, file_size?: number|null }>} */
const selection = reactive({});

const catalog = computed(() =>
  (catalogStore.items ?? []).filter((d) => d.status === 'ACTIVE'),
);

const filteredCatalog = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return catalog.value;
  return catalog.value.filter(
    (d) =>
      d.name?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q),
  );
});

function initSelectionFromSaved(rows) {
  for (const key of Object.keys(selection)) {
    delete selection[key];
  }
  for (const doc of catalog.value) {
    selection[doc.uuid] = { selected: false };
  }
  for (const row of rows ?? []) {
    const cat = row.tender_document ?? row.tenderDocument;
    const uuid = cat?.uuid;
    if (!uuid) continue;
    selection[uuid] = {
      selected: true,
      file_disk: row.file_disk ?? null,
      file_path: row.file_path ?? null,
      original_filename: row.original_filename ?? null,
      mime_type: row.mime_type ?? null,
      file_size: row.file_size ?? null,
    };
  }
}

function toggleDoc(uuid, checked) {
  if (!selection[uuid]) {
    selection[uuid] = { selected: checked };
  } else {
    selection[uuid].selected = checked;
  }
  if (!checked) {
    selection[uuid].file_disk = null;
    selection[uuid].file_path = null;
    selection[uuid].original_filename = null;
    selection[uuid].mime_type = null;
    selection[uuid].file_size = null;
  }
}

async function onFile(uuid, e) {
  const file = e.target.files?.[0];
  if (!file) return;
  uploadingUuid.value = uuid;
  const { ok, data, error } = await uploadFile(file, 'tender-documents');
  uploadingUuid.value = '';
  if (!ok) {
    toast.error({ title: 'Upload failed', message: error || 'Try again.', position: 'topRight', layout: 2 });
    return;
  }
  if (!selection[uuid]) selection[uuid] = { selected: true };
  selection[uuid].selected = true;
  selection[uuid].file_disk = 'docman';
  selection[uuid].file_path = data.file_key;
  selection[uuid].original_filename = data.file_name;
  selection[uuid].mime_type = data.mime_type;
  selection[uuid].file_size = data.file_size;
}

function buildPayload() {
  return Object.entries(selection)
    .filter(([, v]) => v.selected)
    .map(([tender_document_uuid, v]) => ({
      tender_document_uuid,
      file_disk: v.file_disk ?? null,
      file_path: v.file_path ?? null,
      original_filename: v.original_filename ?? null,
      mime_type: v.mime_type ?? null,
      file_size: v.file_size ?? null,
    }));
}

async function saveAndContinue() {
  errorMessage.value = '';
  saving.value = true;
  const { data, status, error } = await syncTenderDocumentRequirements(props.tenderUuid, {
    documents: buildPayload(),
  });
  saving.value = false;
  if (!status?.value) {
    errorMessage.value =
      error?.value?.data?.message || data?.value?.message || 'Failed to save document requirements.';
    return;
  }
  toast.success({
    title: 'Saved',
    message: 'Document eligibility saved.',
    position: 'topRight',
    layout: 2,
  });
  emit('saved');
}

async function load() {
  loading.value = true;
  errorMessage.value = '';
  await catalogStore.fetchAll();
  const { data, error } = await getTenderDocumentRequirements(props.tenderUuid);
  if (error.value) {
    errorMessage.value =
      error.value?.data?.message || 'Failed to load document requirements.';
    loading.value = false;
    return;
  }
  const rows = data.value?.data ?? [];
  initSelectionFromSaved(rows);
  loading.value = false;
}

onMounted(() => load());
</script>

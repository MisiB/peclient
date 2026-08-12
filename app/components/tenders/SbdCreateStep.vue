<template>
  <div class="w-full space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-semibold">Standard bidding document</h2>
          <span class="badge badge-warning badge-sm">Required</span>
        </div>
        <p class="text-sm text-base-content/60">
          Add any custom sections your tender needs, then click
          <span class="font-medium">Preview document</span> to review the full bidding document.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn btn-ghost btn-sm" type="button" @click="emit('back')">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          Back
        </button>
        <button
          class="btn btn-outline btn-primary btn-sm"
          type="button"
          :disabled="saving || loading || autofilling"
          @click="autofillPolicyFields"
        >
          <span v-if="autofilling" class="loading loading-spinner loading-xs" />
          <Icon v-else name="lucide:sparkles" class="h-4 w-4" />
          {{ autofilling ? 'Generating...' : 'Complete policy fields with AI' }}
        </button>
        <button
          class="btn btn-outline btn-sm"
          type="button"
          :disabled="saving || loading"
          @click="openPreview"
        >
          <span v-if="loadingPreview" class="loading loading-spinner loading-xs" />
          <Icon v-else name="lucide:eye" class="h-4 w-4" />
          Preview document
        </button>
        <button class="btn btn-secondary btn-sm" type="button" :disabled="saving || loading" @click="save">
          <span v-if="saving && !continuing" class="loading loading-spinner loading-xs" />
          <Icon v-else name="lucide:save" class="h-4 w-4" />
          Save
        </button>
        <button class="btn btn-primary btn-sm" type="button" :disabled="saving || loading" @click="saveAndContinue">
          <span v-if="saving && continuing" class="loading loading-spinner loading-xs" />
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
        <span class="text-sm">Loading bidding document…</span>
      </div>
    </div>

    <template v-else>
      <div class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-4 p-4 sm:p-6">
          <div>
            <h3 class="text-base font-semibold">Information from steps 1-7</h3>
            <p class="text-xs text-base-content/60">
              These details are inserted automatically into the Government of Zimbabwe goods SBD.
            </p>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="item in autoBound"
              :key="item.label"
              class="rounded-lg border border-base-200 bg-base-200/20 px-3 py-2"
            >
              <p class="text-xs text-base-content/50">{{ item.label }}</p>
              <p class="mt-0.5 whitespace-pre-line text-sm font-medium">{{ item.value || 'Not captured' }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-5 p-4 sm:p-6">
          <div>
            <h3 class="text-base font-semibold">SBD policy and contract details</h3>
            <p class="text-xs text-base-content/60">
              Review the bidding-procedure and Special Conditions fields that are not captured in earlier steps.
            </p>
          </div>

          <section v-for="group in fieldGroups" :key="group.name" class="space-y-3">
            <h4 class="border-b border-base-200 pb-2 text-sm font-semibold">{{ group.name }}</h4>
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <label
                v-for="field in group.fields"
                :key="field.key"
                :class="['fieldset', field.type === 'textarea' ? 'lg:col-span-2' : '']"
              >
                <span class="fieldset-legend">{{ field.label }}</span>
                <input
                  v-if="field.type === 'boolean'"
                  v-model="values[field.key]"
                  type="checkbox"
                  class="toggle toggle-primary"
                />
                <textarea
                  v-else-if="field.type === 'textarea'"
                  v-model="values[field.key]"
                  class="textarea textarea-bordered min-h-24 w-full"
                />
                <input
                  v-else
                  v-model="values[field.key]"
                  :type="field.type === 'number' ? 'number' : 'text'"
                  :min="field.type === 'number' ? 0 : undefined"
                  :step="field.type === 'number' ? 'any' : undefined"
                  class="input input-bordered w-full"
                />
                <span v-if="field.help" class="label-text-alt mt-1 text-base-content/50">{{ field.help }}</span>
              </label>
            </div>
          </section>
        </div>
      </div>

      <!-- Custom sections (procuring-entity flexibility) -->
      <div class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-4 p-4 sm:p-6">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="text-base font-semibold">Custom sections</h3>
              <p class="text-xs text-base-content/60">
                Add your own sections for anything the template does not cover. Each appears in the document.
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" class="btn btn-ghost btn-sm" @click="openLibrary">
                <Icon name="lucide:library" class="h-4 w-4" />
                Add from library
              </button>
              <button type="button" class="btn btn-outline btn-sm" @click="addSection">
                <Icon name="lucide:plus" class="h-4 w-4" />
                Add section
              </button>
            </div>
          </div>

          <p v-if="!customSections.length" class="text-sm text-base-content/50">No custom sections.</p>

          <div
            v-for="(section, si) in customSections"
            :key="si"
            class="space-y-2 rounded-lg border border-base-200 p-3"
          >
            <div class="flex flex-wrap items-center gap-2">
              <input
                v-model="section.title"
                type="text"
                placeholder="Section title (e.g. Site Inspection)"
                class="input input-bordered input-sm w-full sm:flex-1"
              />
              <select v-model="section.type" class="select select-bordered select-sm">
                <option value="label_value">Label → value</option>
                <option value="table">Table</option>
                <option value="list">List</option>
              </select>
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                title="Save to my library for reuse"
                :disabled="savingSection === si || !section.title?.trim()"
                @click="saveToLibrary(section, si)"
              >
                <span v-if="savingSection === si" class="loading loading-spinner loading-xs" />
                <Icon v-else name="lucide:bookmark-plus" class="h-4 w-4" />
              </button>
              <button type="button" class="btn btn-ghost btn-sm text-error" title="Remove section" @click="removeSection(si)">
                <Icon name="lucide:trash-2" class="h-4 w-4" />
              </button>
            </div>

            <!-- label → value -->
            <div v-if="section.type === 'label_value'" class="space-y-2">
              <div v-for="(field, fi) in section.fields" :key="fi" class="flex flex-wrap items-center gap-2">
                <input v-model="field.label" type="text" placeholder="Label" class="input input-bordered input-sm w-full sm:w-1/3" />
                <input v-model="field.value" type="text" placeholder="Value" class="input input-bordered input-sm w-full flex-1" />
                <button type="button" class="btn btn-ghost btn-xs text-error" @click="removeField(section, fi)">
                  <Icon name="lucide:x" class="h-3.5 w-3.5" />
                </button>
              </div>
              <button type="button" class="btn btn-ghost btn-xs" @click="addField(section)">
                <Icon name="lucide:plus" class="h-3.5 w-3.5" /> Add field
              </button>
            </div>

            <!-- table -->
            <div v-else-if="section.type === 'table'" class="space-y-2 overflow-x-auto">
              <table class="table table-xs w-auto">
                <thead>
                  <tr>
                    <th v-for="(col, ci) in section.columns" :key="ci">
                      <div class="flex items-center gap-1">
                        <input v-model="section.columns[ci]" placeholder="Column" class="input input-bordered input-xs w-28" />
                        <button type="button" class="btn btn-ghost btn-xs text-error" title="Remove column" @click="removeColumn(section, ci)">
                          <Icon name="lucide:x" class="h-3 w-3" />
                        </button>
                      </div>
                    </th>
                    <th>
                      <button type="button" class="btn btn-ghost btn-xs" title="Add column" @click="addColumn(section)">
                        <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, ri) in section.rows" :key="ri">
                    <td v-for="(cell, ci) in row" :key="ci">
                      <input v-model="section.rows[ri][ci]" class="input input-bordered input-xs w-28" />
                    </td>
                    <td>
                      <button type="button" class="btn btn-ghost btn-xs text-error" title="Remove row" @click="removeRow(section, ri)">
                        <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <button type="button" class="btn btn-ghost btn-xs" @click="addRow(section)">
                <Icon name="lucide:plus" class="h-3.5 w-3.5" /> Add row
              </button>
            </div>

            <!-- list -->
            <div v-else class="space-y-2">
              <div v-for="(item, ii) in section.items" :key="ii" class="flex items-center gap-2">
                <span class="text-base-content/40">•</span>
                <input v-model="section.items[ii]" type="text" placeholder="List item" class="input input-bordered input-sm flex-1" />
                <button type="button" class="btn btn-ghost btn-xs text-error" @click="removeItem(section, ii)">
                  <Icon name="lucide:x" class="h-3.5 w-3.5" />
                </button>
              </div>
              <button type="button" class="btn btn-ghost btn-xs" @click="addItem(section)">
                <Icon name="lucide:plus" class="h-3.5 w-3.5" /> Add item
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Full-screen document preview -->
    <dialog ref="previewDialog" class="modal">
      <div class="modal-box flex h-screen max-h-none w-screen max-w-none flex-col gap-3 rounded-none p-4 sm:p-5">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold">Bidding document preview</h3>
          <div class="flex items-center gap-2">
            <button type="button" class="btn btn-ghost btn-sm" :disabled="loadingPreview" @click="refreshPreview">
              <span v-if="loadingPreview" class="loading loading-spinner loading-xs" />
              <Icon v-else name="lucide:refresh-cw" class="h-4 w-4" />
              Refresh
            </button>
            <button type="button" class="btn btn-ghost btn-circle" @click="closePreview">
              <Icon name="lucide:x" />
            </button>
          </div>
        </div>
        <div v-if="previewMessage" class="alert alert-warning border border-warning/30 bg-warning/10">
          <Icon name="lucide:alert-circle" class="h-5 w-5 shrink-0" />
          <span class="text-sm">{{ previewMessage }}</span>
        </div>
        <div
          v-else
          class="sbd-preview min-h-0 flex-1 overflow-auto rounded-lg border border-base-200 bg-white p-6 text-sm text-black"
          v-html="previewHtml"
        />
      </div>
    </dialog>

    <!-- Section library picker -->
    <dialog ref="libraryDialog" class="modal">
      <div class="modal-box flex max-h-[85vh] w-full max-w-2xl flex-col gap-3">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold">Section library</h3>
            <p class="text-xs text-base-content/60">Add a ready-made section. It is copied in, so edits stay in this tender.</p>
          </div>
          <button type="button" class="btn btn-ghost btn-circle btn-sm" @click="closeLibrary">
            <Icon name="lucide:x" />
          </button>
        </div>

        <div v-if="loadingLibrary" class="flex items-center justify-center gap-2 p-8 text-base-content/50">
          <span class="loading loading-spinner loading-md" />
          <span class="text-sm">Loading library…</span>
        </div>

        <div v-else class="min-h-0 flex-1 space-y-5 overflow-auto">
          <section>
            <h4 class="mb-2 text-sm font-semibold text-base-content/70">Shared collection</h4>
            <p v-if="!libraryCollection.length" class="text-sm text-base-content/40">No shared sections available.</p>
            <ul class="space-y-2">
              <li
                v-for="entry in libraryCollection"
                :key="`c-${entry.uuid}`"
                class="flex items-center justify-between gap-2 rounded-lg border border-base-200 p-2.5"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ entry.name }}</p>
                  <p class="truncate text-xs text-base-content/50">{{ sectionSummary(entry.body) }}</p>
                </div>
                <button type="button" class="btn btn-outline btn-xs" @click="addFromLibrary(entry)">
                  <Icon name="lucide:plus" class="h-3.5 w-3.5" /> Add
                </button>
              </li>
            </ul>
          </section>

          <section>
            <h4 class="mb-2 text-sm font-semibold text-base-content/70">My library</h4>
            <p v-if="!libraryPersonal.length" class="text-sm text-base-content/40">
              You have not saved any sections yet. Use the bookmark icon on a section to save it here.
            </p>
            <ul class="space-y-2">
              <li
                v-for="entry in libraryPersonal"
                :key="`p-${entry.uuid}`"
                class="flex items-center justify-between gap-2 rounded-lg border border-base-200 p-2.5"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium">{{ entry.name }}</p>
                  <p class="truncate text-xs text-base-content/50">{{ sectionSummary(entry.body) }}</p>
                </div>
                <div class="flex items-center gap-1">
                  <button type="button" class="btn btn-outline btn-xs" @click="addFromLibrary(entry)">
                    <Icon name="lucide:plus" class="h-3.5 w-3.5" /> Add
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs text-error"
                    title="Delete from my library"
                    @click="removeLibraryEntry(entry)"
                  >
                    <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { useTenderHelper } from '~/composables/useTenderHelper';

const props = defineProps({
  tenderUuid: { type: String, required: true },
});

const emit = defineEmits(['saved', 'back']);

const toast = useToast();
const {
  getTenderSbd,
  syncTenderSbd,
  previewTenderSbd,
  getSbdSectionLibrary,
  saveSbdSection,
  deleteSbdSection,
  autofillTenderSbd,
} = useTenderHelper();

const loading = ref(true);
const saving = ref(false);
const continuing = ref(false);
const autofilling = ref(false);
const errorMessage = ref('');

const fieldSchema = ref([]);
const autoBound = ref([]);
const values = reactive({});
const customSections = ref([]);

const previewDialog = ref(null);
const previewHtml = ref('');
const previewMessage = ref('');
const loadingPreview = ref(false);

const libraryDialog = ref(null);
const libraryCollection = ref([]);
const libraryPersonal = ref([]);
const loadingLibrary = ref(false);
const libraryLoaded = ref(false);
const savingSection = ref(null);

const fieldGroups = computed(() => {
  const groups = [];
  for (const field of fieldSchema.value) {
    let group = groups.find((entry) => entry.name === field.group);
    if (!group) {
      group = { name: field.group || 'Other details', fields: [] };
      groups.push(group);
    }
    group.fields.push(field);
  }
  return groups;
});

function plainSections() {
  return customSections.value.map((s) => {
    const base = { title: s.title ?? '', type: s.type ?? 'label_value' };
    if (s.type === 'table') {
      base.columns = (s.columns ?? []).map((c) => c ?? '');
      base.rows = (s.rows ?? []).map((r) => (r ?? []).map((c) => c ?? ''));
    } else if (s.type === 'list') {
      base.items = (s.items ?? []).map((i) => i ?? '');
    } else {
      base.fields = (s.fields ?? []).map((f) => ({ label: f.label ?? '', value: f.value ?? '' }));
    }
    return base;
  });
}

async function refreshPreview() {
  loadingPreview.value = true;
  try {
    const { status, data } = await previewTenderSbd(props.tenderUuid, {
      field_values: { ...values },
      custom_sections: plainSections(),
    });
    if (status?.value) {
      previewHtml.value = data.value?.data?.html ?? '';
      previewMessage.value = data.value?.data?.message ?? '';
    }
  } finally {
    loadingPreview.value = false;
  }
}

async function openPreview() {
  await refreshPreview();
  previewDialog.value?.showModal?.();
}
function closePreview() {
  previewDialog.value?.close?.();
}

// Keep the preview in step with edits to custom sections / fields (debounced),
// so re-opening it always reflects the latest changes.
let previewDebounce = null;
watch(
  [customSections, values],
  () => {
    if (loading.value) return;
    clearTimeout(previewDebounce);
    previewDebounce = setTimeout(refreshPreview, 350);
  },
  { deep: true },
);

// Turn a stored/library section body into a fully-populated editable section
// (every type's sub-arrays present, so switching the type select just works).
function normalizeSection(s) {
  s = s ?? {};
  return {
    title: s.title ?? '',
    type: s.type ?? 'label_value',
    fields: (s.fields ?? []).length
      ? s.fields.map((f) => ({ label: f.label ?? '', value: f.value ?? '' }))
      : [{ label: '', value: '' }],
    columns: (s.columns ?? []).length ? [...s.columns] : ['Column 1', 'Column 2'],
    rows: (s.rows ?? []).length ? s.rows.map((r) => [...r]) : [['', '']],
    items: (s.items ?? []).length ? [...s.items] : [''],
  };
}

function newSection() {
  return {
    title: '',
    type: 'label_value',
    fields: [{ label: '', value: '' }],
    columns: ['Column 1', 'Column 2'],
    rows: [['', '']],
    items: [''],
  };
}
function addSection() {
  customSections.value.push(newSection());
}
function removeSection(i) {
  customSections.value.splice(i, 1);
}

// label → value
function addField(section) {
  section.fields.push({ label: '', value: '' });
}
function removeField(section, i) {
  section.fields.splice(i, 1);
}

// table
function addColumn(section) {
  section.columns.push(`Column ${section.columns.length + 1}`);
  section.rows.forEach((r) => r.push(''));
}
function removeColumn(section, ci) {
  section.columns.splice(ci, 1);
  section.rows.forEach((r) => r.splice(ci, 1));
}
function addRow(section) {
  section.rows.push(section.columns.map(() => ''));
}
function removeRow(section, ri) {
  section.rows.splice(ri, 1);
}

// list
function addItem(section) {
  section.items.push('');
}
function removeItem(section, ii) {
  section.items.splice(ii, 1);
}

function applyPayload(payload) {
  fieldSchema.value = payload?.field_schema ?? [];
  autoBound.value = payload?.auto_bound ?? [];

  const current = payload?.field_values ?? {};
  for (const field of fieldSchema.value) {
    const value = current[field.key];
    if (field.type === 'boolean') {
      values[field.key] = Boolean(value);
    } else {
      values[field.key] = value ?? (field.type === 'number' ? null : '');
    }
  }

  customSections.value = (payload?.custom_sections ?? []).map(normalizeSection);
}

async function autofillPolicyFields() {
  autofilling.value = true;
  const { status, data, error } = await autofillTenderSbd(props.tenderUuid);
  autofilling.value = false;

  if (!status?.value) {
    toast.error({
      title: 'AI generation failed',
      message: error?.value?.data?.message || 'Could not generate the SBD policy fields.',
      position: 'topRight',
      layout: 2,
    });
    return;
  }

  const suggestions = data.value?.data?.field_values ?? {};
  for (const field of fieldSchema.value) {
    if (Object.prototype.hasOwnProperty.call(suggestions, field.key)) {
      values[field.key] = suggestions[field.key];
    }
  }
  toast.success({
    title: 'Draft completed',
    message: 'Review the AI-generated policy and contract details before saving.',
    position: 'topRight',
    layout: 2,
  });
}

// One-line preview of a library entry's body for the picker list.
function sectionSummary(body) {
  const type = body?.type ?? 'label_value';
  if (type === 'table') {
    return `Table · ${(body?.columns ?? []).length} cols · ${(body?.rows ?? []).length} rows`;
  }
  if (type === 'list') {
    return `List · ${(body?.items ?? []).length} items`;
  }
  return `Label → value · ${(body?.fields ?? []).length} fields`;
}

async function loadLibrary(force = false) {
  if (libraryLoaded.value && !force) return;
  loadingLibrary.value = true;
  const { data, error } = await getSbdSectionLibrary();
  loadingLibrary.value = false;
  if (error.value) {
    toast.error({ title: 'Library', message: 'Could not load the section library.', position: 'topRight', layout: 2 });
    return;
  }
  libraryCollection.value = data.value?.data?.collection ?? [];
  libraryPersonal.value = data.value?.data?.personal ?? [];
  libraryLoaded.value = true;
}

async function openLibrary() {
  libraryDialog.value?.showModal?.();
  await loadLibrary();
}
function closeLibrary() {
  libraryDialog.value?.close?.();
}

function addFromLibrary(entry) {
  customSections.value.push(normalizeSection(entry?.body));
  closeLibrary();
  toast.success({ title: 'Added', message: `“${entry.name}” added to this tender.`, position: 'topRight', layout: 2 });
}

async function saveToLibrary(section, index) {
  const title = (section.title ?? '').trim();
  if (!title) return;
  savingSection.value = index;
  const body = plainSections()[index];
  const { status } = await saveSbdSection({ name: title, body });
  savingSection.value = null;
  if (!status?.value) {
    toast.error({ title: 'Library', message: 'Could not save the section.', position: 'topRight', layout: 2 });
    return;
  }
  libraryLoaded.value = false; // refresh on next open
  toast.success({ title: 'Saved', message: `“${title}” saved to your library.`, position: 'topRight', layout: 2 });
}

async function removeLibraryEntry(entry) {
  const { status } = await deleteSbdSection(entry.uuid);
  if (!status?.value) {
    toast.error({ title: 'Library', message: 'Could not delete the section.', position: 'topRight', layout: 2 });
    return;
  }
  libraryPersonal.value = libraryPersonal.value.filter((e) => e.uuid !== entry.uuid);
}

async function persist() {
  const { status, error } = await syncTenderSbd(props.tenderUuid, {
    field_values: { ...values },
    custom_sections: customSections.value,
  });
  if (!status?.value) {
    const errData = error?.value?.data;
    errorMessage.value = errData?.message || 'Failed to save the bidding document details.';
    return false;
  }
  errorMessage.value = '';
  return true;
}

async function save() {
  saving.value = true;
  const ok = await persist();
  saving.value = false;
  if (!ok) return;

  toast.success({ title: 'Saved', message: 'Bidding document details saved.', position: 'topRight', layout: 2 });
}

async function saveAndContinue() {
  continuing.value = true;
  saving.value = true;
  const ok = await persist();
  saving.value = false;
  continuing.value = false;
  if (!ok) return;

  toast.success({ title: 'Saved', message: 'Bidding document details saved.', position: 'topRight', layout: 2 });
  emit('saved');
}

async function load() {
  loading.value = true;
  errorMessage.value = '';
  const { data, error } = await getTenderSbd(props.tenderUuid);
  if (error.value) {
    errorMessage.value = error.value?.data?.message || 'Failed to load the bidding document.';
    loading.value = false;
    return;
  }
  applyPayload(data.value?.data ?? {});
  loading.value = false;
}

onMounted(() => load());
</script>

<style scoped>
.sbd-preview :deep(h1) { font-size: 1.1rem; font-weight: 700; margin: 0.4rem 0; }
.sbd-preview :deep(h2) { font-size: 1rem; font-weight: 700; margin: 0.8rem 0 0.3rem; }
.sbd-preview :deep(h3) { font-size: 0.9rem; font-weight: 600; margin: 0.6rem 0 0.2rem; }
.sbd-preview :deep(h4) { font-size: 0.85rem; font-weight: 600; margin: 0.4rem 0 0.2rem; }
.sbd-preview :deep(p) { margin: 0.35rem 0; }
.sbd-preview :deep(table) { width: 100%; border-collapse: collapse; margin: 0.4rem 0; }
.sbd-preview :deep(td), .sbd-preview :deep(th) { padding: 4px 6px; vertical-align: top; border: 1px solid #e5e7eb; }
.sbd-preview :deep(.kv td.k) { width: 35%; font-weight: 600; }
.sbd-preview :deep(.small) { font-size: 0.8rem; color: #555; }
.sbd-preview :deep(ul) { list-style: disc; padding-left: 1.25rem; margin: 0.3rem 0; }
.sbd-preview :deep(li) { margin: 0.1rem 0; }
</style>

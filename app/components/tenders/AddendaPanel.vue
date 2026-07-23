<template>
  <div class="card border border-base-200 bg-base-100 shadow-sm">
    <div class="card-body gap-4 p-4 sm:p-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <Icon name="lucide:megaphone" class="h-4 w-4 text-base-content/60" />
          <h2 class="text-sm font-semibold">Addenda &amp; amendments</h2>
          <span class="badge badge-ghost badge-sm">{{ addenda.length }}</span>
        </div>
        <button v-if="canAdd" type="button" class="btn btn-primary btn-sm" @click="openCreate">
          <Icon name="lucide:plus" class="h-4 w-4" />
          New addendum
        </button>
      </div>

      <p class="text-xs text-base-content/60">
        Addenda are formal amendments to this published tender. Each goes through review and approval; on approval it is
        published to bidders and any date changes are applied to the live tender.
      </p>

      <div v-if="feedback" class="alert border py-2 text-sm" :class="feedbackOk ? 'alert-success border-success/30' : 'alert-error border-error/30'">
        <Icon :name="feedbackOk ? 'lucide:check-circle-2' : 'lucide:alert-triangle'" class="h-4 w-4 shrink-0" />
        <span>{{ feedback }}</span>
      </div>

      <div v-if="loading" class="flex items-center gap-2 text-sm text-base-content/50">
        <span class="loading loading-spinner loading-sm" /> Loading addenda…
      </div>

      <p v-else-if="addenda.length === 0" class="rounded-lg border border-dashed border-base-300 py-6 text-center text-sm text-base-content/50">
        No addenda have been raised for this tender.
      </p>

      <ul v-else class="space-y-3">
        <li v-for="a in addenda" :key="a.uuid" class="rounded-xl border border-base-200 p-3">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="badge badge-neutral badge-sm">#{{ a.number }}</span>
                <span class="font-semibold">{{ a.title }}</span>
                <span class="badge badge-sm" :class="statusClass(a.status)">{{ prettyStatus(a.status) }}</span>
              </div>
              <p class="mt-1 whitespace-pre-line text-sm text-base-content/70">{{ a.description }}</p>
              <div v-if="a.new_closing_at || a.new_opening_at" class="mt-2 flex flex-wrap gap-2 text-xs">
                <span v-if="a.new_closing_at" class="rounded bg-warning/15 px-2 py-1 text-warning-content">
                  New closing: {{ formatDateTime(a.new_closing_at) }}
                </span>
                <span v-if="a.new_opening_at" class="rounded bg-info/15 px-2 py-1">
                  New opening: {{ formatDateTime(a.new_opening_at) }}
                </span>
              </div>
              <div v-if="amendedLabels(a).length" class="mt-2 flex flex-wrap gap-1">
                <span v-for="label in amendedLabels(a)" :key="label" class="badge badge-outline badge-sm gap-1">
                  <Icon name="lucide:file-pen-line" class="h-3 w-3" />
                  {{ label }}
                </span>
              </div>
              <button
                v-if="a.original_filename"
                type="button"
                class="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                :disabled="downloadingUuid === a.uuid"
                @click="downloadAttachment(a)"
              >
                <Icon name="lucide:paperclip" class="h-3.5 w-3.5" />
                {{ a.original_filename }}
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-base-200 pt-3">
            <button type="button" class="btn btn-outline btn-xs" :disabled="busy" @click="openView(a)">
              <Icon name="lucide:eye" class="h-3.5 w-3.5" /> View
            </button>
            <button
              v-for="action in (actionsByUuid[a.uuid] ?? [])"
              :key="action"
              type="button"
              class="btn btn-xs"
              :class="actionMeta[action]?.btnClass ?? 'btn-neutral'"
              :disabled="busy"
              @click="openAction(a, action)"
            >
              <Icon :name="actionMeta[action]?.icon ?? 'lucide:arrow-right'" class="h-3.5 w-3.5" />
              {{ actionMeta[action]?.label ?? action }}
            </button>

            <template v-if="a.status === 'DRAFT'">
              <button v-if="canEdit" type="button" class="btn btn-ghost btn-xs" :disabled="busy" @click="openEdit(a)">
                <Icon name="lucide:pencil" class="h-3.5 w-3.5" /> Edit
              </button>
              <button v-if="canDelete" type="button" class="btn btn-ghost btn-xs text-error" :disabled="busy" @click="removeAddendum(a)">
                <Icon name="lucide:trash-2" class="h-3.5 w-3.5" /> Delete
              </button>
            </template>
          </div>
        </li>
      </ul>
    </div>

    <!-- View dialog (read-only, full screen) -->
    <dialog ref="viewDialog" class="modal">
      <div class="modal-box flex h-screen max-h-screen w-screen max-w-full flex-col rounded-none p-0">
        <div class="flex items-center justify-between border-b border-base-200 px-5 py-3">
          <div class="flex flex-wrap items-center gap-2">
            <span class="badge badge-neutral badge-sm">#{{ viewing?.number }}</span>
            <h3 class="text-lg font-bold">{{ viewing?.title }}</h3>
            <span v-if="viewing" class="badge badge-sm" :class="statusClass(viewing.status)">{{ prettyStatus(viewing.status) }}</span>
          </div>
          <button type="button" class="btn btn-ghost btn-sm btn-circle" @click="closeView">
            <Icon name="lucide:x" class="h-5 w-5" />
          </button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div v-if="viewLoading" class="flex items-center gap-2 text-sm text-base-content/50">
            <span class="loading loading-spinner loading-sm" /> Loading addendum…
          </div>

          <div v-else-if="viewing" class="mx-auto w-full max-w-3xl space-y-5">
            <!-- Notice -->
            <section>
              <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-base-content/50">Notice</h4>
              <p class="whitespace-pre-line text-sm text-base-content/80">{{ viewing.description }}</p>
            </section>

            <!-- Date changes -->
            <section v-if="viewing.new_closing_at || viewing.new_opening_at">
              <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-base-content/50">Date changes</h4>
              <div class="flex flex-wrap gap-2 text-sm">
                <span v-if="viewing.new_closing_at" class="rounded bg-warning/15 px-2 py-1">New closing: {{ formatDateTime(viewing.new_closing_at) }}</span>
                <span v-if="viewing.new_opening_at" class="rounded bg-info/15 px-2 py-1">New opening: {{ formatDateTime(viewing.new_opening_at) }}</span>
              </div>
            </section>

            <!-- Attachment -->
            <section v-if="viewing.original_filename">
              <h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-base-content/50">Attachment</h4>
              <button type="button" class="btn btn-outline btn-sm" :disabled="downloadingUuid === viewing.uuid" @click="downloadAttachment(viewing)">
                <Icon name="lucide:paperclip" class="h-4 w-4" /> {{ viewing.original_filename }}
              </button>
            </section>

            <!-- Content changes preview -->
            <section v-if="hasPreview">
              <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">Proposed content changes</h4>
              <div class="space-y-3">
                <div v-if="preview.eligibility_questions" class="rounded-lg border border-base-200 p-3">
                  <p class="mb-2 text-sm font-semibold">Eligibility questions ({{ preview.eligibility_questions.length }})</p>
                  <ol class="list-decimal space-y-1 pl-5 text-sm">
                    <li v-for="(q, i) in preview.eligibility_questions" :key="i">
                      {{ q.question }} <span class="badge badge-ghost badge-xs">{{ q.response_type }}</span>
                    </li>
                  </ol>
                </div>
                <div v-if="preview.technical_eligibility_questions" class="rounded-lg border border-base-200 p-3">
                  <p class="mb-2 text-sm font-semibold">Technical eligibility ({{ preview.technical_eligibility_questions.length }})</p>
                  <ol class="list-decimal space-y-1 pl-5 text-sm">
                    <li v-for="(q, i) in preview.technical_eligibility_questions" :key="i">
                      {{ q.question }} <span class="badge badge-ghost badge-xs">{{ q.response_type }}</span>
                    </li>
                  </ol>
                </div>
                <div v-if="preview.document_requirements" class="rounded-lg border border-base-200 p-3">
                  <p class="mb-2 text-sm font-semibold">Required documents ({{ preview.document_requirements.length }})</p>
                  <ul class="space-y-1 text-sm">
                    <li v-for="(d, i) in preview.document_requirements" :key="i" class="flex items-center gap-2">
                      <Icon name="lucide:file-text" class="h-3.5 w-3.5 text-base-content/50" /> {{ d.name }}
                      <span v-if="d.type" class="badge badge-ghost badge-xs">{{ d.type }}</span>
                    </li>
                  </ul>
                </div>
                <div v-if="preview.supplier_categories" class="rounded-lg border border-base-200 p-3">
                  <p class="mb-2 text-sm font-semibold">Eligible supplier categories ({{ preview.supplier_categories.length }})</p>
                  <div class="flex flex-wrap gap-2">
                    <span v-for="(c, i) in preview.supplier_categories" :key="i" class="badge badge-outline gap-1">
                      <span class="font-mono text-xs opacity-60">{{ c.code }}</span> {{ c.name }}
                    </span>
                  </div>
                </div>
                <div v-if="preview.specifications" class="rounded-lg border border-base-200 p-3">
                  <p class="mb-2 text-sm font-semibold">Specifications</p>
                  <div v-for="(sp, i) in preview.specifications" :key="i" class="mb-2">
                    <p class="text-sm font-medium">{{ sp.product }}</p>
                    <table class="table table-xs mt-1 w-full">
                      <tbody>
                        <tr v-for="(s, j) in sp.specifications" :key="j">
                          <td class="w-1/3 font-medium text-base-content/70">{{ s.label }}</td>
                          <td>{{ s.value || '—' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            <!-- History -->
            <section v-if="viewing.transitions?.length">
              <h4 class="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/50">History</h4>
              <ul class="space-y-2">
                <li v-for="(t, i) in viewing.transitions" :key="i" class="text-sm">
                  <span class="font-medium">{{ actionMeta[t.action]?.label ?? t.action }}</span>
                  <span class="badge badge-ghost badge-xs ml-1">{{ prettyStatus(t.from_status) }} → {{ prettyStatus(t.to_status) }}</span>
                  <span class="ml-1 text-xs text-base-content/50">{{ userName(t.user) }} · {{ formatDateTime(t.created_at) }}</span>
                  <p v-if="t.comment" class="text-xs text-base-content/70">“{{ t.comment }}”</p>
                </li>
              </ul>
            </section>
          </div>
        </div>

        <!-- Decision footer -->
        <div class="flex flex-wrap items-center justify-end gap-2 border-t border-base-200 px-5 py-3">
          <button type="button" class="btn btn-sm" @click="closeView">Close</button>
          <button
            v-for="action in (viewing ? (actionsByUuid[viewing.uuid] ?? []) : [])"
            :key="action"
            type="button"
            class="btn btn-sm"
            :class="actionMeta[action]?.btnClass ?? 'btn-neutral'"
            :disabled="busy"
            @click="openAction(viewing, action)"
          >
            <Icon :name="actionMeta[action]?.icon ?? 'lucide:arrow-right'" class="h-4 w-4" />
            {{ actionMeta[action]?.label ?? action }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button type="button" @click="closeView">close</button></form>
    </dialog>

    <!-- Create / edit dialog (full screen) -->
    <dialog ref="formDialog" class="modal">
      <div class="modal-box flex h-screen max-h-screen w-screen max-w-full flex-col rounded-none p-0">
        <div class="flex items-center justify-between border-b border-base-200 px-5 py-3">
          <h3 class="text-lg font-bold">{{ editing ? 'Edit addendum' : 'New addendum' }}</h3>
          <button type="button" class="btn btn-ghost btn-sm btn-circle" :disabled="saving" @click="closeForm">
            <Icon name="lucide:x" class="h-5 w-5" />
          </button>
        </div>

        <form class="flex min-h-0 flex-1 flex-col" @submit.prevent="submitForm">
          <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div class="mx-auto w-full max-w-3xl space-y-3">
              <div v-if="formError" class="alert alert-error py-2 text-sm">{{ formError }}</div>

              <label class="form-control w-full">
                <span class="label-text text-xs font-medium">Title</span>
                <input v-model="form.title" type="text" class="input input-bordered w-full" :disabled="saving" placeholder="e.g. Closing date extended" />
              </label>
              <label class="form-control w-full">
                <span class="label-text text-xs font-medium">Notice / description</span>
                <textarea v-model="form.description" class="textarea textarea-bordered w-full" rows="4" :disabled="saving" placeholder="Explain the amendment for bidders…" />
              </label>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label class="form-control w-full">
                  <span class="label-text text-xs font-medium">New closing date &amp; time (optional)</span>
                  <input v-model="form.new_closing_at" type="datetime-local" class="input input-bordered w-full" :disabled="saving" />
                </label>
                <label class="form-control w-full">
                  <span class="label-text text-xs font-medium">New opening date &amp; time (optional)</span>
                  <input v-model="form.new_opening_at" type="datetime-local" class="input input-bordered w-full" :disabled="saving" />
                </label>
              </div>

              <label class="form-control w-full">
                <span class="label-text text-xs font-medium">Attachment (optional)</span>
                <input type="file" class="file-input file-input-bordered file-input-sm w-full" :disabled="saving || uploading" @change="onFile" />
                <span v-if="uploading" class="mt-1 text-xs text-info">Uploading…</span>
                <span v-else-if="form.original_filename" class="mt-1 text-xs text-success">✓ {{ form.original_filename }}</span>
              </label>

              <TendersAddendumContentEditor
                v-if="formOpen"
                ref="contentEditor"
                :tender-uuid="tenderUuid"
                :initial="editing?.content_changes ?? null"
              />
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 border-t border-base-200 px-5 py-3">
            <button type="button" class="btn btn-sm" :disabled="saving" @click="closeForm">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm" :disabled="saving || uploading">
              <span v-if="saving" class="loading loading-spinner loading-xs" />
              <span v-else>{{ editing ? 'Save changes' : 'Create addendum' }}</span>
            </button>
          </div>
        </form>
      </div>
      <form method="dialog" class="modal-backdrop"><button type="button" @click="closeForm">close</button></form>
    </dialog>

    <!-- Workflow action dialog -->
    <dialog ref="actionDialog" class="modal">
      <div class="modal-box">
        <h3 class="text-lg font-bold">{{ actionMeta[pendingAction]?.label ?? 'Confirm' }}</h3>
        <p class="py-2 text-sm text-base-content/70">{{ actionMeta[pendingAction]?.prompt }}</p>
        <label class="form-control w-full">
          <span class="label-text text-xs font-medium">
            Comment
            <span v-if="actionMeta[pendingAction]?.commentRequired" class="text-error">*</span>
            <span v-else class="text-base-content/40">(optional)</span>
          </span>
          <textarea v-model="actionComment" rows="3" class="textarea textarea-bordered w-full" placeholder="Add a note…" />
        </label>
        <div class="modal-action">
          <button type="button" class="btn btn-sm" :disabled="busy" @click="closeAction">Cancel</button>
          <button
            type="button"
            class="btn btn-sm"
            :class="actionMeta[pendingAction]?.btnClass ?? 'btn-primary'"
            :disabled="busy || (actionMeta[pendingAction]?.commentRequired && !actionComment.trim())"
            @click="confirmAction"
          >
            <span v-if="busy" class="loading loading-spinner loading-xs" /> Confirm
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button type="button" @click="closeAction">close</button></form>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({
  tenderUuid: { type: String, required: true },
})

const {
  getTenderAddenda,
  getTenderAddendum,
  createTenderAddendum,
  updateTenderAddendum,
  deleteTenderAddendum,
  getAddendumWorkflowActions,
  transitionAddendum,
  downloadAddendumAttachment,
} = useTenderHelper()
const { uploadFile } = useDocmanUpload()
const { canAdd, canEdit, canDelete } = useCheckPermission('tenders')

const addenda = ref([])
const actionsByUuid = reactive({})
const loading = ref(true)
const busy = ref(false)
const downloadingUuid = ref('')

// View (read-only) state
const viewDialog = ref(null)
const viewing = ref(null)
const viewLoading = ref(false)
const preview = computed(() => viewing.value?.content_changes_preview ?? {})
const hasPreview = computed(() => preview.value && Object.keys(preview.value).length > 0)

const feedback = ref('')
const feedbackOk = ref(true)

const actionMeta = {
  submit_for_review: { label: 'Submit for review', icon: 'lucide:send', btnClass: 'btn-primary', commentRequired: false, prompt: 'Submit this addendum for review. It will no longer be editable.' },
  review_approve: { label: 'Approve review', icon: 'lucide:check', btnClass: 'btn-success', commentRequired: false, prompt: 'Approve the review and forward the addendum for final approval.' },
  review_send_back: { label: 'Send back', icon: 'lucide:undo-2', btnClass: 'btn-warning', commentRequired: true, prompt: 'Return the addendum to the creator. A comment is required.' },
  approve: { label: 'Approve & publish', icon: 'lucide:megaphone', btnClass: 'btn-success', commentRequired: false, prompt: 'Approve and publish this addendum. Any date changes will be applied to the live tender.' },
  approve_send_back: { label: 'Send back to reviewer', icon: 'lucide:undo-2', btnClass: 'btn-warning', commentRequired: true, prompt: 'Return the addendum to the reviewer. A comment is required.' },
}

// ── List ─────────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true
  const { data, error } = await getTenderAddenda(props.tenderUuid)
  if (!error.value) {
    addenda.value = data.value?.data ?? []
    await Promise.all(addenda.value.map(loadActions))
  }
  loading.value = false
}

async function loadActions(a) {
  const { data, error } = await getAddendumWorkflowActions(props.tenderUuid, a.uuid)
  actionsByUuid[a.uuid] = error.value ? [] : (data.value?.data?.actions ?? [])
}

// ── Create / edit ────────────────────────────────────────────────────────────
const formDialog = ref(null)
const contentEditor = ref(null)
const formOpen = ref(false)
const editing = ref(null)
const saving = ref(false)
const uploading = ref(false)
const formError = ref('')
const form = reactive({
  title: '', description: '', new_closing_at: '', new_opening_at: '',
  file_disk: null, file_path: null, original_filename: null, mime_type: null, file_size: null,
})

function resetForm() {
  Object.assign(form, {
    title: '', description: '', new_closing_at: '', new_opening_at: '',
    file_disk: null, file_path: null, original_filename: null, mime_type: null, file_size: null,
  })
  formError.value = ''
}

function openCreate() {
  editing.value = null
  resetForm()
  formOpen.value = true
  formDialog.value?.showModal?.()
}

function openEdit(a) {
  editing.value = a
  resetForm()
  Object.assign(form, {
    title: a.title ?? '',
    description: a.description ?? '',
    new_closing_at: toLocalInput(a.new_closing_at),
    new_opening_at: toLocalInput(a.new_opening_at),
    file_disk: a.file_disk ?? null,
    file_path: a.file_path ?? null,
    original_filename: a.original_filename ?? null,
    mime_type: a.mime_type ?? null,
    file_size: a.file_size ?? null,
  })
  formOpen.value = true
  formDialog.value?.showModal?.()
}

function closeForm() {
  formOpen.value = false
  formDialog.value?.close?.()
}

async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploading.value = true
  const { ok, data, error } = await uploadFile(file, 'tender-addenda')
  uploading.value = false
  if (!ok) {
    formError.value = error || 'Upload failed.'
    return
  }
  form.file_disk = 'docman'
  form.file_path = data.file_key
  form.original_filename = data.file_name
  form.mime_type = data.mime_type
  form.file_size = data.file_size
}

function buildPayload() {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    new_closing_at: form.new_closing_at || null,
    new_opening_at: form.new_opening_at || null,
    content_changes: contentEditor.value?.buildContentChanges?.() ?? null,
    file_disk: form.file_disk,
    file_path: form.file_path,
    original_filename: form.original_filename,
    mime_type: form.mime_type,
    file_size: form.file_size,
  }
}

async function submitForm() {
  formError.value = ''
  if (!form.title.trim()) { formError.value = 'Title is required.'; return }
  if (!form.description.trim()) { formError.value = 'A description is required.'; return }

  saving.value = true
  const payload = buildPayload()
  const res = editing.value
    ? await updateTenderAddendum(props.tenderUuid, editing.value.uuid, payload)
    : await createTenderAddendum(props.tenderUuid, payload)
  saving.value = false

  if (!res.status.value) {
    formError.value = res.error.value?.data?.message ?? 'Could not save the addendum.'
    return
  }
  closeForm()
  setFeedback(true, editing.value ? 'Addendum updated.' : 'Addendum created.')
  await load()
}

async function removeAddendum(a) {
  if (busy.value) return
  busy.value = true
  const res = await deleteTenderAddendum(props.tenderUuid, a.uuid)
  busy.value = false
  if (!res.status.value) {
    setFeedback(false, res.error.value?.data?.message ?? 'Could not delete the addendum.')
    return
  }
  setFeedback(true, 'Addendum deleted.')
  await load()
}

// ── View (read-only) ─────────────────────────────────────────────────────────
async function openView(a) {
  viewing.value = { ...a, content_changes_preview: null, transitions: [] }
  viewLoading.value = true
  viewDialog.value?.showModal?.()
  const { data, error } = await getTenderAddendum(props.tenderUuid, a.uuid)
  if (!error.value) viewing.value = data.value?.data ?? viewing.value
  viewLoading.value = false
}

function closeView() {
  viewing.value = null
  viewDialog.value?.close?.()
}

// ── Workflow ─────────────────────────────────────────────────────────────────
const actionDialog = ref(null)
const pendingAction = ref('')
const pendingAddendum = ref(null)
const actionComment = ref('')

function openAction(a, action) {
  pendingAddendum.value = a
  pendingAction.value = action
  actionComment.value = ''
  actionDialog.value?.showModal?.()
}

function closeAction() {
  pendingAction.value = ''
  pendingAddendum.value = null
  actionDialog.value?.close?.()
}

async function confirmAction() {
  const meta = actionMeta[pendingAction.value]
  const comment = actionComment.value.trim()
  if (meta?.commentRequired && !comment) return

  busy.value = true
  const res = await transitionAddendum(props.tenderUuid, pendingAddendum.value.uuid, pendingAction.value, comment || null)
  busy.value = false

  if (!res.status.value) {
    setFeedback(false, res.error.value?.data?.message ?? 'The action could not be completed.')
    return
  }
  setFeedback(true, res.data.value?.message ?? 'Done.')
  closeAction()
  closeView()
  await load()
}

async function downloadAttachment(a) {
  downloadingUuid.value = a.uuid
  const res = await downloadAddendumAttachment(props.tenderUuid, a.uuid)
  downloadingUuid.value = ''
  const url = res.data.value?.data?.url
  if (res.status.value && url) window.open(url, '_blank')
  else setFeedback(false, 'The attachment could not be retrieved.')
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function setFeedback(ok, message) {
  feedbackOk.value = ok
  feedback.value = message
}

const CONTENT_LABELS = {
  document_requirements: 'Documents',
  eligibility_questions: 'Eligibility',
  technical_eligibility_questions: 'Technical eligibility',
  specifications: 'Specifications',
  supplier_categories: 'Supplier categories',
}

function amendedLabels(a) {
  const changes = a.content_changes
  if (!changes || typeof changes !== 'object') return []
  return Object.keys(CONTENT_LABELS).filter(k => Array.isArray(changes[k])).map(k => CONTENT_LABELS[k])
}

function userName(user) {
  if (!user) return 'System'
  return [user.name, user.lastname].filter(Boolean).join(' ') || user.email || 'User'
}

function prettyStatus(s) {
  return String(s ?? '').replaceAll('_', ' ')
}

function statusClass(s) {
  const v = String(s ?? '').toUpperCase()
  if (v === 'DRAFT') return 'badge-warning'
  if (v.includes('PENDING')) return 'badge-info'
  if (v === 'PUBLISHED') return 'badge-success'
  return 'badge-neutral'
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-ZW', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** ISO → value usable by <input type="datetime-local"> (local time, no seconds). */
function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(load)
</script>

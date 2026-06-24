<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <!-- Header -->
    <div class="card border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body gap-3 p-4 sm:p-5">
        <div class="breadcrumbs text-sm">
          <ul>
            <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
            <li><NuxtLink to="/tenders">Tenders</NuxtLink></li>
            <li>{{ tender?.tendernumber ?? 'Detail' }}</li>
          </ul>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="truncate text-xl font-bold tracking-tight">{{ tender?.title ?? 'Tender' }}</h1>
              <span v-if="tender" class="badge badge-sm" :class="statusBadgeClass(tender.status)">
                {{ prettyStatus(tender.status) }}
              </span>
            </div>
            <p class="font-mono text-xs text-base-content/60">{{ tender?.tendernumber ?? '—' }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <NuxtLink
              v-if="tender?.status === 'DRAFT' && canEdit"
              :to="`/tenders/${uuid}/edit`"
              class="btn btn-ghost btn-sm"
            >
              <Icon name="lucide:pencil" class="h-4 w-4" />
              Edit
            </NuxtLink>
            <NuxtLink to="/tenders" class="btn btn-ghost btn-sm">
              <Icon name="lucide:arrow-left" class="h-4 w-4" />
              Back
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loadError" class="alert alert-error border border-error/30">
      <Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" />
      <span>{{ loadError }}</span>
    </div>

    <div v-if="loading" class="card border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body flex-row items-center gap-2 text-base-content/50">
        <span class="loading loading-spinner loading-sm" />
        <span class="text-sm">Loading tender…</span>
      </div>
    </div>

    <template v-else-if="tender">
      <!-- Feedback -->
      <div v-if="actionMessage" class="alert border" :class="actionOk ? 'alert-success border-success/30' : 'alert-error border-error/30'">
        <Icon :name="actionOk ? 'lucide:check-circle-2' : 'lucide:alert-triangle'" class="h-5 w-5 shrink-0" />
        <div>
          <p>{{ actionMessage }}</p>
          <ul v-if="actionErrors.length" class="mt-1 list-disc pl-5 text-sm">
            <li v-for="(e, i) in actionErrors" :key="i">{{ e }}</li>
          </ul>
        </div>
      </div>

      <!-- Workflow panel -->
      <div class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-4 p-4 sm:p-5">
          <div class="flex items-center gap-2">
            <Icon name="lucide:git-branch" class="h-4 w-4 text-base-content/60" />
            <h2 class="text-sm font-semibold">Review & publication</h2>
          </div>

          <!-- Stage tracker -->
          <ul class="steps steps-vertical w-full text-sm sm:steps-horizontal">
            <li
              v-for="stage in stageTrack"
              :key="stage.key"
              class="step"
              :class="stage.reached ? 'step-primary' : ''"
              :data-content="stage.reached ? '✓' : ''"
            >
              {{ stage.label }}
            </li>
          </ul>

          <div v-if="availableActions.length" class="flex flex-wrap gap-2">
            <button
              v-for="action in availableActions"
              :key="action"
              type="button"
              class="btn btn-sm"
              :class="actionMeta[action]?.btnClass ?? 'btn-neutral'"
              :disabled="submitting"
              @click="openActionDialog(action)"
            >
              <Icon :name="actionMeta[action]?.icon ?? 'lucide:arrow-right'" class="h-4 w-4" />
              {{ actionMeta[action]?.label ?? action }}
            </button>
          </div>
          <p v-else class="text-sm text-base-content/50">
            No workflow actions are available to you at this stage.
          </p>
        </div>
      </div>

      <!-- Overview -->
      <div class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-4 p-4 sm:p-5">
          <h2 class="text-sm font-semibold">Overview</h2>
          <dl class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            <div v-for="field in overviewFields" :key="field.label">
              <dt class="text-xs uppercase tracking-wide text-base-content/40">{{ field.label }}</dt>
              <dd class="text-sm">{{ field.value }}</dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Description -->
      <div v-if="tender.description" class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-2 p-4 sm:p-5">
          <h2 class="text-sm font-semibold">Description</h2>
          <p class="whitespace-pre-line text-sm text-base-content/80">{{ tender.description }}</p>
        </div>
      </div>

      <!-- Full tender content (read-only, for reviewers/approvers) -->
      <div class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-3 p-4 sm:p-5">
          <div class="flex items-center gap-2">
            <Icon name="lucide:file-text" class="h-4 w-4 text-base-content/60" />
            <h2 class="text-sm font-semibold">Tender content</h2>
            <span v-if="detailsLoading" class="loading loading-spinner loading-xs ml-1" />
          </div>

          <!-- Items -->
          <div class="collapse collapse-arrow border border-base-200 bg-base-100">
            <input type="checkbox" checked />
            <div class="collapse-title flex items-center justify-between pr-12 text-sm font-medium">
              <span>Items &amp; products ({{ items.length }})</span>
              <span class="font-mono text-xs text-base-content/60">Total: {{ formatMoney(itemsTotal) }}</span>
            </div>
            <div class="collapse-content">
              <p v-if="!detailsLoading && items.length === 0" class="py-2 text-sm text-base-content/50">
                No items have been added.
              </p>
              <div v-for="item in items" :key="item.id" class="mb-3 rounded-lg border border-base-200 p-3">
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold">{{ item.description }}</p>
                    <div class="mt-1 flex flex-wrap gap-4 text-xs text-base-content/70">
                      <span>Qty: <strong class="font-mono">{{ item.quantity }}</strong></span>
                      <span>Unit: <strong class="font-mono">{{ formatMoney(item.unit_price) }}</strong></span>
                      <span>Total: <strong class="font-mono">{{ formatMoney(item.total) }}</strong></span>
                    </div>
                  </div>
                  <span class="badge badge-ghost badge-sm">
                    {{ item.annualprocurementplanitem_id ? 'APP line' : 'Manual line' }}
                  </span>
                </div>

                <div v-if="item.products?.length" class="mt-3 space-y-2">
                  <div
                    v-for="product in item.products"
                    :key="product.id"
                    class="rounded border border-base-200 bg-base-200/20 p-2"
                  >
                    <p class="text-sm font-medium">
                      {{ product.description }}
                      <span class="ml-1 font-mono text-xs text-base-content/50">× {{ product.quantity }}</span>
                    </p>
                    <table v-if="product.specifications?.length" class="table table-xs mt-1 w-full">
                      <tbody>
                        <tr v-for="spec in product.specifications" :key="spec.id">
                          <td class="w-1/3 font-medium text-base-content/70">{{ spec.label }}</td>
                          <td>{{ spec.value || '—' }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <p v-else class="mt-2 text-xs text-base-content/40">No products defined.</p>
              </div>
            </div>
          </div>

          <!-- Document requirements -->
          <div class="collapse collapse-arrow border border-base-200 bg-base-100">
            <input type="checkbox" />
            <div class="collapse-title text-sm font-medium">
              Document requirements ({{ documentRequirements.length }})
            </div>
            <div class="collapse-content">
              <p v-if="!detailsLoading && documentRequirements.length === 0" class="py-2 text-sm text-base-content/50">
                No document requirements set.
              </p>
              <ul class="space-y-2">
                <li
                  v-for="row in documentRequirements"
                  :key="row.id ?? (row.tender_document ?? row.tenderDocument)?.uuid"
                  class="flex flex-wrap items-center gap-2 rounded border border-base-200 p-2 text-sm"
                >
                  <span class="font-medium">{{ (row.tender_document ?? row.tenderDocument)?.name ?? '—' }}</span>
                  <span
                    class="badge badge-sm"
                    :class="(row.tender_document ?? row.tenderDocument)?.type === 'REQUEST' ? 'badge-warning' : 'badge-info'"
                  >
                    {{ (row.tender_document ?? row.tenderDocument)?.type ?? '—' }}
                  </span>
                  <span v-if="row.original_filename" class="text-xs text-success">
                    ✓ {{ row.original_filename }}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Eligibility questions -->
          <div class="collapse collapse-arrow border border-base-200 bg-base-100">
            <input type="checkbox" />
            <div class="collapse-title text-sm font-medium">
              Eligibility questions ({{ eligibilityQuestions.length }})
            </div>
            <div class="collapse-content">
              <p v-if="!detailsLoading && eligibilityQuestions.length === 0" class="py-2 text-sm text-base-content/50">
                No commercial eligibility questions.
              </p>
              <ol class="list-decimal space-y-2 pl-5">
                <li v-for="(q, i) in eligibilityQuestions" :key="i" class="text-sm">
                  {{ q.question }}
                  <span class="ml-1 badge badge-ghost badge-xs">{{ prettyType(q.response_type) }}</span>
                </li>
              </ol>
            </div>
          </div>

          <!-- Technical eligibility -->
          <div class="collapse collapse-arrow border border-base-200 bg-base-100">
            <input type="checkbox" />
            <div class="collapse-title text-sm font-medium">
              Technical eligibility ({{ technicalQuestions.length }})
            </div>
            <div class="collapse-content">
              <p v-if="!detailsLoading && technicalQuestions.length === 0" class="py-2 text-sm text-base-content/50">
                No technical eligibility questions.
              </p>
              <ol class="list-decimal space-y-2 pl-5">
                <li v-for="(q, i) in technicalQuestions" :key="i" class="text-sm">
                  {{ q.question }}
                  <span class="ml-1 badge badge-ghost badge-xs">{{ prettyType(q.response_type) }}</span>
                </li>
              </ol>
            </div>
          </div>

          <!-- Bidding document -->
          <div class="flex flex-wrap items-center gap-3 pt-1">
            <button type="button" class="btn btn-outline btn-sm" :disabled="sbdDownloading" @click="downloadSbd">
              <span v-if="sbdDownloading" class="loading loading-spinner loading-xs" />
              <Icon v-else name="lucide:download" class="h-4 w-4" />
              Download bidding document (SBD)
            </button>
            <span v-if="sbdError" class="text-xs text-error">{{ sbdError }}</span>
          </div>
        </div>
      </div>

      <!-- History timeline -->
      <div class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-3 p-4 sm:p-5">
          <div class="flex items-center gap-2">
            <Icon name="lucide:history" class="h-4 w-4 text-base-content/60" />
            <h2 class="text-sm font-semibold">History</h2>
          </div>
          <p v-if="transitions.length === 0" class="text-sm text-base-content/50">
            No workflow activity yet.
          </p>
          <ul v-else class="timeline timeline-vertical timeline-compact">
            <li v-for="(t, i) in transitions" :key="t.uuid ?? i">
              <hr v-if="i > 0" />
              <div class="timeline-middle">
                <Icon :name="actionMeta[t.action]?.icon ?? 'lucide:dot'" class="h-4 w-4 text-primary" />
              </div>
              <div class="timeline-end mb-4 ml-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-medium">{{ actionMeta[t.action]?.label ?? t.action }}</span>
                  <span class="badge badge-ghost badge-xs">
                    {{ prettyStatus(t.from_status) }} → {{ prettyStatus(t.to_status) }}
                  </span>
                </div>
                <p class="text-xs text-base-content/50">
                  {{ userName(t.user) }} · {{ formatDateTime(t.created_at) }}
                </p>
                <p v-if="t.comment" class="mt-1 text-sm text-base-content/70">“{{ t.comment }}”</p>
              </div>
              <hr v-if="i < transitions.length - 1" />
            </li>
          </ul>
        </div>
      </div>
    </template>

    <!-- Action dialog -->
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
          <textarea
            v-model="actionComment"
            rows="3"
            class="textarea textarea-bordered w-full"
            placeholder="Add a note…"
          />
        </label>
        <div class="modal-action">
          <button type="button" class="btn" :disabled="submitting" @click="closeActionDialog">Cancel</button>
          <button
            type="button"
            class="btn"
            :class="actionMeta[pendingAction]?.btnClass ?? 'btn-primary'"
            :disabled="submitting || (actionMeta[pendingAction]?.commentRequired && !actionComment.trim())"
            @click="confirmAction"
          >
            <span v-if="submitting" class="loading loading-spinner loading-sm" />
            Confirm
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
useHead({ title: 'Tender' })

const { canEdit, guardPage } = useCheckPermission('tenders')
const {
  getTender,
  getTenderWorkflowActions,
  getTenderTransitions,
  transitionTender,
  getTenderItems,
  getTenderDocumentRequirements,
  getTenderEligibilityQuestions,
  getTenderTechnicalEligibilityQuestions,
  downloadTenderSbd,
} = useTenderHelper()

const route = useRoute()
const uuid = String(route.params.uuid)

const loading = ref(true)
const loadError = ref('')
const tender = ref(null)
const availableActions = ref([])
const transitions = ref([])

const detailsLoading = ref(false)
const items = ref([])
const documentRequirements = ref([])
const eligibilityQuestions = ref([])
const technicalQuestions = ref([])
const sbdDownloading = ref(false)
const sbdError = ref('')

const submitting = ref(false)
const actionMessage = ref('')
const actionOk = ref(true)
const actionErrors = ref([])

const actionDialog = ref(null)
const pendingAction = ref('')
const actionComment = ref('')

const actionMeta = {
  submit_for_review: {
    label: 'Submit for review',
    icon: 'lucide:send',
    btnClass: 'btn-primary',
    commentRequired: false,
    prompt: 'Submit this tender for review. It will no longer be editable until it is sent back.',
  },
  review_approve: {
    label: 'Approve review',
    icon: 'lucide:check',
    btnClass: 'btn-success',
    commentRequired: false,
    prompt: 'Approve the review and forward the tender for final approval.',
  },
  review_send_back: {
    label: 'Send back',
    icon: 'lucide:undo-2',
    btnClass: 'btn-warning',
    commentRequired: true,
    prompt: 'Return the tender to the creator. A comment explaining the required changes is mandatory.',
  },
  approve: {
    label: 'Approve',
    icon: 'lucide:check-check',
    btnClass: 'btn-success',
    commentRequired: false,
    prompt: 'Approve the tender. Once approved it can be published.',
  },
  approve_send_back: {
    label: 'Send back to reviewer',
    icon: 'lucide:undo-2',
    btnClass: 'btn-warning',
    commentRequired: true,
    prompt: 'Return the tender to the reviewer. A comment is mandatory.',
  },
  publish: {
    label: 'Publish tender',
    icon: 'lucide:megaphone',
    btnClass: 'btn-primary',
    commentRequired: false,
    prompt: 'Publish the tender. It will become live for the publication window you configured.',
  },
}

const STATUS_ORDER = ['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED']

const stageTrack = computed(() => {
  const labels = {
    DRAFT: 'Draft',
    PENDING_REVIEW: 'Review',
    PENDING_APPROVAL: 'Approval',
    APPROVED: 'Approved',
    PUBLISHED: 'Published',
  }
  const currentIndex = STATUS_ORDER.indexOf(tender.value?.status)
  return STATUS_ORDER.map((key, i) => ({
    key,
    label: labels[key],
    reached: currentIndex >= 0 && i <= currentIndex,
  }))
})

const overviewFields = computed(() => {
  const t = tender.value
  if (!t) return []
  return [
    { label: 'Procurement method', value: t.procurementmethod?.name ?? '—' },
    { label: 'Procurement group', value: t.procurementgroup?.name ?? '—' },
    { label: 'Evaluation criterion', value: t.evaluationcriterion?.name ?? '—' },
    { label: 'Contract type', value: prettyType(t.contracttype) || '—' },
    { label: 'Participants', value: t.allowed_participants ?? '—' },
    { label: 'APP linkage', value: t.app_status ?? '—' },
    { label: 'Publication start', value: formatDate(t.publication_start_date) },
    { label: 'Closing date', value: formatDate(t.closing_date) },
    { label: 'Opening', value: formatDateTime(t.opening_at) },
    { label: 'Bid bond', value: t.required_bid_bond === 'Y' ? `Required · ${t.bid_validity_period ?? '—'} day validity` : 'Not required' },
    {
      label: 'Pre-qualification',
      value: t.require_prequalification === 'Y'
        ? `${formatDateTime(t.prequalification_at)}${t.prequalification_venue ? ` · ${t.prequalification_venue}` : ''}`
        : 'Not required',
    },
    { label: 'Submitted', value: stamp(t.submitted_by_user ?? t.submittedBy, t.submitted_at) },
    { label: 'Reviewed', value: stamp(t.reviewed_by_user ?? t.reviewedBy, t.reviewed_at) },
    { label: 'Approved', value: stamp(t.approved_by_user ?? t.approvedBy, t.approved_at) },
    { label: 'Published', value: stamp(t.published_by_user ?? t.publishedBy, t.published_at) },
  ]
})

const itemsTotal = computed(() =>
  items.value.reduce((sum, it) => sum + Number(it.total ?? 0), 0),
)

function prettyStatus(status) {
  return String(status ?? '').replaceAll('_', ' ')
}

function prettyType(value) {
  return String(value ?? '').replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
}

function formatMoney(value) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function statusBadgeClass(status) {
  const s = String(status ?? '').toUpperCase()
  if (s === 'DRAFT') return 'badge-warning'
  if (s.includes('PENDING')) return 'badge-info'
  if (s === 'PUBLISHED') return 'badge-success'
  if (s === 'APPROVED') return 'badge-success'
  if (s === 'REJECTED' || s === 'CANCELLED') return 'badge-error'
  return 'badge-neutral'
}

function userName(user) {
  if (!user) return 'System'
  return [user.name, user.lastname].filter(Boolean).join(' ') || user.email || 'User'
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-ZW', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-ZW', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function stamp(user, iso) {
  if (!iso) return '—'
  return `${userName(user)} · ${formatDateTime(iso)}`
}

async function loadTender() {
  const { data, error } = await getTender(uuid)
  if (error.value) {
    loadError.value = 'Failed to load tender.'
    return
  }
  tender.value = data.value?.data ?? null
}

async function loadActions() {
  const { data, error } = await getTenderWorkflowActions(uuid)
  if (error.value) return
  availableActions.value = data.value?.data?.actions ?? []
}

async function loadTransitions() {
  const { data, error } = await getTenderTransitions(uuid)
  if (error.value) return
  transitions.value = data.value?.data ?? []
}

async function loadDetails() {
  detailsLoading.value = true
  try {
    const [it, docs, elig, tech] = await Promise.all([
      getTenderItems(uuid),
      getTenderDocumentRequirements(uuid),
      getTenderEligibilityQuestions(uuid),
      getTenderTechnicalEligibilityQuestions(uuid),
    ])
    items.value = it.data.value?.data ?? []
    documentRequirements.value = docs.data.value?.data ?? []
    eligibilityQuestions.value = elig.data.value?.data?.questions ?? []
    technicalQuestions.value = tech.data.value?.data?.questions ?? []
  } finally {
    detailsLoading.value = false
  }
}

async function downloadSbd() {
  sbdDownloading.value = true
  sbdError.value = ''
  try {
    const { data, status } = await downloadTenderSbd(uuid)
    if (!status.value) {
      sbdError.value = 'The bidding document is not available yet.'
      return
    }
    const url = data.value?.data?.url
    if (url) window.open(url, '_blank')
    else sbdError.value = 'No bidding document has been generated for this tender.'
  } finally {
    sbdDownloading.value = false
  }
}

async function refresh() {
  await Promise.all([loadTender(), loadActions(), loadTransitions()])
}

function openActionDialog(action) {
  pendingAction.value = action
  actionComment.value = ''
  actionMessage.value = ''
  actionDialog.value?.showModal?.()
}

function closeActionDialog() {
  pendingAction.value = ''
  actionComment.value = ''
  actionDialog.value?.close?.()
}

async function confirmAction() {
  if (!pendingAction.value) return
  const meta = actionMeta[pendingAction.value]
  const comment = actionComment.value.trim()
  if (meta?.commentRequired && !comment) return

  submitting.value = true
  actionErrors.value = []
  try {
    const { data, status, error } = await transitionTender(uuid, pendingAction.value, comment || null)
    if (!status.value) {
      actionOk.value = false
      const body = error.value?.data
      actionMessage.value = body?.message ?? 'The action could not be completed.'
      actionErrors.value = body?.data?.errors ?? []
      return
    }
    actionOk.value = true
    actionMessage.value = data.value?.message ?? 'Done.'
    closeActionDialog()
    await refresh()
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await guardPage('can.access.tenders', 'You do not have permission to view tenders.')
  loading.value = true
  try {
    await refresh()
  } finally {
    loading.value = false
  }
  loadDetails()
})
</script>

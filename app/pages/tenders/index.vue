<template>
  <div class="w-full space-y-6 p-4 sm:p-6">
    <div class="card border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body gap-3 p-4 sm:p-5">
        <div class="breadcrumbs text-sm">
          <ul>
            <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
            <li>Tenders</li>
          </ul>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 class="text-xl font-bold tracking-tight">Tenders</h1>
            <p class="text-sm text-base-content/60">
              All procurement requests for your organisation. Filter by year, method, status, or search by title or tender number.
            </p>
          </div>
          <NuxtLink v-if="canAdd" to="/tenders/new" class="btn btn-success btn-sm">
            <Icon name="lucide:plus" class="h-4 w-4" />
            New tender
          </NuxtLink>
        </div>
      </div>
    </div>

    <div v-if="!canAccess" class="alert alert-error">
      <Icon name="lucide:shield-alert" class="h-5 w-5" />
      <span>You do not have permission to view tenders.</span>
    </div>

    <template v-else>
      <!-- Filters -->
      <div class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-4 p-4 sm:p-5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-sm font-semibold uppercase tracking-wide text-base-content/50">Filters</h2>
            <button type="button" class="btn btn-ghost btn-xs" :disabled="!hasActiveFilters" @click="resetFilters">
              Clear filters
            </button>
          </div>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <label class="form-control w-full">
              <span class="label-text text-xs font-medium">Year</span>
              <select v-model.number="filters.year" class="select select-bordered select-sm w-full">
                <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
              </select>
            </label>
            <label class="form-control w-full">
              <span class="label-text text-xs font-medium">Procurement method</span>
              <select v-model="filters.procurementmethod_id" class="select select-bordered select-sm w-full">
                <option :value="null">All methods</option>
                <option v-for="m in procurementMethods" :key="m.id" :value="m.id">
                  {{ m.code }} — {{ m.name }}
                </option>
              </select>
            </label>
            <label class="form-control w-full">
              <span class="label-text text-xs font-medium">Status</span>
              <select v-model="filters.status" class="select select-bordered select-sm w-full">
                <option value="">All statuses</option>
                <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
              </select>
            </label>
            <label class="form-control w-full">
              <span class="label-text text-xs font-medium">APP linkage</span>
              <select v-model="filters.app_status" class="select select-bordered select-sm w-full">
                <option value="">Planned & unplanned</option>
                <option value="PLANNED">Planned (on APP)</option>
                <option value="UNPLANNED">Unplanned</option>
              </select>
            </label>
            <label class="form-control w-full sm:col-span-2 lg:col-span-2">
              <span class="label-text text-xs font-medium">Search</span>
              <input
                v-model="filters.search"
                type="search"
                class="input input-bordered input-sm w-full"
                placeholder="Title or tender number…"
              />
            </label>
          </div>
        </div>
      </div>

      <div v-if="errorMessage" class="alert alert-error border border-error/30">
        <Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" />
        <span>{{ errorMessage }}</span>
      </div>

      <!-- Aggregate summary cards -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="card border border-base-200 bg-base-100 shadow-sm">
          <div class="card-body p-4">
            <p class="text-xs text-base-content/50">Total tenders</p>
            <p class="text-2xl font-bold tabular-nums">{{ aggregateStats.total }}</p>
          </div>
        </div>
        <div class="card border border-warning/30 bg-warning/5 shadow-sm">
          <div class="card-body p-4">
            <p class="text-xs text-base-content/50">Draft</p>
            <p class="text-2xl font-bold tabular-nums text-warning">{{ aggregateStats.draft }}</p>
          </div>
        </div>
        <div class="card border border-success/30 bg-success/5 shadow-sm">
          <div class="card-body p-4">
            <p class="text-xs text-base-content/50">Published</p>
            <p class="text-2xl font-bold tabular-nums text-success">{{ aggregateStats.published }}</p>
          </div>
        </div>
        <div class="card border border-base-200 bg-base-100 shadow-sm">
          <div class="card-body p-4">
            <p class="text-xs text-base-content/50">Procurement methods</p>
            <p class="text-2xl font-bold tabular-nums">{{ summaryCards.length }}</p>
          </div>
        </div>
      </div>

      <!-- Summary by method -->
      <div>
        <h2 class="mb-3 text-sm font-semibold text-base-content/70">
          Summary by procurement method ({{ filters.year }})
        </h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="card in summaryCards"
            :key="card.procurementmethod_id"
            class="card cursor-pointer border border-base-200 bg-base-100 shadow-sm transition-colors hover:border-primary/30"
            :class="filters.procurementmethod_id === card.procurementmethod_id ? 'ring-2 ring-primary/40' : ''"
            @click="toggleMethodFilter(card.procurementmethod_id)"
          >
            <div class="card-body p-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs text-base-content/60">Procurement method</p>
                  <p class="font-semibold">{{ card.name }}</p>
                </div>
                <span class="badge badge-neutral badge-sm">{{ card.total }} total</span>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="s in card.statuses"
                  :key="s.status"
                  class="badge badge-sm"
                  :class="statusBadgeClass(s.status)"
                >
                  {{ s.status }}
                  <span class="ml-1 badge badge-ghost badge-sm">{{ s.total }}</span>
                </span>
                <span v-if="card.statuses.length === 0" class="text-xs text-base-content/40">No tenders</span>
              </div>
            </div>
          </div>
          <div v-if="loadingSummary" class="card border border-base-200 bg-base-100 shadow-sm">
            <div class="card-body flex items-center gap-2 p-4 text-base-content/50">
              <span class="loading loading-spinner loading-sm" />
              <span class="text-sm">Loading summary…</span>
            </div>
          </div>
          <div
            v-else-if="!loadingSummary && summaryCards.length === 0"
            class="card border border-dashed border-base-200 bg-base-100/50 sm:col-span-2 xl:col-span-3"
          >
            <div class="card-body p-6 text-center text-sm text-base-content/50">
              No tenders match the current filters.
            </div>
          </div>
        </div>
      </div>

      <!-- Tenders table -->
      <div class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-0 p-0">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 bg-base-200/40 px-4 py-3">
            <div class="flex items-center gap-2">
              <Icon name="lucide:list" class="h-4 w-4 text-base-content/60" />
              <h2 class="text-sm font-semibold">All tenders</h2>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-base-content/50">{{ tendersPagination.total ?? 0 }} records</span>
              <select v-model.number="perPage" class="select select-bordered select-xs">
                <option :value="15">15 / page</option>
                <option :value="25">25 / page</option>
                <option :value="50">50 / page</option>
              </select>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="table table-sm w-full">
              <thead>
                <tr class="bg-base-200/30 text-xs">
                  <th class="font-semibold">Tender #</th>
                  <th class="font-semibold">Title</th>
                  <th class="hidden md:table-cell font-semibold">Method</th>
                  <th class="hidden lg:table-cell font-semibold">APP</th>
                  <th class="font-semibold">Status</th>
                  <th class="hidden lg:table-cell font-semibold">Created</th>
                  <th class="font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loadingTenders">
                  <td colspan="7" class="py-12 text-center">
                    <span class="loading loading-spinner loading-md" />
                  </td>
                </tr>
                <tr v-else-if="tenders.length === 0">
                  <td colspan="7" class="py-12 text-center text-base-content/40">
                    <Icon name="lucide:inbox" class="mx-auto mb-2 h-8 w-8" />
                    <p class="text-sm">No tenders found</p>
                  </td>
                </tr>
                <tr v-for="t in tenders" :key="t.uuid" class="hover:bg-base-200/30">
                  <td class="whitespace-nowrap font-mono text-xs">{{ t.tendernumber ?? '—' }}</td>
                  <td class="max-w-[280px] truncate text-sm" :title="t.title">{{ t.title }}</td>
                  <td class="hidden md:table-cell text-xs text-base-content/60">
                    {{ t.procurementmethod?.name ?? methodNameById[t.procurementmethod_id] ?? '—' }}
                  </td>
                  <td class="hidden lg:table-cell">
                    <span class="badge badge-ghost badge-xs">{{ t.app_status ?? '—' }}</span>
                  </td>
                  <td>
                    <span class="badge badge-sm" :class="statusBadgeClass(t.status)">{{ t.status }}</span>
                  </td>
                  <td class="hidden whitespace-nowrap text-xs text-base-content/50 lg:table-cell">
                    {{ formatDate(t.created_at) }}
                  </td>
                  <td class="text-right">
                    <div class="inline-flex gap-1">
                      <NuxtLink
                        :to="`/tenders/${t.uuid}`"
                        class="btn btn-ghost btn-xs"
                        title="View"
                      >
                        <Icon name="lucide:eye" class="h-3.5 w-3.5" />
                      </NuxtLink>
                      <NuxtLink
                        v-if="t.status === 'DRAFT' && canEdit"
                        :to="`/tenders/new?draft=${t.uuid}`"
                        class="btn btn-ghost btn-xs"
                        title="Continue draft"
                      >
                        <Icon name="lucide:play" class="h-3.5 w-3.5" />
                      </NuxtLink>
                      <NuxtLink
                        v-if="t.status === 'DRAFT' && canEdit"
                        :to="`/tenders/${t.uuid}/edit`"
                        class="btn btn-ghost btn-xs"
                        title="Edit"
                      >
                        <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
                      </NuxtLink>
                      <button
                        v-if="t.status === 'DRAFT' && canDelete"
                        type="button"
                        class="btn btn-ghost btn-xs text-error"
                        title="Delete"
                        @click="confirmDelete(t)"
                      >
                        <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between border-t border-base-200 px-4 py-3">
            <button type="button" class="btn btn-sm" :disabled="!canPrev || loadingTenders" @click="page--">
              Previous
            </button>
            <span class="text-xs text-base-content/60">
              Page {{ tendersPagination.current_page ?? 1 }} of {{ tendersPagination.last_page ?? 1 }}
            </span>
            <button type="button" class="btn btn-sm" :disabled="!canNext || loadingTenders" @click="page++">
              Next
            </button>
          </div>
        </div>
      </div>
    </template>

    <dialog ref="deleteDialog" class="modal">
      <div class="modal-box">
        <h3 class="text-lg font-bold">Delete tender?</h3>
        <p class="py-2 text-sm">
          Delete draft
          <span class="font-semibold">{{ pendingDelete?.title }}</span>?
          This cannot be undone.
        </p>
        <div class="modal-action">
          <button type="button" class="btn" @click="closeDeleteDialog">Cancel</button>
          <button type="button" class="btn btn-error" :disabled="!!deletingUuid" @click="doDelete">
            <span v-if="deletingUuid" class="loading loading-spinner loading-sm" />
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } })
useHead({ title: 'Tenders' })

const { canAccess, canAdd, canEdit, canDelete } = useCheckPermission('tenders')
const { getTenderSummary, getTenders, deleteTender } = useTenderHelper()
const { getProcurementMethods } = useAnnualprocurementplanHelper()

const currentCalendarYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, i) => currentCalendarYear - 2 + i)
const statusOptions = ['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED']

const page = ref(1)
const perPage = ref(25)
const filters = reactive({
  year: currentCalendarYear,
  procurementmethod_id: null,
  status: '',
  app_status: '',
  search: '',
})

const loadingSummary = ref(false)
const loadingTenders = ref(false)
const errorMessage = ref('')
const procurementMethods = ref([])
const methodNameById = reactive({})
const summaryRows = ref([])
const tendersPagination = reactive({ data: [], current_page: 1, last_page: 1, total: 0 })

const tenders = computed(() => tendersPagination.data ?? [])

const listFilters = computed(() => ({
  year: filters.year,
  page: page.value,
  perPage: perPage.value,
  status: filters.status || undefined,
  procurementmethod_id: filters.procurementmethod_id || undefined,
  app_status: filters.app_status || undefined,
  search: filters.search?.trim() || undefined,
}))

const hasActiveFilters = computed(() =>
  filters.status !== ''
  || filters.app_status !== ''
  || filters.search.trim() !== ''
  || filters.procurementmethod_id != null,
)

const summaryCards = computed(() => {
  const byMethod = {}
  for (const row of summaryRows.value ?? []) {
    const pmId = row.procurementmethod_id
    if (!byMethod[pmId]) byMethod[pmId] = []
    byMethod[pmId].push({ status: row.status, total: Number(row.total ?? 0) })
  }

  const presentIds = Array.from(new Set([
    ...Object.keys(byMethod).map(Number),
    ...Object.keys(methodNameById).map(Number),
  ]))

  return presentIds
    .filter((id) => !!id)
    .map((id) => {
      const statuses = (byMethod[id] ?? []).sort((a, b) => b.total - a.total)
      const total = statuses.reduce((acc, s) => acc + s.total, 0)
      return {
        procurementmethod_id: id,
        name: methodNameById[id] ?? `Method #${id}`,
        total,
        statuses,
      }
    })
    .sort((a, b) => b.total - a.total)
})

const aggregateStats = computed(() => {
  let total = 0
  let draft = 0
  let published = 0
  for (const row of summaryRows.value ?? []) {
    const n = Number(row.total ?? 0)
    total += n
    const s = String(row.status ?? '').toUpperCase()
    if (s === 'DRAFT') draft += n
    if (s === 'PUBLISHED') published += n
  }
  return { total, draft, published }
})

const canPrev = computed(() => (tendersPagination.current_page ?? 1) > 1)
const canNext = computed(() => (tendersPagination.current_page ?? 1) < (tendersPagination.last_page ?? 1))

let searchDebounce = null

function statusBadgeClass(status) {
  const s = String(status ?? '').toUpperCase()
  if (s === 'DRAFT') return 'badge-warning'
  if (s.includes('PENDING')) return 'badge-info'
  if (s === 'APPROVED' || s === 'ACTIVE' || s === 'AUTHORIZED' || s === 'PUBLISHED') return 'badge-success'
  if (s === 'REJECTED' || s === 'CANCELLED') return 'badge-error'
  return 'badge-neutral'
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-ZW', { year: 'numeric', month: 'short', day: 'numeric' })
}

function resetFilters() {
  filters.procurementmethod_id = null
  filters.status = ''
  filters.app_status = ''
  filters.search = ''
  page.value = 1
}

function toggleMethodFilter(methodId) {
  filters.procurementmethod_id = filters.procurementmethod_id === methodId ? null : methodId
  page.value = 1
}

async function loadMethods() {
  const { data, error } = await getProcurementMethods()
  if (error.value) return
  for (const m of data.value?.data ?? []) {
    methodNameById[m.id] = m.name
  }
  procurementMethods.value = data.value?.data ?? []
}

async function loadSummary() {
  loadingSummary.value = true
  try {
    const { data, error } = await getTenderSummary({
      year: filters.year,
      status: filters.status || undefined,
      procurementmethod_id: filters.procurementmethod_id || undefined,
      app_status: filters.app_status || undefined,
      search: filters.search?.trim() || undefined,
    })
    if (error.value) {
      errorMessage.value = 'Failed to load tender summary.'
      return
    }
    summaryRows.value = data.value?.data?.rows ?? []
  } finally {
    loadingSummary.value = false
  }
}

async function loadTenders() {
  loadingTenders.value = true
  errorMessage.value = ''
  try {
    const { data, error } = await getTenders(listFilters.value)
    if (error.value) {
      errorMessage.value = 'Failed to load tenders.'
      return
    }
    Object.assign(tendersPagination, data.value?.data ?? {})
  } finally {
    loadingTenders.value = false
  }
}

async function reloadAll() {
  await Promise.all([loadSummary(), loadTenders()])
}

watch(
  () => [filters.year, filters.procurementmethod_id, filters.status, filters.app_status],
  () => {
    page.value = 1
    reloadAll()
  },
)

watch(
  () => filters.search,
  () => {
    page.value = 1
    clearTimeout(searchDebounce)
    searchDebounce = setTimeout(() => reloadAll(), 400)
  },
)

watch(page, () => loadTenders())
watch(perPage, () => {
  page.value = 1
  loadTenders()
})

onMounted(async () => {
  if (!canAccess.value) return
  await loadMethods()
  await reloadAll()
})

const deleteDialog = ref(null)
const pendingDelete = ref(null)
const deletingUuid = ref('')

function confirmDelete(t) {
  pendingDelete.value = t
  deleteDialog.value?.showModal?.()
}

function closeDeleteDialog() {
  pendingDelete.value = null
  deleteDialog.value?.close?.()
}

async function doDelete() {
  if (!pendingDelete.value) return
  deletingUuid.value = pendingDelete.value.uuid
  try {
    const { status } = await deleteTender(pendingDelete.value.uuid)
    if (!status.value) {
      errorMessage.value = 'Failed to delete tender.'
      return
    }
    closeDeleteDialog()
    await reloadAll()
  } finally {
    deletingUuid.value = ''
  }
}
</script>

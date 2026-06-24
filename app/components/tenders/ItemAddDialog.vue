<template>
  <dialog ref="dialogEl" class="modal">
    <div class="modal-box max-w-4xl">
      <h3 class="text-lg font-bold">Add line item</h3>

      <template v-if="hasValidApp">
        <p class="mt-1 text-sm text-base-content/60">
          Select an APP line item matching this tender’s procurement method, group, and expense category.
          Consolidated items can be expanded to pick individual lines.
        </p>

        <div v-if="errorMessage" class="alert alert-error mt-3 py-2 text-sm">{{ errorMessage }}</div>

        <label class="form-control mt-3 w-full">
          <span class="label-text text-xs font-medium">Search</span>
          <input
            v-model="search"
            type="search"
            class="input input-bordered input-sm w-full"
            placeholder="Reference or description…"
          />
        </label>

        <div class="mt-3 max-h-96 space-y-4 overflow-y-auto">
          <div v-if="loading" class="py-8 text-center">
            <span class="loading loading-spinner loading-md" />
          </div>

          <template v-else>
            <!-- Consolidated groups -->
            <div v-if="consolidated.length" class="space-y-2">
              <div class="text-xs font-semibold uppercase tracking-wide text-base-content/50">
                Consolidated items
              </div>
              <div
                v-for="grp in consolidated"
                :key="grp.reference_no"
                class="rounded-lg border border-base-200"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-base-200/40"
                  @click="toggleExpand(grp.reference_no)"
                >
                  <Icon
                    :name="isExpanded(grp.reference_no) ? 'lucide:chevron-down' : 'lucide:chevron-right'"
                    class="h-4 w-4 shrink-0"
                  />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold" :title="grp.name">{{ grp.name || grp.reference_no }}</span>
                    <span class="flex items-center gap-1.5 text-xs text-base-content/50">
                      <span class="font-mono">{{ grp.reference_no }}</span>
                      <span class="opacity-40">·</span>
                      <span>{{ grp.item_count }} items</span>
                    </span>
                  </span>
                  <span class="shrink-0 font-mono text-xs text-base-content/60">
                    Total Qnty {{ grp.total_quantity }} · {{ formatMoney(grp.total_budget) }}
                  </span>
                </button>

                <div v-if="isExpanded(grp.reference_no)" class="border-t border-base-200">
                  <table class="table table-sm w-full">
                    <thead>
                      <tr class="text-xs">
                        <th class="w-8"></th>
                        <th>Description</th>
                        <th>Mode</th>
                        <th class="text-right">Qty</th>
                        <th class="text-right">Unit</th>
                        <th class="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="child in grp.children" :key="child.id" class="hover:bg-base-200/40">
                        <td>
                          <input
                            v-if="isOnceOff(child)"
                            type="checkbox"
                            class="checkbox checkbox-sm"
                            :checked="isSelected(child.id)"
                            @change="toggleSelect(child.id)"
                          />
                          <button
                            v-else
                            type="button"
                            class="btn btn-ghost btn-xs"
                            title="Drill-down item — set quantity individually"
                            @click="emit('select-app', child)"
                          >
                            <Icon name="lucide:plus" class="h-3.5 w-3.5" />
                          </button>
                        </td>
                        <td class="max-w-xs truncate text-sm">{{ child.description }}</td>
                        <td>
                          <span class="badge badge-ghost badge-xs">{{ child.consumption_mode ?? '—' }}</span>
                        </td>
                        <td class="text-right font-mono text-xs">{{ child.quantity }}</td>
                        <td class="text-right font-mono text-xs">{{ formatMoney(child.unit_cost) }}</td>
                        <td class="text-right font-mono text-xs">{{ formatMoney(child.total_cost) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- Individual items -->
            <div v-if="individual.length" class="space-y-2">
              <div v-if="consolidated.length" class="text-xs font-semibold uppercase tracking-wide text-base-content/50">
                Individual items
              </div>
              <div class="overflow-x-auto">
                <table class="table table-sm w-full">
                  <thead>
                    <tr class="bg-base-200/30 text-xs">
                      <th>Ref</th>
                      <th>Description</th>
                      <th>Mode</th>
                      <th class="text-right">Qty</th>
                      <th class="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="it in individual"
                      :key="it.id"
                      class="cursor-pointer hover:bg-base-200/40"
                      @click="emit('select-app', it)"
                    >
                      <td class="font-mono text-xs">{{ it.reference_no ?? '—' }}</td>
                      <td class="max-w-xs truncate text-sm">{{ it.description }}</td>
                      <td>
                        <span class="badge badge-ghost badge-xs">{{ it.consumption_mode ?? '—' }}</span>
                      </td>
                      <td class="text-right font-mono text-xs">{{ it.quantity }}</td>
                      <td class="text-right font-mono text-xs">{{ formatMoney(it.total_cost) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div
              v-if="!consolidated.length && !individual.length"
              class="py-8 text-center text-sm text-base-content/40"
            >
              No matching APP line items.
            </div>
          </template>
        </div>

        <div class="mt-3 flex items-center justify-between text-xs text-base-content/50">
          <span>Individual page {{ meta.current_page }} of {{ meta.last_page }}</span>
          <div class="join">
            <button type="button" class="btn btn-xs join-item" :disabled="loading || meta.current_page <= 1" @click="page--">Prev</button>
            <button type="button" class="btn btn-xs join-item" :disabled="loading || meta.current_page >= meta.last_page" @click="page++">Next</button>
          </div>
        </div>
      </template>

      <template v-else>
        <p class="mt-2 text-sm text-base-content/60">
          No approved Annual Procurement Plan is linked. Enter the line item manually.
        </p>
        <div class="modal-action justify-start">
          <button type="button" class="btn btn-primary" @click="emit('manual')">Enter manually</button>
        </div>
      </template>

      <div class="modal-action">
        <button
          v-if="hasValidApp"
          type="button"
          class="btn btn-success"
          :disabled="selectedIds.length === 0"
          @click="addSelected"
        >
          Add selected ({{ selectedIds.length }})
        </button>
        <button type="button" class="btn" @click="close">Cancel</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button type="button" @click="close">close</button></form>
  </dialog>
</template>

<script setup>
const props = defineProps({
  hasValidApp: { type: Boolean, default: false },
  tenderUuid: { type: String, required: true },
})

const emit = defineEmits(['select-app', 'select-app-bulk', 'manual', 'close'])

const { getEligibleAppItemsGrouped } = useTenderHelper()

const dialogEl = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const search = ref('')
const page = ref(1)
const perPage = 25
const consolidated = ref([])
const individual = ref([])
const meta = reactive({ current_page: 1, last_page: 1, total: 0 })

const expandedRefs = ref([])
const selectedIds = ref([])

let searchTimer = null

function formatMoney(value) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function isOnceOff(item) {
  return String(item?.consumption_mode ?? '').toUpperCase() === 'ONCE_OFF'
}

function isExpanded(reference) {
  return expandedRefs.value.includes(reference)
}

function toggleExpand(reference) {
  expandedRefs.value = isExpanded(reference)
    ? expandedRefs.value.filter((r) => r !== reference)
    : [...expandedRefs.value, reference]
}

function isSelected(id) {
  return selectedIds.value.includes(id)
}

function toggleSelect(id) {
  selectedIds.value = isSelected(id)
    ? selectedIds.value.filter((x) => x !== id)
    : [...selectedIds.value, id]
}

function addSelected() {
  if (selectedIds.value.length === 0) return
  emit('select-app-bulk', [...selectedIds.value])
}

async function load() {
  if (!props.hasValidApp || !props.tenderUuid) return
  loading.value = true
  errorMessage.value = ''
  try {
    const { data, error } = await getEligibleAppItemsGrouped(props.tenderUuid, {
      page: page.value,
      per_page: perPage,
      search: search.value?.trim() || undefined,
    })
    if (error.value) {
      errorMessage.value = 'Failed to load APP items.'
      consolidated.value = []
      individual.value = []
      return
    }
    const payload = data.value?.data ?? {}
    consolidated.value = payload.consolidated ?? []
    const ind = payload.individual ?? {}
    individual.value = ind.data ?? []
    meta.current_page = ind.current_page ?? 1
    meta.last_page = ind.last_page ?? 1
    meta.total = ind.total ?? 0
  } finally {
    loading.value = false
  }
}

function open() {
  page.value = 1
  search.value = ''
  expandedRefs.value = []
  selectedIds.value = []
  dialogEl.value?.showModal?.()
  if (props.hasValidApp) load()
}

function close() {
  dialogEl.value?.close?.()
  emit('close')
}

watch(page, () => load())
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 1; load() }, 300)
})

defineExpose({ open, close })
</script>

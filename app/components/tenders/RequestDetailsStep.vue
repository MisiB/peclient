<template>
  <div class="w-full space-y-6">
    <div v-if="planWarning" class="alert alert-warning border border-warning/30 bg-warning/10">
      <Icon name="lucide:alert-circle" class="h-5 w-5 shrink-0" />
      <span class="text-sm leading-relaxed">{{ planWarning }}</span>
    </div>

    <div v-if="errors.form" class="alert alert-error border border-error/30 bg-error/10">
      <Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" />
      <span class="text-sm leading-relaxed">{{ errors.form }}</span>
    </div>

    <form class="space-y-6" @submit.prevent="handleSubmit">
      <!-- 1. Overview -->
      <section class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-5 p-5 sm:p-6">
          <header class="flex gap-4 border-b border-base-200 pb-4">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name="lucide:file-text" class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold tracking-tight text-base-content">
                Tender overview
              </h2>
              <p class="mt-1 text-sm leading-relaxed text-base-content/60">
                Give this procurement a clear name and a short description of goods, works, or services so reviewers and bidders understand the scope.
              </p>
            </div>
          </header>
          <div class="grid grid-cols-1 gap-4">
            <label class="fieldset w-full">
              <TendersFieldLegend help-key="title" label="Title" />
              <input
                v-model="form.title"
                type="text"
                class="input input-bordered w-full"
                :class="errors.title ? 'input-error' : ''"
                placeholder="e.g. Supply of office furniture — Region North"
              />
              <label v-if="errors.title" class="label">
                <span class="label-text-alt text-error">{{ errors.title }}</span>
              </label>
            </label>
            <label class="fieldset w-full">
              <TendersFieldLegend help-key="description" label="Description" />
              <textarea
                v-model="form.description"
                class="textarea textarea-bordered min-h-28 w-full"
                :class="errors.description ? 'textarea-error' : ''"
                placeholder="Summarise requirements, quantities or context, and any constraints bidders should know."
                rows="4"
              />
              <label v-if="errors.description" class="label">
                <span class="label-text-alt text-error">{{ errors.description }}</span>
              </label>
            </label>
          </div>
        </div>
      </section>

      <!-- 2. Project & timeline -->
      <section class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-5 p-5 sm:p-6">
          <header class="flex gap-4 border-b border-base-200 pb-4">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary/30 text-secondary-content">
              <Icon name="lucide:calendar-clock" class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold tracking-tight text-base-content">
                Project and timing
              </h2>
              <p class="mt-1 text-sm leading-relaxed text-base-content/60">
                Link this tender to an internal project label, when the need was raised, how soon delivery is expected, and optional priority for planning.
              </p>
            </div>
          </header>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label class="fieldset sm:col-span-2">
              <TendersFieldLegend help-key="projectname" label="Project name" />
              <input
                v-model="form.projectname"
                type="text"
                class="input input-bordered w-full"
                placeholder="Optional — internal programme or project code"
              />
            </label>
            <label class="fieldset">
              <TendersFieldLegend help-key="user_requisition_date" label="User requisition date" />
              <input v-model="form.user_requisition_date" type="date" class="input input-bordered w-full" />
            </label>
            <label class="fieldset">
              <TendersFieldLegend help-key="priority" label="Priority" />
              <select v-model="form.priority" class="select select-bordered w-full">
                <option
                  v-for="opt in TENDER_PRIORITY_OPTIONS"
                  :key="opt.value === null ? 'priority-none' : opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </label>
            <label class="fieldset sm:col-span-2">
              <TendersFieldLegend help-key="delivery" label="Delivery expectations" />
              <input
                v-model="form.delivery"
                type="text"
                class="input input-bordered w-full"
                placeholder="Optional — location, timeframe, or phasing notes"
              />
            </label>
          </div>
        </div>
      </section>

      <!-- 3. Procurement rules -->
      <section class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-5 p-5 sm:p-6">
          <header class="flex gap-4 border-b border-base-200 pb-4">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent-content">
              <Icon name="lucide:scale" class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold tracking-tight text-base-content">
                Procurement method and classification
              </h2>
              <p class="mt-1 text-sm leading-relaxed text-base-content/60">
                Choose the procurement group and method that apply, how bids will be opened, whether spend is capital or operating, contract shape, and an optional tender reference number.
              </p>
            </div>
          </header>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label class="fieldset sm:col-span-2">
              <TendersFieldLegend help-key="procurementgroup_id" label="Procurement group" />
              <select v-model="form.procurementgroup_id" class="select select-bordered w-full">
                <option :value="null">Select a group</option>
                <option v-for="g in procurementGroups" :key="g.id" :value="g.id">
                  {{ g.code }} — {{ g.name }}
                </option>
              </select>
            </label>
            <label class="fieldset">
              <TendersFieldLegend help-key="procurementmethod_id" label="Procurement method" />
              <select
                v-model="form.procurementmethod_id"
                class="select select-bordered w-full"
                :class="errors.procurementmethod_id ? 'select-error' : ''"
              >
                <option disabled :value="null">Select a method</option>
                <option v-for="m in procurementMethods" :key="m.id" :value="m.id">
                  {{ m.code }} — {{ m.name }}
                </option>
              </select>
              <label v-if="errors.procurementmethod_id" class="label">
                <span class="label-text-alt text-error">{{ errors.procurementmethod_id }}</span>
              </label>
            </label>
            <label class="fieldset">
              <TendersFieldLegend help-key="expensecategory" label="Expense category" />
              <select
                v-model="form.expensecategory"
                class="select select-bordered w-full"
                :class="errors.expensecategory ? 'select-error' : ''"
              >
                <option disabled value="">Select</option>
                <option value="CapEx">CapEx</option>
                <option value="MOOE">MOOE</option>
              </select>
              <label v-if="errors.expensecategory" class="label">
                <span class="label-text-alt text-error">{{ errors.expensecategory }}</span>
              </label>
            </label>
            <label class="fieldset">
              <TendersFieldLegend help-key="bidopeningtype_id" label="Bid opening type" />
              <select v-model="form.bidopeningtype_id" class="select select-bordered w-full">
                <option :value="null">—</option>
                <option v-for="b in bidOpeningTypes" :key="b.id" :value="b.id">
                  {{ b.code }} — {{ b.name }}
                </option>
              </select>
            </label>
            <label class="fieldset">
              <TendersFieldLegend help-key="contracttype" label="Contract type" />
              <select
                v-model="form.contracttype"
                class="select select-bordered w-full"
                :class="errors.contracttype ? 'select-error' : ''"
              >
                <option disabled value="">Select</option>
                <option value="AWARD">AWARD</option>
                <option value="FRAMEWORK">FRAMEWORK</option>
              </select>
              <label v-if="errors.contracttype" class="label">
                <span class="label-text-alt text-error">{{ errors.contracttype }}</span>
              </label>
            </label>
            <label class="fieldset sm:col-span-2">
              <TendersFieldLegend help-key="tendernumber" label="Tender number (optional)" />
              <input
                v-model="form.tendernumber"
                type="text"
                class="input input-bordered w-full"
                placeholder="Leave blank to auto-generate a reference for this tender"
              />
            </label>
            <div
              class="rounded-box border p-4 sm:col-span-2 transition-colors"
              :class="bidSecuritySectionClass"
            >
              <p class="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-base-content/50">
                Bid security
                <TendersFieldInfoPopover
                  :title="TENDER_FIELD_HELP.bidSecurity.title"
                  :intro="TENDER_FIELD_HELP.bidSecurity.intro"
                />
              </p>
              <p class="mt-1 text-sm text-base-content/60">
                <template v-if="!form.procurementmethod_id">
                  Select a procurement method to configure bid bond requirements.
                </template>
                <template v-else-if="!methodAllowsBidBond">
                  The selected procurement method does not support bid bonds.
                </template>
                <template v-else>
                  Indicate whether bidders must provide a bid bond and, if yes, how long bids remain valid.
                </template>
              </p>
              <div
                class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
                :class="{ 'pointer-events-none opacity-50': !bidSecurityEnabled }"
              >
                <label class="fieldset mb-0">
                  <TendersFieldLegend help-key="required_bid_bond" label="Require bid bond?" />
                  <select
                    v-model="form.required_bid_bond"
                    class="select select-bordered w-full"
                    :class="errors.required_bid_bond ? 'select-error' : ''"
                    :disabled="!bidSecurityEnabled"
                  >
                    <option disabled :value="null">Select</option>
                    <option value="Y">Yes — I require a bid bond</option>
                    <option value="N">No — bid bond not required</option>
                  </select>
                  <label v-if="errors.required_bid_bond" class="label">
                    <span class="label-text-alt text-error">{{ errors.required_bid_bond }}</span>
                  </label>
                </label>
                <label v-if="form.required_bid_bond === 'Y'" class="fieldset mb-0">
                  <TendersFieldLegend help-key="bid_validity_period" label="Bid validity period" />
                  <select
                    v-model="form.bid_validity_period"
                    class="select select-bordered w-full"
                    :class="errors.bid_validity_period ? 'select-error' : ''"
                    :disabled="!bidSecurityEnabled"
                  >
                    <option disabled :value="null">Select days</option>
                    <option v-for="opt in bidValidityOptions" :key="opt.days" :value="opt.days">
                      {{ opt.days }} days
                    </option>
                  </select>
                  <label v-if="errors.bid_validity_period" class="label">
                    <span class="label-text-alt text-error">{{ errors.bid_validity_period }}</span>
                  </label>
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 4. Bidders & responses -->
      <section class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-5 p-5 sm:p-6">
          <header class="flex gap-4 border-b border-base-200 pb-4">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-info/15 text-info">
              <Icon name="lucide:users" class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold tracking-tight text-base-content">
                Bidders and bid structure
              </h2>
              <p class="mt-1 text-sm leading-relaxed text-base-content/60">
                Define who may bid, the LOT type, and how offers and responses are combined so the tender matches your evaluation approach.
              </p>
            </div>
          </header>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label class="fieldset sm:col-span-2">
              <TendersFieldLegend help-key="allowed_participants" label="Allowed participants" />
              <select
                v-model="form.allowed_participants"
                class="select select-bordered w-full"
                :class="errors.allowed_participants ? 'select-error' : ''"
              >
                <option disabled value="">Select</option>
                <option value="Domestic">Domestic</option>
                <option value="International">International</option>
              </select>
              <label v-if="errors.allowed_participants" class="label">
                <span class="label-text-alt text-error">{{ errors.allowed_participants }}</span>
              </label>
            </label>

            <div class="fieldset sm:col-span-2">
              <div class="mb-1 flex items-center justify-between">
                <span class="text-sm font-medium text-base-content">Required supplier categories</span>
                <span class="badge badge-ghost badge-sm">{{ form.supplier_category_ids.length }} selected</span>
              </div>
              <p class="mb-2 text-xs leading-relaxed text-base-content/60">
                Restrict eligibility to suppliers registered in specific categories. Leave empty to allow any registered supplier.
              </p>
              <div class="rounded-box border border-base-200 bg-base-100">
                <div class="border-b border-base-200 p-2">
                  <label class="input input-sm input-bordered flex items-center gap-2">
                    <Icon name="lucide:search" class="h-4 w-4 text-base-content/40" />
                    <input
                      v-model="supplierCategorySearch"
                      type="text"
                      class="grow"
                      placeholder="Search categories…"
                    >
                  </label>
                </div>
                <div class="max-h-56 space-y-1 overflow-y-auto p-2">
                  <p v-if="filteredSupplierCategories.length === 0" class="px-1 py-3 text-center text-sm text-base-content/50">
                    No supplier categories match your search.
                  </p>
                  <label
                    v-for="c in filteredSupplierCategories"
                    :key="c.id"
                    class="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-base-200/50"
                  >
                    <input
                      type="checkbox"
                      class="checkbox checkbox-sm mt-0.5"
                      :checked="form.supplier_category_ids.includes(c.id)"
                      @change="toggleSupplierCategory(c.id)"
                    >
                    <span class="min-w-0">
                      <span class="block text-sm font-medium leading-snug">{{ c.name }}</span>
                      <span class="block font-mono text-xs text-base-content/50">{{ c.code }}</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <label class="fieldset">
              <TendersFieldLegend help-key="lotType" label="LOT type" />
              <select
                v-model="form.item_selection_mode"
                class="select select-bordered w-full"
                :class="errors.item_selection_mode ? 'select-error' : ''"
              >
                <option disabled value="">Select LOT type</option>
                <option value="MULTIPLE">MULTIPLE</option>
                <option value="SINGLE">SINGLE</option>
              </select>
              <label v-if="errors.item_selection_mode" class="label">
                <span class="label-text-alt text-error">{{ errors.item_selection_mode }}</span>
              </label>
            </label>
            <label class="fieldset">
              <TendersFieldLegend help-key="responseMode" label="Response mode" />
              <select
                v-model="form.response_mode"
                class="select select-bordered w-full"
                :class="errors.response_mode ? 'select-error' : ''"
              >
                <option disabled value="">Select</option>
                <option value="MULTIPLE">MULTIPLE</option>
                <option value="SINGLE">SINGLE</option>
              </select>
              <label v-if="errors.response_mode" class="label">
                <span class="label-text-alt text-error">{{ errors.response_mode }}</span>
              </label>
            </label>
            <label class="fieldset sm:col-span-2">
              <TendersFieldLegend help-key="responseRules" label="Response rules" />
              <select
                v-model="form.response_rules"
                class="select select-bordered w-full"
                :class="errors.response_rules ? 'select-error' : ''"
              >
                <option disabled value="">Select</option>
                <option value="ALL ITEMS">ALL ITEMS</option>
                <option value="SELECTED">SELECTED</option>
              </select>
              <label v-if="errors.response_rules" class="label">
                <span class="label-text-alt text-error">{{ errors.response_rules }}</span>
              </label>
            </label>
          </div>
        </div>
      </section>

      <!-- 5. Evaluation -->
      <section class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-5 p-5 sm:p-6">
          <header class="flex gap-4 border-b border-base-200 pb-4">
            <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
              <Icon name="lucide:clipboard-check" class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-semibold tracking-tight text-base-content">
                Bid evaluation
              </h2>
              <p class="mt-1 text-sm leading-relaxed text-base-content/60">
                Pick the evaluation approach linked to your procurement group. Only criteria assigned to that group appear here; this guides how bids will be scored or compared.
              </p>
            </div>
          </header>
          <label class="fieldset w-full max-w-xl">
            <TendersFieldLegend help-key="evaluationcriterion_id" label="Evaluation method" />
            <select
              v-model="form.evaluationcriterion_id"
              class="select select-bordered w-full"
              :disabled="!form.procurementgroup_id"
            >
              <option :value="null">—</option>
              <option v-for="e in evaluationCriteria" :key="e.id" :value="e.id">
                {{ e.code }} — {{ e.name }}
              </option>
            </select>
            <p v-if="!form.procurementgroup_id" class="mt-2 text-sm text-base-content/50">
              Select a procurement group above to load evaluation methods configured for that group.
            </p>
            <p v-else-if="loadingEvaluationCriteria" class="mt-2 flex items-center gap-2 text-sm text-base-content/60">
              <span class="loading loading-spinner loading-xs" />
              Loading criteria…
            </p>
            <p v-else-if="evaluationCriteria.length === 0" class="mt-2 text-sm text-warning">
              No evaluation criteria are assigned to this procurement group yet. Contact your administrator to attach criteria to the group.
            </p>
          </label>
        </div>
      </section>

      <!-- Actions -->
      <div class="flex flex-col items-stretch justify-end gap-3 border-t border-base-200 pt-2 sm:flex-row sm:items-center sm:justify-end">
        <p class="text-center text-xs text-base-content/50 sm:mr-auto sm:text-left">
          Fields marked by validation messages must be corrected before you can save.
        </p>
        <button class="btn btn-primary min-w-[10rem]" type="submit" :disabled="submitting">
          <span v-if="submitting" class="loading loading-spinner loading-sm" />
          <span v-else>{{ submitLabel }}</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { TENDER_FIELD_HELP } from '~/utils/tenderFieldHelp'
import { TenderStep1Schema, TENDER_PRIORITY_CODES, TENDER_PRIORITY_OPTIONS } from '~/utils/TenderSchema'

const props = defineProps({
  tenderUuid: { type: String, default: '' },
  mode: { type: String, default: 'create' }, // create | edit
})

function normalizePriorityFromApi(value) {
  if (value == null || value === '') {
    return null
  }
  const upper = String(value).trim().toUpperCase()
  return TENDER_PRIORITY_CODES.includes(upper) ? upper : null
}

const emit = defineEmits(['saved'])

const { getCompanyPlan } = useDashboardHelper()
const { getProcurementGroups, getProcurementMethods } = useAnnualprocurementplanHelper()
const { getBidOpeningTypes, getBidValidityPeriodFees, getSupplierCategories, getEvaluationCriteriaForProcurementGroup, createTender, updateTender, getTender } = useTenderHelper()

const procurementGroups = ref([])
const procurementMethods = ref([])
const bidOpeningTypes = ref([])
const bidValidityFees = ref([])
const evaluationCriteria = ref([])
const loadingEvaluationCriteria = ref(false)
const supplierCategories = ref([])
const supplierCategorySearch = ref('')

const DEFAULT_VALIDITY_PERIODS = [30, 60, 90, 120]

/** Map the tender's allowed-participants value to the fee schedule's locality. */
const localityForParticipants = computed(() => {
  if (form.value.allowed_participants === 'Domestic') return 'local'
  if (form.value.allowed_participants === 'International') return 'foreign'
  return null
})

/**
 * Bid validity periods sourced from the bid_validity_period_fees table,
 * scoped to the chosen participants' locality (plus any 'all' rows). Falls
 * back to the standard 30/60/90/120 set when nothing is configured.
 */
const bidValidityOptions = computed(() => {
  const locality = localityForParticipants.value
  const relevant = bidValidityFees.value.filter(
    (f) => !locality || f.locality === locality || f.locality === 'all',
  )

  const byPeriod = new Map()
  for (const fee of relevant) {
    const days = Number(fee.bid_validity_period)
    if (!Number.isFinite(days)) continue
    if (!byPeriod.has(days)) {
      byPeriod.set(days, { days, fee })
    }
  }

  if (byPeriod.size === 0) {
    return DEFAULT_VALIDITY_PERIODS.map((days) => ({ days, fee: null }))
  }

  return [...byPeriod.values()].sort((a, b) => a.days - b.days)
})

const planWarning = ref('')
const submitting = ref(false)

const form = ref({
  title: '',
  description: '',
  projectname: '',
  user_requisition_date: '',
  delivery: '',
  priority: null,
  procurementgroup_id: null,
  procurementmethod_id: null,
  expensecategory: '',
  bidopeningtype_id: null,
  contracttype: '',
  item_selection_mode: '',
  response_mode: '',
  response_rules: '',
  tendernumber: '',
  allowed_participants: '',
  required_bid_bond: null,
  bid_validity_period: null,
  evaluationcriterion_id: null,
  supplier_category_ids: [],
})

const filteredSupplierCategories = computed(() => {
  const term = supplierCategorySearch.value.trim().toLowerCase()
  if (!term) return supplierCategories.value
  return supplierCategories.value.filter(
    (c) => `${c.code} ${c.name}`.toLowerCase().includes(term),
  )
})

function toggleSupplierCategory(id) {
  const set = new Set(form.value.supplier_category_ids)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  form.value.supplier_category_ids = [...set]
}

const errors = reactive({ form: '' })

const submitLabel = computed(() => props.mode === 'edit' ? 'Save changes' : 'Save & continue')

const selectedMethod = computed(() => procurementMethods.value.find(m => m.id === form.value.procurementmethod_id) ?? null)
const methodAllowsBidBond = computed(() => Boolean(selectedMethod.value?.can_request_bidbond))
const bidSecurityEnabled = computed(() => Boolean(form.value.procurementmethod_id) && methodAllowsBidBond.value)
const bidSecuritySectionClass = computed(() => {
  if (!form.value.procurementmethod_id) {
    return 'border-base-200 bg-base-200/20'
  }
  if (!methodAllowsBidBond.value) {
    return 'border-base-200 bg-base-200/30'
  }
  return 'border-primary/20 bg-primary/5'
})

watch(
  () => form.value.procurementmethod_id,
  (newId, oldId) => {
    if (oldId !== undefined && oldId !== null && newId !== oldId) {
      form.value.required_bid_bond = null
      form.value.bid_validity_period = null
    } else if (!methodAllowsBidBond.value) {
      form.value.required_bid_bond = null
      form.value.bid_validity_period = null
    }
  },
)

watch(
  () => form.value.required_bid_bond,
  (val) => {
    if (val !== 'Y') {
      form.value.bid_validity_period = null
    }
  },
)

// Clear a chosen validity period when it is no longer offered for the
// currently selected participants' locality (options come from the DB).
watch(bidValidityOptions, (options) => {
  if (
    form.value.bid_validity_period != null
    && !options.some((o) => o.days === form.value.bid_validity_period)
  ) {
    form.value.bid_validity_period = null
  }
})

watch(
  () => form.value.procurementgroup_id,
  async (newId, oldId) => {
    if (oldId !== undefined && oldId !== null && newId !== oldId) {
      form.value.evaluationcriterion_id = null
    }
    await reloadEvaluationCriteria()
  },
  { immediate: true },
)

async function loadLookups() {
  const [groupsRes, methodsRes, openingRes, validityRes, categoriesRes] = await Promise.all([
    getProcurementGroups(),
    getProcurementMethods(),
    getBidOpeningTypes(),
    getBidValidityPeriodFees(),
    getSupplierCategories(),
  ])

  procurementGroups.value = groupsRes.data.value?.data ?? []
  procurementMethods.value = methodsRes.data.value?.data ?? []
  bidOpeningTypes.value = openingRes.data.value?.data ?? []
  bidValidityFees.value = validityRes.data.value?.data ?? []
  supplierCategories.value = categoriesRes.data.value?.data ?? []
}

async function reloadEvaluationCriteria() {
  loadingEvaluationCriteria.value = true
  try {
    const groupId = form.value.procurementgroup_id
    const { data, error } = await getEvaluationCriteriaForProcurementGroup(groupId)
    if (error.value) {
      evaluationCriteria.value = []
      return
    }
    evaluationCriteria.value = data.value?.data ?? []
    if (
      form.value.evaluationcriterion_id != null
      && !evaluationCriteria.value.some((e) => e.id === form.value.evaluationcriterion_id)
    ) {
      form.value.evaluationcriterion_id = null
    }
  } finally {
    loadingEvaluationCriteria.value = false
  }
}

async function loadPlanWarning() {
  try {
    const { data, error } = await getCompanyPlan()
    if (error.value) {
      planWarning.value = 'Unable to verify Annual Procurement Plan status right now. If no approved plan exists, this will be an unplanned procurement.'
      return
    }
    const payload = data.value?.data ?? {}
    const plan = payload.plan
    const status = String(plan?.status ?? '')
    if (!plan || !['AUTHORIZED', 'ACTIVE'].includes(status)) {
      planWarning.value = 'No approved Annual Procurement Plan found for the current year. This tender will be treated as an unplanned procurement.'
    }
  } catch {
    planWarning.value = 'Unable to verify Annual Procurement Plan status right now. If no approved plan exists, this will be an unplanned procurement.'
  }
}

async function loadExisting() {
  if (!props.tenderUuid) return
  const { data, error } = await getTender(props.tenderUuid)
  if (error.value) return
  const t = data.value?.data
  if (!t) return

  form.value = {
    ...form.value,
    title: t.title ?? '',
    description: t.description ?? '',
    projectname: t.projectname ?? '',
    user_requisition_date: (t.user_requisition_date ?? '').slice(0, 10),
    delivery: t.delivery ?? '',
    priority: normalizePriorityFromApi(t.priority),
    procurementgroup_id: t.procurementgroup_id ?? null,
    procurementmethod_id: t.procurementmethod_id ?? null,
    expensecategory: t.expensecategory ?? '',
    bidopeningtype_id: t.bidopeningtype_id ?? null,
    contracttype: t.contracttype ?? '',
    item_selection_mode: t.item_selection_mode ?? '',
    response_mode: t.response_mode ?? '',
    response_rules: t.response_rules ?? '',
    tendernumber: t.tendernumber ?? '',
    allowed_participants: t.allowed_participants ?? '',
    required_bid_bond: t.required_bid_bond === 'Y' || t.required_bid_bond === 'N' ? t.required_bid_bond : null,
    bid_validity_period: t.bid_validity_period ?? null,
    evaluationcriterion_id: t.evaluationcriterion_id ?? null,
    supplier_category_ids: (t.supplier_categories ?? []).map((c) => c.id),
  }
}

async function handleSubmit() {
  Object.keys(errors).forEach(k => { errors[k] = '' })

  try {
    submitting.value = true
    const payload = await TenderStep1Schema.validate(form.value, {
      abortEarly: false,
      context: { methodAllowsBidBond: methodAllowsBidBond.value },
    })

    if (props.mode === 'edit') {
      const { status, error } = await updateTender(props.tenderUuid, payload)
      if (!status.value) {
        errors.form = error.value?.data?.message ?? 'Failed to update tender.'
        return
      }
      emit('saved', { uuid: props.tenderUuid })
      return
    }

    const { status, data, error } = await createTender(payload)
    if (!status.value) {
      errors.form = error.value?.data?.message ?? 'Failed to create tender.'
      return
    }

    emit('saved', { uuid: data.value?.data?.uuid, tender: data.value?.data })
  } catch (err) {
    if (err?.inner?.length) {
      err.inner.forEach((e) => { errors[e.path] = e.message })
    } else if (err?.path) {
      errors[err.path] = err.message
    }
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadLookups(), loadPlanWarning()])
  if (props.mode === 'edit') {
    await loadExisting()
  }
})
</script>


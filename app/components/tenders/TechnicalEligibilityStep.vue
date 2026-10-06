<template>
  <div class="w-full space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div><h2 class="text-lg font-semibold">Technical eligibility</h2><p class="text-sm text-base-content/60">Review each product’s specifications and add any other grouped eligibility questions required from bidders.</p></div>
      <button class="btn btn-ghost btn-sm" type="button" @click="emit('back')"><Icon name="lucide:arrow-left" class="h-4 w-4" /> Back</button>
    </div>

    <div v-if="errorMessage" class="alert alert-error border border-error/30 bg-error/10"><Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" /><span>{{ errorMessage }}</span></div>
    <div v-if="importError" class="alert alert-warning py-2 text-sm"><Icon name="lucide:triangle-alert" class="h-4 w-4 shrink-0" /><span>{{ importError }}</span></div>
    <input ref="questionFileInput" type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="uploadQuestions">
    <div v-if="loading" class="card border border-base-200 bg-base-100"><div class="card-body flex items-center justify-center gap-2 p-10"><span class="loading loading-spinner" /> Loading products and eligibility groups…</div></div>
    <div v-else-if="!products.length" class="card border border-dashed border-warning/50 bg-warning/5"><div class="card-body items-center p-10 text-center"><Icon name="lucide:package-x" class="h-10 w-10 text-warning" /><p class="font-medium">No products or services are available.</p><p class="text-sm text-base-content/60">Go back to Step 2 and add products or services before configuring technical eligibility.</p></div></div>

    <template v-else>
      <div class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-4 p-4 sm:p-6">
          <div><h3 class="text-sm font-semibold">Select a product or service</h3><p class="text-xs text-base-content/60">Eligibility groups are configured separately under each product.</p></div>
          <div class="flex flex-wrap gap-2">
            <button v-for="product in products" :key="product.id" type="button" :class="['btn btn-sm', activeProductId === product.id ? 'btn-primary' : 'btn-outline']" @click="activeProductId = product.id">
              <span v-if="isMultipleLot" class="badge badge-sm">Lot {{ product.lot_number }}</span>{{ product.description }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="activeProduct" class="space-y-4">
        <div class="card border border-primary/25 bg-base-100 shadow-sm">
          <div class="card-body gap-4 p-4 sm:p-6">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div><div class="flex flex-wrap items-center gap-2"><span v-if="isMultipleLot" class="badge badge-primary">Lot {{ activeProduct.lot_number }}</span><h3 class="font-bold">{{ activeProduct.description }}</h3></div><p class="mt-1 text-xs text-base-content/60">Quantity: {{ activeProduct.quantity }}</p></div>
              <button class="btn btn-success btn-sm" type="button" @click="addGroup"><Icon name="lucide:folder-plus" class="h-4 w-4" /> Add eligibility group</button>
            </div>

            <section class="overflow-hidden rounded-xl border border-primary/30">
              <div class="flex items-center gap-3 border-b border-primary/20 bg-primary/5 px-4 py-3"><Icon name="lucide:settings-2" class="h-5 w-5 text-primary" /><div><h4 class="font-semibold">1. Product specifications</h4><p class="text-xs text-base-content/60">Automatically populated from the product breakdown in Step 2.</p></div><span class="badge badge-ghost badge-sm ml-auto">Read only</span></div>
              <div v-if="activeProduct.specifications?.length" class="overflow-x-auto p-4"><table class="table table-sm"><thead><tr><th>Specification</th><th>Requirement</th><th>Acceptance</th></tr></thead><tbody><tr v-for="specification in activeProduct.specifications" :key="specification.id"><td class="font-medium">{{ specification.label }}</td><td>{{ specification.value || '—' }}</td><td><span class="badge badge-ghost badge-sm">{{ ({ MANDATORY: 'Mandatory — exact match', EQUIVALENT_ALLOWED: 'Equivalent allowed', PREFERRED: 'Preferred' })[specification.acceptance_policy] || 'Equivalent allowed' }}</span></td></tr></tbody></table></div>
              <p v-else class="p-6 text-center text-sm text-base-content/50">No product specifications were added in Step 2.</p>
            </section>

            <section v-for="(group, groupIndex) in activeGroups" :key="group._key" class="rounded-xl border border-base-300 p-4">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
                <label class="fieldset min-w-0 flex-1"><span class="fieldset-legend">Eligibility group {{ groupIndex + 2 }}</span><input v-model.trim="group.title" type="text" class="input input-bordered w-full" :class="groupErrors[group._key] ? 'input-error' : ''" placeholder="e.g. Manufacturer authorisation"><span v-if="groupErrors[group._key]" class="mt-1 text-xs text-error">{{ groupErrors[group._key] }}</span></label>
                <button class="btn btn-ghost btn-sm text-error sm:mt-7" type="button" @click="removeGroup(groupIndex)"><Icon name="lucide:trash-2" class="h-4 w-4" /> Remove group</button>
              </div>
              <div class="mt-3 space-y-3 border-t border-base-200 pt-3">
                <div v-for="(row, questionIndex) in group.questions" :key="row._key" class="rounded-lg bg-base-200/40 p-3">
                  <div class="mb-2 flex justify-between"><span class="text-xs font-semibold">Question {{ questionIndex + 1 }}</span><button class="btn btn-ghost btn-xs text-error" type="button" @click="removeQuestion(group, questionIndex)"><Icon name="lucide:x" class="h-4 w-4" /> Remove</button></div>
                  <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px]"><label class="fieldset"><span class="fieldset-legend">Question</span><input v-model.trim="row.question" type="text" class="input input-bordered w-full" :class="rowErrors[row._key] ? 'input-error' : ''" placeholder="Enter a technical eligibility question"><span v-if="rowErrors[row._key]" class="mt-1 text-xs text-error">{{ rowErrors[row._key] }}</span></label><label class="fieldset"><span class="fieldset-legend">Response type</span><select v-model="row.response_type" class="select select-bordered w-full"><option value="YES_NO">Yes / No</option><option value="TEXT">Text</option><option value="UPLOAD">Upload file</option></select></label></div>
                </div>
                <p class="text-xs text-base-content/60">Use the Excel template to add questions to this group. Response Type accepts Yes / No, Text, or Upload File.</p>
                <div class="flex flex-wrap gap-2">
                  <button class="btn btn-outline btn-sm" type="button" @click="addQuestion(group)"><Icon name="lucide:plus" class="h-4 w-4" /> Add question</button>
                  <button class="btn btn-outline btn-sm" type="button" :disabled="downloadingTemplate || importing || saving" @click="downloadQuestionTemplate"><span v-if="downloadingTemplate" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:download" class="h-4 w-4" />{{ downloadingTemplate ? 'Preparing…' : 'Download template' }}</button>
                  <button class="btn btn-outline btn-primary btn-sm" type="button" :disabled="importing || downloadingTemplate || saving" @click="selectQuestionFile(group)"><span v-if="importing && uploadTargetGroup?._key === group._key" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:file-spreadsheet" class="h-4 w-4" />{{ importing && uploadTargetGroup?._key === group._key ? 'Uploading…' : 'Upload questions' }}</button>
                </div>
              </div>
            </section>

            <div v-if="!activeGroups.length" class="rounded-lg border border-dashed border-base-300 p-6 text-center text-base-content/50"><p class="text-sm">No additional eligibility groups for this product.</p><button class="btn btn-link btn-sm mt-1" type="button" @click="addGroup">Add a group</button></div>
          </div>
        </div>
      </div>
    </template>

    <TendersEvaluationSchemePanel v-if="tender" :tender="tender" @updated="reloadTender" />

    <div class="flex justify-end border-t border-base-200 pt-4"><button class="btn btn-primary w-full sm:w-auto" type="button" :disabled="saving || loading || !products.length" @click="saveAndContinue"><span v-if="saving" class="loading loading-spinner loading-sm" /><template v-else>Save &amp; continue <Icon name="lucide:arrow-right" class="h-4 w-4" /></template></button></div>
  </div>
</template>

<script setup>
import { useTenderHelper } from '~/composables/useTenderHelper'

const props = defineProps({ tenderUuid: { type: String, required: true } })
const emit = defineEmits(['saved', 'back'])
const toast = useToast()
const { getTender, getTenderTechnicalEligibilityQuestions, syncTenderTechnicalEligibilityQuestions, importTenderTechnicalEligibilityQuestions, downloadTenderTechnicalEligibilityQuestionTemplate } = useTenderHelper()
const tender = ref(null)
const loading = ref(true)
const saving = ref(false)
const importing = ref(false)
const downloadingTemplate = ref(false)
const errorMessage = ref('')
const importError = ref('')
const questionFileInput = ref(null)
const uploadTargetGroup = ref(null)
const isMultipleLot = ref(false)
const products = ref([])
const activeProductId = ref(null)
const groupsByProduct = ref({})
const groupErrors = reactive({})
const rowErrors = reactive({})
const activeProduct = computed(() => products.value.find(product => Number(product.id) === Number(activeProductId.value)) ?? null)
const activeGroups = computed(() => groupsByProduct.value[String(activeProductId.value)] ?? [])
const key = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
const newQuestion = (question = '', responseType = 'YES_NO') => ({ _key: key(), question, response_type: responseType })
const newGroup = (title = '', questions = []) => ({ _key: key(), title, questions })

function addGroup() { activeGroups.value.push(newGroup('', [newQuestion()])) }
function removeGroup(index) { activeGroups.value.splice(index, 1) }
function addQuestion(group) { group.questions.push(newQuestion()) }
function removeQuestion(group, index) { group.questions.splice(index, 1) }
function normalizeQuestion(value) { return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/[?]+$/, '') }

function selectQuestionFile(group) {
  uploadTargetGroup.value = group
  questionFileInput.value?.click()
}

async function downloadQuestionTemplate() {
  if (downloadingTemplate.value) return
  downloadingTemplate.value = true
  importError.value = ''
  try {
    const blob = await downloadTenderTechnicalEligibilityQuestionTemplate(props.tenderUuid)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'technical-eligibility-questions-template.xlsx'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    importError.value = error?.data?.message ?? 'Could not download the technical eligibility question template.'
  } finally {
    downloadingTemplate.value = false
  }
}

async function uploadQuestions(event) {
  const file = event.target.files?.[0]
  const targetGroup = uploadTargetGroup.value
  if (!file || !targetGroup || importing.value) return

  importing.value = true
  importError.value = ''
  try {
    const { data, status, error } = await importTenderTechnicalEligibilityQuestions(props.tenderUuid, file)
    if (!status.value) {
      const validationErrors = error.value?.data?.errors?.file
      importError.value = Array.isArray(validationErrors)
        ? validationErrors.join(' ')
        : error.value?.data?.message ?? 'Could not import technical eligibility questions. Check the spreadsheet and try again.'
      return
    }

    const imported = data.value?.data?.questions ?? []
    if (!imported.length) {
      importError.value = 'No technical eligibility questions were found in the spreadsheet.'
      return
    }

    const seen = new Set(targetGroup.questions.map(row => normalizeQuestion(row.question)).filter(Boolean))
    let added = 0
    for (const row of imported) {
      const normalized = normalizeQuestion(row.question)
      if (!normalized || seen.has(normalized)) continue
      seen.add(normalized)
      targetGroup.questions.push(newQuestion(row.question, row.response_type ?? 'YES_NO'))
      added++
    }

    if (added) {
      toast.success({ title: 'Questions uploaded', message: `${added} technical eligibility question${added === 1 ? '' : 's'} added to ${targetGroup.title || 'this eligibility group'}.`, position: 'topRight', layout: 2 })
    } else {
      importError.value = 'All questions in the spreadsheet already exist in this eligibility group.'
    }
  } finally {
    importing.value = false
    event.target.value = ''
    uploadTargetGroup.value = null
  }
}
function validate() {
  Object.keys(groupErrors).forEach(item => delete groupErrors[item])
  Object.keys(rowErrors).forEach(item => delete rowErrors[item])
  for (const product of products.value) {
    for (const group of groupsByProduct.value[String(product.id)] ?? []) {
      if (!group.title?.trim()) { groupErrors[group._key] = 'Group name is required.'; activeProductId.value = product.id; errorMessage.value = `Complete the eligibility groups for ${product.description}.`; return false }
      if (!group.questions.length) { groupErrors[group._key] = 'Add at least one question or remove this group.'; activeProductId.value = product.id; errorMessage.value = `Complete the eligibility groups for ${product.description}.`; return false }
      for (const row of group.questions) if (!row.question?.trim()) { rowErrors[row._key] = 'Question text is required.'; activeProductId.value = product.id; errorMessage.value = `Complete the eligibility groups for ${product.description}.`; return false }
    }
  }
  errorMessage.value = ''
  return true
}

function buildPayload() {
  return products.value.flatMap(product => (groupsByProduct.value[String(product.id)] ?? []).flatMap((group, groupIndex) => group.questions.map(row => ({ procurementrequestitem_id: product.procurementrequestitem_id, procurementrequestitem_product_id: product.id, group_title: group.title.trim(), group_sort_order: groupIndex + 1, question: row.question.trim(), response_type: row.response_type }))))
}

async function saveAndContinue() {
  if (!validate()) return
  saving.value = true
  const { data, status, error } = await syncTenderTechnicalEligibilityQuestions(props.tenderUuid, { questions: buildPayload() })
  saving.value = false
  if (!status?.value) { const errors = error?.value?.data?.errors; errorMessage.value = errors ? Object.values(errors).flat().join(' ') : error?.value?.data?.message || data?.value?.message || 'Failed to save technical eligibility.'; return }
  toast.success({ title: 'Saved', message: 'Product eligibility groups saved.', position: 'topRight', layout: 2 })
  emit('saved')
}

function groupRows(rows) {
  const grouped = new Map()
  for (const row of rows) {
    const title = row.group_title || 'General technical eligibility'
    const order = Number(row.group_sort_order ?? 1)
    const mapKey = `${order}:${title}`
    if (!grouped.has(mapKey)) grouped.set(mapKey, { order, group: newGroup(title, []) })
    grouped.get(mapKey).group.questions.push(newQuestion(row.question, row.response_type))
  }
  return [...grouped.values()].sort((a, b) => a.order - b.order).map(entry => entry.group)
}

async function load() {
  loading.value = true
  const [{ data, error }, tenderResult] = await Promise.all([
    getTenderTechnicalEligibilityQuestions(props.tenderUuid),
    getTender(props.tenderUuid),
  ])
  tender.value = tenderResult.data.value?.data ?? null
  if (error.value) { errorMessage.value = error.value?.data?.message || 'Failed to load technical eligibility.'; loading.value = false; return }
  const payload = data.value?.data ?? {}
  isMultipleLot.value = Boolean(payload.is_multiple_lot)
  products.value = payload.products ?? []
  const grouped = {}
  for (const product of products.value) grouped[String(product.id)] = groupRows(product.questions ?? [])
  const legacy = (payload.questions ?? []).filter(row => !row.procurementrequestitem_product_id)
  if (legacy.length && products.value[0]) grouped[String(products.value[0].id)].push(...groupRows(legacy))
  groupsByProduct.value = grouped
  activeProductId.value = products.value[0]?.id ?? null
  loading.value = false
}

async function reloadTender() {
  const { data } = await getTender(props.tenderUuid)
  tender.value = data.value?.data ?? tender.value
}

onMounted(load)
</script>

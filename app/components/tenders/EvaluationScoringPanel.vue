<template>
  <section class="card border border-base-200 bg-base-100 shadow-sm">
    <div class="card-body gap-5 p-4 sm:p-5">
      <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex gap-3"><div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info"><Icon name="lucide:list-checks" class="h-5 w-5" /></div><div><h2 class="font-semibold">{{ rfqMode ? 'RFQ compliance review' : 'Bid evaluation' }}</h2><p class="text-sm text-base-content/60">{{ rfqMode ? 'Confirm compliance and the evaluated quotation amount for every response before making a recommendation.' : 'Individual scores are recorded first. Consensus produces a ranked recommendation, not an automatic award.' }}</p></div></div>
        <span v-if="scheme" class="badge badge-outline">{{ scheme.method?.name || 'Locked scheme' }}</span>
      </header>

      <div v-if="message" class="alert py-2" :class="messageOk ? 'alert-success' : 'alert-error'"><Icon :name="messageOk ? 'lucide:check-circle-2' : 'lucide:alert-triangle'" class="h-4 w-4" /><span class="text-sm">{{ message }}</span></div>
      <div v-if="loading" class="flex items-center gap-2 text-sm text-base-content/50"><span class="loading loading-spinner loading-sm" /> Loading evaluation workspace…</div>

      <template v-else>
        <div v-if="!stageAvailable" class="alert alert-info"><Icon name="lucide:lock" class="h-5 w-5" />Technical consensus is locked. An authorised bid-opening user must open the qualified financial envelopes before financial evaluation can begin.</div>
        <div v-if="bids.length === 0" class="rounded-lg border border-dashed border-base-300 p-6 text-center text-sm text-base-content/50">No submitted bids are available for evaluation.</div>
        <div v-else class="space-y-3">
          <details v-for="bid in bids" :key="bid.uuid" class="collapse-arrow collapse border border-base-200 bg-base-100">
            <summary class="collapse-title flex flex-wrap items-center gap-2 pr-10"><span class="font-medium">{{ bid.company?.name || bid.uuid }}</span><span class="badge badge-sm" :class="bid.form.submitted ? 'badge-success' : 'badge-warning'">{{ bid.form.submitted ? 'Submitted' : 'Draft' }}</span><span class="ml-auto text-sm text-base-content/55">{{ bidTechnicalTotal(bid) }} technical points</span></summary>
            <div class="collapse-content space-y-4">
              <div class="overflow-x-auto rounded-lg border border-base-200">
                <table class="table table-sm"><thead><tr><th>Criterion</th><th>Stage</th><th>Weight</th><th class="w-32">Score / 100</th><th>Comment</th></tr></thead><tbody>
                  <tr v-for="criterion in stageCriteria" :key="criterion.id">
                    <td><p class="font-medium">{{ criterion.name }}</p><p v-if="criterion.minimum_score != null" class="text-xs text-base-content/50">Minimum {{ criterion.minimum_score }}</p></td>
                    <td><span class="badge badge-sm badge-ghost">{{ criterion.stage }}</span></td><td>{{ criterion.weight }}%</td>
                    <td><select v-if="rfqMode" v-model.number="bid.form.scores[criterion.id].score" class="select select-sm select-bordered w-40" :disabled="bid.form.submitted" required><option :value="null" disabled>Select decision</option><option :value="100">Compliant</option><option :value="0">Not compliant</option></select><input v-else v-model.number="bid.form.scores[criterion.id].score" type="number" min="0" max="100" step="0.01" class="input input-sm input-bordered w-28" :disabled="bid.form.submitted" required></td>
                    <td><input v-model.trim="bid.form.scores[criterion.id].comment" class="input input-sm input-bordered w-full" :disabled="bid.form.submitted" placeholder="Assessment note"></td>
                  </tr>
                </tbody></table>
              </div>
              <div class="grid gap-3 sm:grid-cols-2"><label v-if="rfqMode || activeStage === 'FINANCIAL'" class="fieldset"><span class="fieldset-legend">Evaluated amount</span><input v-model.number="bid.form.evaluated_amount" type="number" min="0" step="0.01" class="input input-bordered" :disabled="bid.form.submitted" required></label><label class="fieldset"><span class="fieldset-legend">Evaluator comments</span><textarea v-model.trim="bid.form.comments" class="textarea textarea-bordered" :disabled="bid.form.submitted" /></label></div>
              <div v-if="!bid.form.submitted" class="flex flex-wrap justify-end gap-2"><button class="btn btn-outline btn-sm" :disabled="saving || !stageAvailable" @click="saveBid(bid, false)">Save draft</button><button class="btn btn-primary btn-sm" :disabled="saving || !stageAvailable" @click="saveBid(bid, true)"><Icon name="lucide:send" class="h-4 w-4" /> Submit assessment</button></div>
            </div>
          </details>
        </div>

        <form v-if="!rfqMode && props.tender.status === 'UNDER_EVALUATION' && bids.length && stageAvailable" class="rounded-lg border border-base-200 bg-base-200/20 p-4" @submit.prevent="buildConsensus">
          <h3 class="font-semibold">{{ activeStage === 'FINANCIAL' ? 'Final QCBS consensus' : 'Technical consensus' }}</h3><p class="mb-3 text-xs text-base-content/55">Available once every active voting evaluator has submitted every bid in this stage.</p>
          <div class="grid gap-3 sm:grid-cols-2"><label class="fieldset"><span class="fieldset-legend">Recommended bidder</span><select v-model.number="consensus.recommended_supplier_bid_id" class="select select-bordered"><option :value="null">No recommendation</option><option v-for="bid in bids" :key="bid.uuid" :value="bid.id">{{ bid.company?.name || bid.uuid }}</option></select></label><label class="fieldset"><span class="fieldset-legend">Recommendation</span><input v-model.trim="consensus.recommendation" class="input input-bordered" placeholder="Committee recommendation"></label><label class="fieldset sm:col-span-2"><span class="fieldset-legend">Consensus notes</span><textarea v-model.trim="consensus.consensus_notes" class="textarea textarea-bordered w-full" /></label></div>
          <div class="mt-3 flex justify-end"><button class="btn btn-info" type="submit" :disabled="saving"><Icon name="lucide:calculator" class="h-4 w-4" /> Calculate consensus and ranking</button></div>
        </form>

        <div v-if="results.length" class="overflow-x-auto rounded-lg border border-base-200"><table class="table table-sm"><thead><tr><th>Rank</th><th>Bidder</th><th>Technical</th><th>Financial</th><th>Total</th><th>Result</th></tr></thead><tbody><tr v-for="result in results" :key="result.id"><td>{{ result.rank }}</td><td>{{ bidderName(result.supplier_bid_id, result) }}</td><td>{{ result.consensus_technical_score }}</td><td>{{ result.consensus_financial_score }}</td><td class="font-semibold">{{ result.consensus_total_score }}</td><td><span class="badge badge-sm" :class="result.passed ? 'badge-success' : 'badge-error'">{{ result.passed ? 'Passed' : 'Failed' }}</span></td></tr></tbody></table></div>

        <div v-if="consultancySelection && results.some(result => result.passed)" class="rounded-lg border border-primary/25 bg-primary/5 p-4">
          <h3 class="font-semibold">Consultancy negotiation</h3>
          <p class="mb-4 text-xs text-base-content/55">Negotiate in ranking order. A failed firm cannot be reopened; the next ranked qualified firm then becomes eligible.</p>
          <div v-if="negotiations.length" class="mb-4 space-y-2">
            <div v-for="item in negotiations" :key="item.uuid" class="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-base-100 p-3 text-sm">
              <span>#{{ item.rank }} {{ item.supplier_bid?.company?.name || `Bid ${item.supplier_bid_id}` }} · round {{ item.round }}</span>
              <span class="badge" :class="item.status === 'SUCCESSFUL' ? 'badge-success' : item.status === 'FAILED' ? 'badge-error' : 'badge-warning'">{{ item.status }}</span>
            </div>
          </div>
          <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="saveNegotiation">
            <label class="fieldset"><span class="fieldset-legend">Ranked firm</span><select v-model.number="negotiationForm.supplier_bid_id" class="select select-bordered" required><option :value="null" disabled>Select firm</option><option v-for="result in results.filter(item => item.passed)" :key="result.id" :value="result.supplier_bid_id">#{{ result.rank }} — {{ bidderName(result.supplier_bid_id, result) }}</option></select></label>
            <label class="fieldset"><span class="fieldset-legend">Outcome</span><select v-model="negotiationForm.status" class="select select-bordered" required><option value="INVITED">Invited</option><option value="IN_PROGRESS">In progress</option><option value="FAILED">Failed</option><option value="SUCCESSFUL">Successful</option></select></label>
            <label class="fieldset"><span class="fieldset-legend">Proposed cost</span><input v-model.number="negotiationForm.proposed_amount" type="number" min="0" step="0.01" class="input input-bordered"></label>
            <label class="fieldset"><span class="fieldset-legend">Agreed cost</span><input v-model.number="negotiationForm.agreed_amount" type="number" min="0" step="0.01" class="input input-bordered" :required="negotiationForm.status === 'SUCCESSFUL'"></label>
            <label class="fieldset"><span class="fieldset-legend">Currency</span><input v-model.trim="negotiationForm.currency_code" maxlength="3" class="input input-bordered uppercase" :required="negotiationForm.status === 'SUCCESSFUL'"></label>
            <label v-if="negotiationForm.status === 'FAILED'" class="fieldset"><span class="fieldset-legend">Failure reason</span><textarea v-model.trim="negotiationForm.outcome_reason" class="textarea textarea-bordered" required /></label>
            <label class="fieldset sm:col-span-2"><span class="fieldset-legend">Negotiation minutes</span><textarea v-model.trim="negotiationForm.minutes" class="textarea textarea-bordered min-h-24" :required="negotiationForm.status === 'SUCCESSFUL'" /></label>
            <div class="sm:col-span-2 flex justify-end"><button class="btn btn-primary" :disabled="saving"><Icon name="lucide:handshake" class="h-4 w-4" /> Record negotiation</button></div>
          </form>
        </div>
      </template>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({ tender: { type: Object, required: true }, rfqMode: { type: Boolean, default: false } })
const emit = defineEmits(['updated'])
const rfqMode = computed(() => props.rfqMode)
const { getTenderEvaluatorSubmissions, saveTenderEvaluatorSubmission, buildTenderEvaluationConsensus, getTenderEvaluationResults, getTenderConsultancyNegotiations, saveTenderConsultancyNegotiation } = useTenderHelper()
const loading = ref(true), saving = ref(false), scheme = ref(null), bids = ref([]), results = ref([]), negotiations = ref([]), message = ref(''), messageOk = ref(true)
const consensus = reactive({ recommended_supplier_bid_id: null, recommendation: '', consensus_notes: '' })
const negotiationForm = reactive({ supplier_bid_id: null, status: 'INVITED', proposed_amount: null, agreed_amount: null, currency_code: 'USD', minutes: '', outcome_reason: '' })
const selectionCode = computed(() => props.tender.bidevaluationmethod?.code)
const consultancySelection = computed(() => ['QBS', 'QCBS'].includes(selectionCode.value))
const activeStage = computed(() => selectionCode.value === 'QCBS' && scheme.value?.technical_status === 'LOCKED' ? 'FINANCIAL' : selectionCode.value === 'QBS' || selectionCode.value === 'QCBS' ? 'TECHNICAL' : 'ALL')
const stageAvailable = computed(() => activeStage.value !== 'FINANCIAL' || scheme.value?.financial_status === 'OPEN')
const stageCriteria = computed(() => (scheme.value?.criteria || []).filter(criterion => activeStage.value === 'ALL' || criterion.stage === activeStage.value))

function hydrateBid(bid) {
  const existing = bid.evaluator_submission
  const existingScores = new Map((existing?.scores || []).map(score => [Number(score.tender_evaluation_criterion_id), score]))
  const submitted = activeStage.value === 'TECHNICAL' ? existing?.technical_status === 'SUBMITTED' : activeStage.value === 'FINANCIAL' ? existing?.financial_status === 'SUBMITTED' : existing?.status === 'SUBMITTED'
  return { ...bid, form: { submitted, evaluated_amount: existing?.evaluated_amount == null ? null : Number(existing.evaluated_amount), comments: existing?.comments || '', scores: Object.fromEntries((scheme.value?.criteria || []).map(criterion => { const value = existingScores.get(Number(criterion.id)); return [criterion.id, { score: value == null ? null : Number(value.score), comment: value?.comment || '' }] })) } }
}
function bidTechnicalTotal(bid) { return Math.round((scheme.value?.criteria || []).filter(c => c.stage === 'TECHNICAL').reduce((sum, c) => sum + Number(bid.form.scores[c.id]?.score || 0) * Number(c.weight) / 100, 0) * 100) / 100 }
function bidderName(id, result = null) { return result?.supplier_bid?.company?.name || bids.value.find(bid => Number(bid.id) === Number(id))?.company?.name || `Bid #${id}` }
function failure(error, fallback) { return error?.value?.data?.message || error?.value?.response?._data?.message || fallback }

async function load() {
  loading.value = true
  try {
    const [workspace, resultResponse, negotiationResponse] = await Promise.all([getTenderEvaluatorSubmissions(props.tender.uuid), getTenderEvaluationResults(props.tender.uuid), consultancySelection.value ? getTenderConsultancyNegotiations(props.tender.uuid) : Promise.resolve({ data: { value: { data: [] } }, error: { value: null } })])
    const payload = workspace.data.value?.data || {}
    scheme.value = payload.scheme || null
    bids.value = (payload.bids || []).map(hydrateBid)
    results.value = resultResponse.data.value?.data || []
    negotiations.value = negotiationResponse.data.value?.data || []
    if (workspace.error.value || resultResponse.error.value) {
      messageOk.value = false
      message.value = failure(workspace.error.value ? workspace.error : resultResponse.error, 'You do not have permission to view this evaluation.')
      bids.value = []
      results.value = []
    }
  } finally { loading.value = false }
}

async function saveBid(bid, submit) {
  saving.value = true; message.value = ''
  const allowedIds = new Set(stageCriteria.value.map(criterion => Number(criterion.id)))
  const payload = { stage: activeStage.value, scores: Object.entries(bid.form.scores).filter(([criterionId, score]) => allowedIds.has(Number(criterionId)) && score.score != null).map(([criterion_id, score]) => ({ criterion_id: Number(criterion_id), score: Number(score.score), comment: score.comment || null })), evaluated_amount: activeStage.value === 'FINANCIAL' || rfqMode.value ? bid.form.evaluated_amount : null, comments: bid.form.comments || null, submit }
  const response = await saveTenderEvaluatorSubmission(props.tender.uuid, bid.uuid, payload)
  messageOk.value = response.status.value; message.value = response.status.value ? (submit ? 'Assessment submitted.' : 'Assessment draft saved.') : failure(response.error, 'The assessment could not be saved.')
  if (response.status.value) { await load(); emit('updated') }
  saving.value = false
}
async function buildConsensus() {
  saving.value = true; message.value = ''
  const response = await buildTenderEvaluationConsensus(props.tender.uuid, { recommended_supplier_bid_id: consensus.recommended_supplier_bid_id || null, recommendation: consensus.recommendation || null, consensus_notes: consensus.consensus_notes || null })
  messageOk.value = response.status.value; message.value = response.status.value ? 'Consensus results and evaluation report generated.' : failure(response.error, 'Consensus could not be generated.')
  if (response.status.value) await load()
  saving.value = false
}
async function saveNegotiation() {
  saving.value = true; message.value = ''
  const response = await saveTenderConsultancyNegotiation(props.tender.uuid, {
    ...negotiationForm,
    proposed_amount: negotiationForm.proposed_amount || null,
    agreed_amount: negotiationForm.agreed_amount || null,
    currency_code: negotiationForm.currency_code?.toUpperCase() || null,
    minutes: negotiationForm.minutes || null,
    outcome_reason: negotiationForm.outcome_reason || null,
  })
  messageOk.value = response.status.value; message.value = response.status.value ? 'Negotiation record saved.' : failure(response.error, 'Negotiation could not be saved.')
  if (response.status.value) { await load(); emit('updated') }
  saving.value = false
}
onMounted(load)
</script>

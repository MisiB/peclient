<template>
  <section class="space-y-5">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h4 class="flex items-center gap-2 font-semibold">
          <Icon name="lucide:clipboard-check" class="h-5 w-5 text-info" />
          Committee EOI evaluation
        </h4>
        <p class="mt-1 text-sm text-base-content/60">Appoint the committee, collect independent declarations and scores, then record its consensus shortlist.</p>
      </div>
      <span v-if="workspace" class="badge badge-outline">{{ prettyStatus(workspace.status) }}</span>
    </div>

    <div v-if="feedback" class="alert py-3 text-sm" :class="feedbackOk ? 'alert-success' : 'alert-error'">
      <Icon :name="feedbackOk ? 'lucide:circle-check' : 'lucide:triangle-alert'" class="h-4 w-4" />
      <span>{{ feedback }}</span>
    </div>

    <div v-if="loading" class="flex justify-center py-10"><span class="loading loading-spinner loading-md" /></div>

    <template v-else-if="!workspace">
      <div class="rounded-xl border border-dashed border-base-300 p-6 text-center">
        <Icon name="lucide:users-round" class="mx-auto h-8 w-8 text-base-content/35" />
        <p class="mt-3 font-medium">The EOI is closed and ready for committee evaluation.</p>
        <p class="mt-1 text-sm text-base-content/55">Initialize a controlled workspace before appointing evaluators.</p>
        <button type="button" class="btn btn-primary btn-sm mt-4" :disabled="saving" @click="initializeEvaluation">
          <span v-if="saving" class="loading loading-spinner loading-xs" />
          <Icon v-else name="lucide:play" />
          Start evaluation
        </button>
      </div>
    </template>

    <template v-else>
      <ol class="grid gap-2 text-xs sm:grid-cols-4">
        <li v-for="stage in stages" :key="stage.status" class="rounded-lg border p-3" :class="stageClass(stage.status)">
          <span class="font-semibold">{{ stage.label }}</span>
        </li>
      </ol>

      <section v-if="workspace.status === 'COMMITTEE_SETUP'" class="space-y-4 rounded-xl border border-base-200 p-4">
        <div>
          <h5 class="font-semibold">Appoint the evaluation committee</h5>
          <p class="text-sm text-base-content/55">Select at least three voting members with technical and financial expertise, plus one non-voting PMU adviser.</p>
        </div>

        <div v-if="usersLoading" class="flex items-center gap-2 text-sm text-base-content/55"><span class="loading loading-spinner loading-xs" /> Loading organisation users…</div>
        <div v-else class="space-y-3">
          <article v-for="(member, index) in committee" :key="member.key" class="grid items-end gap-3 rounded-lg bg-base-200/40 p-3 md:grid-cols-[minmax(0,1fr)_12rem_auto_auto]">
            <label class="fieldset"><span class="fieldset-legend">Member</span><select v-model.number="member.user_id" class="select select-bordered select-sm w-full"><option :value="null">Select user</option><option v-for="user in availableUsers(member.user_id)" :key="user.id" :value="user.id">{{ fullName(user) }}</option></select></label>
            <label class="fieldset"><span class="fieldset-legend">Committee role</span><select v-model="member.role" class="select select-bordered select-sm w-full"><option value="TECHNICAL">Technical</option><option value="FINANCIAL">Financial</option><option value="OTHER">Other voting member</option><option value="PMU_ADVISER">PMU adviser</option></select></label>
            <label class="mb-2 flex items-center gap-2 text-sm" :class="member.role === 'PMU_ADVISER' ? 'opacity-45' : ''"><input v-model="chairIndex" type="radio" class="radio radio-primary radio-sm" name="eoi-chair" :value="index" :disabled="member.role === 'PMU_ADVISER'" /> Chair</label>
            <button type="button" class="btn btn-ghost btn-sm text-error" :disabled="committee.length <= 4" @click="removeCommitteeMember(index)"><Icon name="lucide:trash-2" /></button>
          </article>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <button type="button" class="btn btn-outline btn-sm" @click="addCommitteeMember"><Icon name="lucide:user-plus" /> Add member</button>
          <button type="button" class="btn btn-primary btn-sm" :disabled="saving || !committeeValid" @click="saveCommittee"><span v-if="saving" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:lock-keyhole" /> Appoint and lock committee</button>
        </div>
      </section>

      <section v-else class="space-y-4">
        <div class="overflow-x-auto rounded-xl border border-base-200">
          <table class="table table-sm">
            <thead><tr><th>Committee member</th><th>Role</th><th>Conflict declaration</th><th>Evaluation</th></tr></thead>
            <tbody>
              <tr v-for="member in workspace.members" :key="member.id">
                <td><span class="font-medium">{{ fullName(member.user) }}</span><span v-if="member.user_id === workspace.chairperson_id" class="badge badge-primary badge-xs ml-2">Chair</span><span v-if="member.user_id === currentUserId" class="badge badge-ghost badge-xs ml-1">You</span></td>
                <td>{{ roleLabel(member.role) }}</td>
                <td><span class="badge badge-sm" :class="conflictClass(member.conflict_status)">{{ prettyStatus(member.conflict_status) }}</span></td>
                <td>{{ member.is_voting ? `${memberScoreCount(member.id)} / ${expectedScoreCount}` : 'Non-voting' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="currentMember && currentMember.conflict_status === 'PENDING'" class="rounded-xl border border-warning/30 bg-warning/10 p-4">
          <h5 class="font-semibold">Conflict-of-interest declaration</h5>
          <p class="mt-1 text-sm text-base-content/60">Every committee member must declare their position before participating.</p>
          <div class="mt-3 flex flex-wrap gap-4"><label class="flex items-center gap-2 text-sm"><input v-model="conflict.status" type="radio" class="radio radio-success radio-sm" value="CLEAR" /> I have no conflict</label><label class="flex items-center gap-2 text-sm"><input v-model="conflict.status" type="radio" class="radio radio-error radio-sm" value="CONFLICT" /> I have a conflict</label></div>
          <label v-if="conflict.status === 'CONFLICT'" class="fieldset mt-3"><span class="fieldset-legend">Conflict details</span><textarea v-model.trim="conflict.details" class="textarea textarea-bordered w-full" /></label>
          <button type="button" class="btn btn-primary btn-sm mt-3" :disabled="saving || !conflict.status || (conflict.status === 'CONFLICT' && !conflict.details)" @click="saveConflict">Save declaration</button>
        </div>

        <div v-if="currentMember?.conflict_status === 'CONFLICT'" class="alert alert-warning"><Icon name="lucide:shield-alert" /><span>Your conflict has been recorded. You cannot score responses or participate in the consensus decision.</span></div>

        <section v-if="canScore" class="space-y-4">
          <div class="rounded-lg bg-info/10 p-3 text-sm"><strong>Independent assessment:</strong> evaluate every published criterion for every response. Your submission is complete only when all rows are saved.</div>
          <article v-for="response in responses" :key="response.uuid" class="rounded-xl border border-base-200 p-4">
            <div class="flex flex-wrap items-start justify-between gap-2"><div><h5 class="font-semibold">{{ response.company?.name ?? 'Supplier response' }}</h5><p class="text-xs text-base-content/50">{{ response.company?.regnumber || response.uuid }}</p></div><span v-if="response.encrypted" class="badge badge-outline badge-sm"><Icon name="lucide:lock-open" /> Opened after closure</span></div>
            <div class="mt-4 space-y-3">
              <div v-for="criterion in criteria" :key="criterion.uuid" class="rounded-lg bg-base-200/45 p-3">
                <div class="flex flex-wrap items-start justify-between gap-2"><p class="font-medium">{{ criterion.title }}</p><span v-if="criterion.mandatory" class="badge badge-error badge-xs">Mandatory</span></div>
                <p class="mt-2 whitespace-pre-line text-sm text-base-content/70">{{ criterionResponse(response, criterion.uuid)?.response || 'No written response supplied.' }}</p>
                <p v-if="criterionResponse(response, criterion.uuid)?.evidence?.file_name" class="mt-2 flex items-center gap-1 text-xs text-base-content/55"><Icon name="lucide:paperclip" /> {{ criterionResponse(response, criterion.uuid).evidence.file_name }}</p>
                <div class="mt-3 grid gap-3 sm:grid-cols-3">
                  <label class="flex items-center gap-2 text-sm"><input v-model="scoreForm[response.uuid][criterion.uuid].passed" type="checkbox" class="checkbox checkbox-success checkbox-sm" /> Criterion passed</label>
                  <label v-if="criterion.evaluation_method === 'SCORED'" class="fieldset"><span class="fieldset-legend">Score / {{ criterion.max_score }}</span><input v-model.number="scoreForm[response.uuid][criterion.uuid].score" type="number" min="0" :max="criterion.max_score" class="input input-bordered input-sm w-full" /></label>
                  <label class="fieldset" :class="criterion.evaluation_method === 'PASS_FAIL' ? 'sm:col-span-2' : ''"><span class="fieldset-legend">Evaluator comment</span><input v-model.trim="scoreForm[response.uuid][criterion.uuid].comments" class="input input-bordered input-sm w-full" /></label>
                </div>
              </div>
            </div>
          </article>
          <div class="flex justify-end"><button type="button" class="btn btn-success btn-sm" :disabled="saving || !scoresValid" @click="saveScores"><span v-if="saving" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:send" /> Submit individual evaluation</button></div>
        </section>

        <div v-else-if="workspace.status === 'INDIVIDUAL_EVALUATION' && currentMember?.is_voting && currentMember.conflict_status === 'CLEAR'" class="alert alert-success"><Icon name="lucide:circle-check" /><span>Your individual evaluation is complete. Waiting for the remaining voting members.</span></div>

        <section v-if="workspace.status === 'CONSENSUS' && isChairperson" class="space-y-4 rounded-xl border border-primary/25 p-4">
          <div><h5 class="font-semibold">Record committee consensus</h5><p class="text-sm text-base-content/55">The chair must record a decision for every response. The normal shortlist is three to six firms.</p></div>
          <article v-for="response in responses" :key="response.uuid" class="rounded-lg border border-base-200 p-3">
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p class="font-medium">{{ response.company?.name ?? response.uuid }}</p><p class="text-xs text-base-content/50">Evaluator score average: {{ aggregateScore(response.id) }}</p></div><div class="flex gap-4"><label class="flex items-center gap-2 text-sm"><input v-model="consensus[response.uuid].shortlisted" type="radio" class="radio radio-success radio-sm" :name="`consensus-${response.uuid}`" :value="true" /> Shortlist</label><label class="flex items-center gap-2 text-sm"><input v-model="consensus[response.uuid].shortlisted" type="radio" class="radio radio-error radio-sm" :name="`consensus-${response.uuid}`" :value="false" /> Do not shortlist</label></div></div>
            <div class="mt-3 grid gap-3 sm:grid-cols-3"><label class="fieldset"><span class="fieldset-legend">Consensus score</span><input v-model.number="consensus[response.uuid].total_score" type="number" min="0" class="input input-bordered input-sm w-full" /></label><label class="fieldset sm:col-span-2"><span class="fieldset-legend">Consensus reasons</span><textarea v-model.trim="consensus[response.uuid].notes" class="textarea textarea-bordered textarea-sm w-full" /></label></div>
          </article>
          <label v-if="shortlistedCount < 3" class="fieldset"><span class="fieldset-legend">Reason fewer than three firms could be ascertained *</span><textarea v-model.trim="shortlistExceptionReason" class="textarea textarea-bordered w-full" /></label>
          <div class="flex flex-wrap items-center justify-between gap-3"><p class="text-sm">Selected: <strong>{{ shortlistedCount }}</strong> of 3–6 normally required</p><button type="button" class="btn btn-primary btn-sm" :disabled="saving || !consensusValid" @click="saveConsensus"><span v-if="saving" class="loading loading-spinner loading-xs" /><Icon v-else name="lucide:badge-check" /> Confirm consensus shortlist</button></div>
        </section>

        <div v-else-if="workspace.status === 'CONSENSUS'" class="alert alert-info"><Icon name="lucide:hourglass" /><span>All independent evaluations are complete. The committee chair must now record the consensus shortlist.</span></div>
        <div v-else-if="workspace.status === 'PENDING_SPOC'" class="alert alert-warning"><Icon name="lucide:landmark" /><span>The consensus shortlist has been submitted into the mandatory SPOC review workflow.</span></div>
        <div v-else-if="workspace.status === 'COMPLETED'" class="alert alert-success"><Icon name="lucide:badge-check" /><span>The EOI evaluation is complete and the approved firms have been transferred to the restricted RFP shortlist.</span></div>
      </section>
    </template>
  </section>
</template>

<script setup>
const props = defineProps({ tenderUuid: { type: String, required: true } })
const emit = defineEmits(['completed'])
const evaluationApi = useConsultancyEoiEvaluation()
const organisationUsers = useOrganisationUsersHelper()
const identity = useSanctumUser()

const workspace = ref(null)
const users = ref([])
const loading = ref(true)
const usersLoading = ref(false)
const saving = ref(false)
const feedback = ref('')
const feedbackOk = ref(true)
const chairIndex = ref(0)
const committee = reactive([])
const conflict = reactive({ status: '', details: '' })
const scoreForm = reactive({})
const consensus = reactive({})
const shortlistExceptionReason = ref('')
let memberKey = 0

const stages = [
  { status: 'COMMITTEE_SETUP', label: '1. Committee setup' },
  { status: 'INDIVIDUAL_EVALUATION', label: '2. Individual evaluation' },
  { status: 'CONSENSUS', label: '3. Committee consensus' },
  { status: 'COMPLETED', label: '4. Approval / completion' },
]
const statusOrder = ['COMMITTEE_SETUP', 'INDIVIDUAL_EVALUATION', 'CONSENSUS', 'PENDING_SPOC', 'COMPLETED']
const currentUserId = computed(() => identity.value?.data?.user?.id ?? identity.value?.user?.id ?? identity.value?.id ?? null)
const currentMember = computed(() => workspace.value?.members?.find(member => Number(member.user_id) === Number(currentUserId.value)) ?? null)
const isChairperson = computed(() => Number(workspace.value?.chairperson_id) === Number(currentUserId.value))
const criteria = computed(() => workspace.value?.eoi?.criteria ?? [])
const responses = computed(() => workspace.value?.eoi?.responses ?? [])
const expectedScoreCount = computed(() => responses.value.length * criteria.value.length)
const canScore = computed(() => workspace.value?.status === 'INDIVIDUAL_EVALUATION'
  && currentMember.value?.is_voting
  && currentMember.value?.conflict_status === 'CLEAR'
  && memberScoreCount(currentMember.value.id) < expectedScoreCount.value)
const committeeValid = computed(() => {
  const selected = committee.filter(member => member.user_id)
  const voting = selected.filter(member => member.role !== 'PMU_ADVISER')
  return selected.length === committee.length
    && new Set(selected.map(member => member.user_id)).size === selected.length
    && selected.filter(member => member.role === 'PMU_ADVISER').length === 1
    && voting.length >= 3
    && voting.some(member => member.role === 'TECHNICAL')
    && voting.some(member => member.role === 'FINANCIAL')
    && committee[chairIndex.value]?.role !== 'PMU_ADVISER'
})
const scoresValid = computed(() => responses.value.length > 0 && responses.value.every(response => criteria.value.every(criterion => {
  const row = scoreForm[response.uuid]?.[criterion.uuid]
  return row && typeof row.passed === 'boolean'
    && (criterion.evaluation_method !== 'SCORED' || (row.score !== null && row.score !== '' && Number(row.score) >= 0 && Number(row.score) <= Number(criterion.max_score)))
})))
const shortlistedCount = computed(() => Object.values(consensus).filter(row => row.shortlisted === true).length)
const consensusValid = computed(() => responses.value.length > 0
  && responses.value.every(response => typeof consensus[response.uuid]?.shortlisted === 'boolean' && consensus[response.uuid]?.notes)
  && shortlistedCount.value <= 6
  && (shortlistedCount.value >= 3 || shortlistExceptionReason.value.trim()))

onMounted(load)

async function load() {
  loading.value = true
  const result = await evaluationApi.getWorkspace(props.tenderUuid)
  if (!result.ok) showFeedback(result.error, false)
  workspace.value = result.data?.data ?? null
  hydrateForms()
  loading.value = false
  if (workspace.value?.status === 'COMMITTEE_SETUP') await loadUsers()
}

async function loadUsers() {
  usersLoading.value = true
  const result = await organisationUsers.listUsers()
  usersLoading.value = false
  if (!result.ok) { showFeedback(result.error, false); return }
  users.value = (result.data?.data ?? []).filter(user => String(user.status).toLowerCase() === 'active')
}

async function initializeEvaluation() {
  await run(() => evaluationApi.initialize(props.tenderUuid), 'EOI evaluation workspace initialized.')
  if (workspace.value?.status === 'COMMITTEE_SETUP') await loadUsers()
}

function newCommitteeMember(role = 'OTHER') { return { key: ++memberKey, user_id: null, role } }
function resetCommittee() {
  committee.splice(0, committee.length,
    newCommitteeMember('TECHNICAL'),
    newCommitteeMember('FINANCIAL'),
    newCommitteeMember('OTHER'),
    newCommitteeMember('PMU_ADVISER'),
  )
  chairIndex.value = 0
}
function addCommitteeMember() { committee.push(newCommitteeMember()) }
function removeCommitteeMember(index) {
  committee.splice(index, 1)
  if (chairIndex.value === index) chairIndex.value = 0
  else if (chairIndex.value > index) chairIndex.value--
}
function availableUsers(selectedId) {
  const used = new Set(committee.map(member => member.user_id).filter(id => id && id !== selectedId))
  return users.value.filter(user => !used.has(user.id))
}
async function saveCommittee() {
  const members = committee.map((member, index) => ({ user_id: member.user_id, role: member.role, is_chairperson: index === chairIndex.value }))
  await run(() => evaluationApi.appointCommittee(props.tenderUuid, members), 'Evaluation committee appointed.')
}

async function saveConflict() {
  await run(() => evaluationApi.declareConflict(props.tenderUuid, { status: conflict.status, details: conflict.details || null }), 'Conflict declaration recorded.')
}

async function saveScores() {
  const submissions = responses.value.map(response => ({
    response_uuid: response.uuid,
    criteria: criteria.value.map(criterion => ({ criterion_uuid: criterion.uuid, ...scoreForm[response.uuid][criterion.uuid] })),
  }))
  await run(() => evaluationApi.submitScores(props.tenderUuid, submissions), 'Individual EOI evaluation submitted.')
}

async function saveConsensus() {
  const decisions = responses.value.map(response => ({ response_uuid: response.uuid, ...consensus[response.uuid] }))
  await run(() => evaluationApi.recordConsensus(props.tenderUuid, { decisions, shortlist_exception_reason: shortlistExceptionReason.value || null }), 'Committee consensus recorded.')
}

async function run(call, successMessage) {
  saving.value = true
  feedback.value = ''
  const result = await call()
  saving.value = false
  if (!result.ok) { showFeedback(result.error, false); return }
  workspace.value = result.data?.data ?? workspace.value
  showFeedback(result.data?.message ?? successMessage, true)
  hydrateForms()
  if (workspace.value?.status === 'COMPLETED') emit('completed')
}

function hydrateForms() {
  if (!workspace.value) return
  if (workspace.value.status === 'COMMITTEE_SETUP' && !committee.length) resetCommittee()
  for (const response of responses.value) {
    scoreForm[response.uuid] ??= {}
    for (const criterion of criteria.value) {
      const saved = workspace.value.scores?.find(score => Number(score.consultancy_eoi_evaluation_member_id) === Number(currentMember.value?.id)
        && Number(score.consultancy_eoi_response_id) === Number(response.id)
        && String(score.criterion_uuid).toLowerCase() === String(criterion.uuid).toLowerCase())
      scoreForm[response.uuid][criterion.uuid] = { passed: saved?.passed ?? false, score: saved?.score != null ? Number(saved.score) : null, comments: saved?.comments ?? '' }
    }
    const decision = workspace.value.consensus_decisions?.find(item => Number(item.consultancy_eoi_response_id) === Number(response.id))
    const suggestedScore = aggregateScore(response.id)
    consensus[response.uuid] = { shortlisted: decision?.shortlisted ?? null, total_score: decision?.total_score != null ? Number(decision.total_score) : (suggestedScore === '—' ? null : Number(suggestedScore)), notes: decision?.notes ?? '' }
  }
  shortlistExceptionReason.value = workspace.value.shortlist_exception_reason ?? ''
}

function memberScoreCount(memberId) { return workspace.value?.scores?.filter(score => Number(score.consultancy_eoi_evaluation_member_id) === Number(memberId)).length ?? 0 }
function aggregateScore(responseId) {
  const scores = (workspace.value?.scores ?? []).filter(score => Number(score.consultancy_eoi_response_id) === Number(responseId) && score.score != null)
  if (!scores.length) return '—'
  return (scores.reduce((total, score) => total + Number(score.score), 0) / scores.length).toFixed(2)
}
function criterionResponse(response, criterionUuid) { return response.criterion_responses?.find(item => String(item.criterion_uuid).toLowerCase() === String(criterionUuid).toLowerCase()) }
function fullName(user) { return [user?.name, user?.middlename, user?.lastname].filter(Boolean).join(' ') || user?.email || '—' }
function roleLabel(role) { return ({ PMU_ADVISER: 'PMU adviser', TECHNICAL: 'Technical', FINANCIAL: 'Financial', OTHER: 'Other voting member' })[role] ?? prettyStatus(role) }
function prettyStatus(value) { return String(value ?? '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()) }
function conflictClass(status) { return ({ CLEAR: 'badge-success', CONFLICT: 'badge-error', PENDING: 'badge-warning' })[status] ?? 'badge-ghost' }
function stageClass(status) {
  const current = statusOrder.indexOf(workspace.value?.status)
  let target = statusOrder.indexOf(status)
  if (status === 'COMPLETED' && workspace.value?.status === 'PENDING_SPOC') target = current + 1
  return target < current ? 'border-success/30 bg-success/10 text-success' : target === current ? 'border-info/40 bg-info/10 text-info' : 'border-base-200 text-base-content/45'
}
function showFeedback(message, ok) { feedback.value = message; feedbackOk.value = ok }
</script>

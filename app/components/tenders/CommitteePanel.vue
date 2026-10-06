<template>
  <section class="card border border-base-200 bg-base-100 shadow-sm">
    <div class="card-body gap-5 p-4 sm:p-5">
      <header class="flex gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info/10 text-info">
          <Icon name="lucide:users" class="h-5 w-5" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="font-semibold">Tender evaluation committee</h2>
          <p class="text-sm text-base-content/60">Appoint registered procurement-entity users. Their assigned tender will appear under My Evaluations.</p>
        </div>
        <NuxtLink to="/evaluations" class="btn btn-outline btn-sm ml-auto"><Icon name="lucide:clipboard-check" class="h-4 w-4" /> My Evaluations</NuxtLink>
      </header>

      <div v-if="message" class="alert py-2" :class="messageOk ? 'alert-success' : 'alert-error'">
        <Icon :name="messageOk ? 'lucide:check-circle-2' : 'lucide:alert-triangle'" class="h-4 w-4" />
        <span class="text-sm">{{ message }}</span>
      </div>

      <div v-if="loading" class="flex items-center gap-2 text-sm text-base-content/50">
        <span class="loading loading-spinner loading-sm" /> Loading committee…
      </div>
      <template v-else>
        <div class="grid gap-2 sm:grid-cols-3">
          <div class="stat rounded-lg border border-base-200 p-3">
            <div class="stat-title text-xs">Voting members</div>
            <div class="stat-value text-2xl">{{ votingCount }}</div>
            <div class="stat-desc" :class="votingCount >= 3 ? 'text-success' : 'text-warning'">Minimum three</div>
          </div>
          <div class="stat rounded-lg border border-base-200 p-3">
            <div class="stat-title text-xs">Technical & finance</div>
            <div class="stat-value text-2xl">{{ hasRequiredExpertise ? '✓' : '!' }}</div>
            <div class="stat-desc">Both must be represented</div>
          </div>
          <div class="stat rounded-lg border border-base-200 p-3">
            <div class="stat-title text-xs">PMU adviser</div>
            <div class="stat-value text-2xl">{{ hasPmuAdviser ? '✓' : '!' }}</div>
            <div class="stat-desc">Non-voting role</div>
          </div>
        </div>

        <div class="overflow-x-auto rounded-lg border border-base-200">
          <table class="table table-sm">
            <thead><tr><th>Member</th><th>Role</th><th>Voting</th><th>Conflict declaration</th><th /></tr></thead>
            <tbody>
              <tr v-for="member in members" :key="member.uuid || member.id">
                <td><p class="font-medium">{{ member.name }}</p><p class="text-xs text-base-content/50">{{ member.email || '—' }}</p></td>
                <td><p>{{ member.role }}</p><p class="text-xs text-base-content/50">{{ member.expertise_area || '—' }}</p></td>
                <td><span class="badge badge-sm" :class="member.is_voting ? 'badge-success' : 'badge-ghost'">{{ member.is_voting ? 'Voting' : 'Advisory' }}</span></td>
                <td>
                  <span v-if="member.conflict_declaration" class="badge badge-sm" :class="member.conflict_declaration.has_conflict ? 'badge-error' : 'badge-success'">
                    {{ member.conflict_declaration.has_conflict ? 'Conflict declared' : 'No conflict' }}
                  </span>
                  <button v-else type="button" class="btn btn-link btn-xs px-0" @click="openConflict(member)">Record declaration</button>
                </td>
                <td><button v-if="editable" type="button" class="btn btn-ghost btn-xs btn-square text-error" @click="remove(member)"><Icon name="lucide:trash-2" class="h-4 w-4" /></button></td>
              </tr>
              <tr v-if="members.length === 0"><td colspan="5" class="py-8 text-center text-base-content/50">No tender committee members appointed.</td></tr>
            </tbody>
          </table>
        </div>

        <form v-if="editable" class="grid gap-3 rounded-lg border border-dashed border-base-300 p-3 sm:grid-cols-2 lg:grid-cols-4" @submit.prevent="add">
          <label class="fieldset sm:col-span-2"><span class="fieldset-legend">Procurement entity user</span><select v-model.number="form.user_id" class="select select-bordered w-full" required><option :value="null" disabled>Select a registered user</option><option v-for="user in eligibleUsers" :key="user.id" :value="user.id">{{ person(user) }} — {{ user.email }}</option></select></label>
          <label class="fieldset"><span class="fieldset-legend">Committee role</span><input v-model.trim="form.role" class="input input-bordered w-full" placeholder="Member or PMU adviser" required></label>
          <label class="fieldset"><span class="fieldset-legend">Expertise</span><select v-model="form.expertise_area" class="select select-bordered w-full" required><option value="TECHNICAL">Technical</option><option value="FINANCE">Finance</option><option value="LEGAL">Legal</option><option value="COMMERCIAL">Commercial</option><option value="PMU">PMU</option></select></label>
          <label class="label cursor-pointer justify-start gap-3"><input v-model="form.is_voting" type="checkbox" class="checkbox checkbox-sm"><span class="label-text">Voting member</span></label>
          <label class="label cursor-pointer justify-start gap-3"><input v-model="form.is_chairperson" type="checkbox" class="checkbox checkbox-sm"><span class="label-text">Chairperson</span></label>
          <div class="flex justify-end sm:col-span-2"><button class="btn btn-outline" type="submit" :disabled="saving"><span v-if="saving" class="loading loading-spinner loading-sm" /><Icon v-else name="lucide:user-plus" class="h-4 w-4" /> Appoint member</button></div>
        </form>
      </template>

      <dialog ref="conflictDialog" class="modal">
        <div class="modal-box">
          <h3 class="text-lg font-semibold">Conflict declaration</h3>
          <p class="mt-1 text-sm text-base-content/60">{{ selectedMember?.name }}</p>
          <form class="mt-4 space-y-3" @submit.prevent="saveConflict">
            <label class="label cursor-pointer justify-start gap-3"><input v-model="conflict.has_conflict" type="checkbox" class="checkbox checkbox-error"><span class="label-text">A potential or actual conflict exists</span></label>
            <label class="fieldset"><span class="fieldset-legend">Declaration</span><textarea v-model.trim="conflict.declaration" class="textarea textarea-bordered min-h-24 w-full" required /></label>
            <label v-if="conflict.has_conflict" class="fieldset"><span class="fieldset-legend">Mitigation or recusal</span><textarea v-model.trim="conflict.mitigation" class="textarea textarea-bordered min-h-20 w-full" required /></label>
            <div class="modal-action"><button type="button" class="btn btn-ghost" @click="closeConflict">Cancel</button><button type="submit" class="btn btn-primary" :disabled="saving">Save declaration</button></div>
          </form>
        </div>
        <form method="dialog" class="modal-backdrop"><button>close</button></form>
      </dialog>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({ tender: { type: Object, required: true } })
const { getTenderCommittee, addTenderCommitteeMember, removeTenderCommitteeMember, declareTenderCommitteeConflict } = useTenderHelper()
const { canEdit } = useCheckPermission('tenders')
const loading = ref(true)
const saving = ref(false)
const members = ref([])
const eligibleUsers = ref([])
const message = ref('')
const messageOk = ref(true)
const conflictDialog = ref(null)
const selectedMember = ref(null)
const conflict = reactive({ has_conflict: false, declaration: '', mitigation: '' })
const form = reactive({ user_id: null, role: 'Member', expertise_area: 'TECHNICAL', is_voting: true, is_chairperson: false })

const editable = computed(() => canEdit.value && !['OPENED', 'UNDER_EVALUATION', 'EVALUATION_APPROVAL_PENDING', 'PROPOSED_AWARD', 'STANDSTILL', 'AWARDED', 'CONTRACTED', 'COMPLETED', 'CANCELLED'].includes(props.tender.status))
const votingCount = computed(() => members.value.filter(member => member.is_voting).length)
const hasRequiredExpertise = computed(() => ['TECHNICAL', 'FINANCE'].every(area => members.value.some(member => member.is_voting && member.expertise_area === area)))
const hasPmuAdviser = computed(() => members.value.some(member => !member.is_voting && member.expertise_area === 'PMU'))

async function load() {
  loading.value = true
  try {
    const { data } = await getTenderCommittee(props.tender.uuid)
    members.value = data.value?.data?.members ?? []
    eligibleUsers.value = data.value?.data?.eligible_users ?? []
  } finally { loading.value = false }
}

function resetForm() {
  Object.assign(form, { user_id: null, role: 'Member', expertise_area: 'TECHNICAL', is_voting: true, is_chairperson: false })
}

function person(user) { return `${user?.name || ''} ${user?.lastname || ''}`.trim() || user?.email || 'Unknown user' }

async function add() {
  saving.value = true
  try {
    const { status, error } = await addTenderCommitteeMember(props.tender.uuid, { ...form })
    messageOk.value = status.value
    message.value = status.value ? 'Committee member appointed.' : error.value?.data?.message || 'The member could not be appointed.'
    if (status.value) { resetForm(); await load() }
  } finally { saving.value = false }
}

async function remove(member) {
  saving.value = true
  try {
    const { status, error } = await removeTenderCommitteeMember(props.tender.uuid, member.uuid || member.id)
    messageOk.value = status.value
    message.value = status.value ? 'Committee member removed.' : error.value?.data?.message || 'The member could not be removed.'
    if (status.value) await load()
  } finally { saving.value = false }
}

function openConflict(member) {
  selectedMember.value = member
  Object.assign(conflict, { has_conflict: false, declaration: '', mitigation: '' })
  conflictDialog.value?.showModal?.()
}

function closeConflict() {
  conflictDialog.value?.close?.()
  selectedMember.value = null
}

async function saveConflict() {
  if (!selectedMember.value) return
  saving.value = true
  try {
    const { status, error } = await declareTenderCommitteeConflict(props.tender.uuid, selectedMember.value.uuid || selectedMember.value.id, { ...conflict, mitigation: conflict.has_conflict ? conflict.mitigation : null })
    messageOk.value = status.value
    message.value = status.value ? 'Conflict declaration recorded.' : error.value?.data?.message || 'The declaration could not be recorded.'
    if (status.value) { closeConflict(); await load() }
  } finally { saving.value = false }
}

onMounted(load)
</script>

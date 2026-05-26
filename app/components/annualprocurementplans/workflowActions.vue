<template>
  <div v-if="store.workflowActions.length" class="flex items-center gap-2">
    <template v-for="action in store.workflowActions" :key="action">
      <button
        :class="['btn btn-sm', buttonClass(action)]"
        :disabled="isDisabled(action)"
        :title="disabledReason(action)"
        @click="openAction(action)"
      >
        <Icon :name="buttonIcon(action)" />
        <span class="hidden md:block">{{ buttonLabel(action) }}</span>
      </button>
    </template>

    <dialog id="workflow_action_modal" class="modal">
      <div class="modal-box max-w-xl">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold">{{ activeAction ? buttonLabel(activeAction) : '' }}</h3>
          <button class="btn btn-ghost btn-circle" @click="closeModal">
            <Icon name="lucide:x" />
          </button>
        </div>

        <div class="mt-3 space-y-3 text-sm">
          <p>{{ activeAction ? actionDescription(activeAction) : '' }}</p>

          <fieldset class="fieldset">
            <legend class="fieldset-legend">
              Comment{{ commentRequired ? ' (required)' : ' (optional)' }}
            </legend>
            <textarea
              v-model="comment"
              rows="4"
              class="textarea textarea-bordered w-full"
              :placeholder="commentRequired ? 'Explain what needs to be corrected.' : 'Optional note for the audit trail.'"
            />
            <p v-if="error" class="mt-1 text-sm text-error">{{ error }}</p>
          </fieldset>
        </div>

        <div class="modal-action">
          <button class="btn" type="button" @click="closeModal">Cancel</button>
          <button :class="['btn', buttonClass(activeAction)]" :disabled="submitting" @click="confirm">
            <span v-if="submitting">Working...</span>
            <span v-else>Confirm</span>
          </button>
        </div>
      </div>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
});

const store = useAnnualprocurementplanStore();
const activeAction = ref(null);
const comment = ref('');
const error = ref('');
const submitting = ref(false);

const SEND_BACK_ACTIONS = new Set(['review_send_back', 'approve_send_back']);

const commentRequired = computed(() => SEND_BACK_ACTIONS.has(activeAction.value));

const analysisClean = computed(() => store.analysisReport?.can_submit === true);
const analysisHasIssues = computed(
  () => !!store.analysisReport && store.analysisReport.can_submit !== true,
);

const isDisabled = (action) => {
  if (action !== 'submit_for_review') return false;
  return !analysisClean.value;
};

const disabledReason = (action) => {
  if (action !== 'submit_for_review' || analysisClean.value) return null;
  if (analysisHasIssues.value) {
    return 'Resolve all issues in the analysis report before submitting.';
  }
  return 'Run Analyze Plan first; submit unlocks once the report is clean.';
};

const buttonLabel = (action) => ({
  submit_for_review: 'Submit for Review',
  review_approve: 'Approve Review',
  review_send_back: 'Send Back',
  approve: 'Approve & Forward to Admin',
  approve_send_back: 'Send Back to Reviewer',
})[action] ?? action;

const buttonClass = (action) => ({
  submit_for_review: 'btn-success',
  review_approve: 'btn-success',
  review_send_back: 'btn-warning',
  approve: 'btn-success',
  approve_send_back: 'btn-warning',
})[action] ?? 'btn-primary';

const buttonIcon = (action) => ({
  submit_for_review: 'lucide:send',
  review_approve: 'lucide:check-circle',
  review_send_back: 'lucide:undo-2',
  approve: 'lucide:check-circle',
  approve_send_back: 'lucide:undo-2',
})[action] ?? 'lucide:circle';

const actionDescription = (action) => ({
  submit_for_review: 'The system will re-run the analysis and forward the plan to reviewers if it passes.',
  review_approve: 'Approve the review and forward the plan to internal approval.',
  review_send_back: 'Return the plan to the creator. A comment is required.',
  approve: 'Approve the plan and forward to admin for authorization.',
  approve_send_back: 'Return the plan to the reviewer. A comment is required.',
})[action] ?? '';

const openAction = (action) => {
  if (isDisabled(action)) return;
  activeAction.value = action;
  comment.value = '';
  error.value = '';
  document.getElementById('workflow_action_modal').showModal();
};

const closeModal = () => {
  document.getElementById('workflow_action_modal').close();
  activeAction.value = null;
};

const confirm = async () => {
  error.value = '';
  if (commentRequired.value && comment.value.trim() === '') {
    error.value = 'A comment is required for this action.';
    return;
  }
  submitting.value = true;
  const ok = await store.runTransition(props.planUuid, activeAction.value, comment.value || null);
  submitting.value = false;
  if (ok) closeModal();
};
</script>

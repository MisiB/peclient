<template>
  <div class="w-full space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-semibold">Technical Eligibility</h2>
          <span class="badge badge-warning badge-sm">Required</span>
        </div>
        <p class="text-sm text-base-content/60">
          Define technical screening questions bidders must answer. Add at least one question with a response type: Yes/No, text, or file upload.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn btn-ghost btn-sm" type="button" @click="emit('back')">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          Back
        </button>
        <button class="btn btn-primary btn-sm" type="button" :disabled="saving || loading" @click="saveAndContinue">
          <span v-if="saving" class="loading loading-spinner loading-xs" />
          <span v-else>Save &amp; continue</span>
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-error border border-error/30 bg-error/10">
      <Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <div v-if="loading" class="card w-full border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body flex items-center justify-center gap-2 p-10 text-base-content/50">
        <span class="loading loading-spinner loading-md" />
        <span class="text-sm">Loading questions…</span>
      </div>
    </div>

    <div v-else class="card w-full border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body gap-4 p-4 sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-sm text-base-content/60">
            {{ questions.length }} question{{ questions.length === 1 ? '' : 's' }}
          </p>
          <button class="btn btn-success btn-sm" type="button" @click="addQuestion">
            <Icon name="lucide:plus" class="h-4 w-4" />
            Add question
          </button>
        </div>

        <div
          v-if="questions.length === 0"
          class="rounded-lg border border-dashed border-warning/40 bg-warning/5 p-8 text-center"
        >
          <Icon name="lucide:alert-circle" class="mx-auto mb-2 h-10 w-10 text-warning" />
          <p class="text-sm font-medium">At least one question is required</p>
          <p class="mt-1 text-xs text-base-content/60">Click <strong>Add question</strong> to get started.</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(row, index) in questions"
            :key="row._key"
            class="rounded-lg border border-base-200 p-4"
          >
            <div class="mb-2 flex items-center justify-between gap-2">
              <span class="text-xs font-medium text-base-content/50">Question {{ index + 1 }}</span>
              <button
                class="btn btn-ghost btn-xs text-error"
                type="button"
                :disabled="saving || questions.length <= 1"
                :title="questions.length <= 1 ? 'At least one question is required' : 'Remove'"
                @click="removeQuestion(index)"
              >
                <Icon name="lucide:trash-2" class="h-4 w-4" />
                Remove
              </button>
            </div>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label class="fieldset md:col-span-2">
                <span class="fieldset-legend">Question</span>
                <input
                  v-model="row.question"
                  type="text"
                  placeholder="e.g. Do you hold ISO 9001 certification?"
                  :class="['input input-bordered w-full', rowErrors[row._key]?.question ? 'input-error' : '']"
                />
                <label v-if="rowErrors[row._key]?.question" class="label">
                  <span class="label-text-alt text-error">{{ rowErrors[row._key].question }}</span>
                </label>
              </label>
              <label class="fieldset">
                <span class="fieldset-legend">Response type</span>
                <select v-model="row.response_type" class="select select-bordered w-full">
                  <option value="YES_NO">Yes / No</option>
                  <option value="TEXT">Text</option>
                  <option value="UPLOAD">Upload (file)</option>
                </select>
              </label>
            </div>
            <p v-if="row.response_type === 'UPLOAD'" class="mt-2 text-xs text-base-content/50">
              Bidders will upload a file when responding to this question.
            </p>
            <p v-else-if="row.response_type === 'TEXT'" class="mt-2 text-xs text-base-content/50">
              Bidders will provide a free-text answer.
            </p>
            <p v-else class="mt-2 text-xs text-base-content/50">
              Bidders will answer Yes or No.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useTenderHelper } from '~/composables/useTenderHelper';

const props = defineProps({
  tenderUuid: { type: String, required: true },
});

const emit = defineEmits(['saved', 'back']);

const toast = useToast();
const { getTenderTechnicalEligibilityQuestions, syncTenderTechnicalEligibilityQuestions } = useTenderHelper();

const loading = ref(true);
const saving = ref(false);
const errorMessage = ref('');
const questions = ref([]);
const rowErrors = reactive({});

function newRow(question = '', response_type = 'YES_NO') {
  return {
    _key: crypto.randomUUID?.() ?? String(Date.now()) + Math.random(),
    question,
    response_type,
  };
}

function addQuestion() {
  questions.value.push(newRow());
}

function removeQuestion(index) {
  if (questions.value.length <= 1) return;
  const row = questions.value[index];
  if (row?._key) delete rowErrors[row._key];
  questions.value.splice(index, 1);
}

function clearRowErrors() {
  for (const key of Object.keys(rowErrors)) {
    delete rowErrors[key];
  }
}

function validateClient() {
  clearRowErrors();
  let valid = true;

  if (questions.value.length === 0) {
    errorMessage.value = 'Add at least one technical eligibility question.';
    return false;
  }

  for (const row of questions.value) {
    const errs = {};
    if (!row.question?.trim()) {
      errs.question = 'Question text is required.';
      valid = false;
    }
    if (!row.response_type) {
      errs.response_type = 'Select a response type.';
      valid = false;
    }
    if (Object.keys(errs).length) {
      rowErrors[row._key] = errs;
    }
  }

  if (!valid) {
    errorMessage.value = 'Complete every question before continuing.';
  } else {
    errorMessage.value = '';
  }

  return valid;
}

function buildPayload() {
  return questions.value.map((row) => ({
    question: row.question.trim(),
    response_type: row.response_type,
  }));
}

async function saveAndContinue() {
  if (!validateClient()) return;

  saving.value = true;
  const { data, status, error } = await syncTenderTechnicalEligibilityQuestions(props.tenderUuid, {
    questions: buildPayload(),
  });
  saving.value = false;

  if (!status?.value) {
    const errData = error?.value?.data;
    errorMessage.value =
      errData?.message
      || (errData?.errors ? Object.values(errData.errors).flat().join(' ') : null)
      || data?.value?.message
      || 'Failed to save technical eligibility questions.';
    return;
  }

  toast.success({
    title: 'Saved',
    message: 'Technical eligibility questions saved.',
    position: 'topRight',
    layout: 2,
  });
  emit('saved');
}

async function load() {
  loading.value = true;
  errorMessage.value = '';
  const { data, error } = await getTenderTechnicalEligibilityQuestions(props.tenderUuid);
  if (error.value) {
    errorMessage.value = error.value?.data?.message || 'Failed to load technical eligibility questions.';
    loading.value = false;
    return;
  }
  const payload = data.value?.data ?? {};
  const rows = payload.questions ?? [];
  questions.value = rows.length
    ? rows.map((r) => newRow(r.question ?? '', r.response_type ?? 'YES_NO'))
    : [newRow()];
  loading.value = false;
}

onMounted(() => load());
</script>

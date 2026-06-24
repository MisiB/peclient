<template>
  <div class="w-full space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-semibold">Eligibility Forms</h2>
          <span v-if="!isMandatory" class="badge badge-ghost badge-sm">Optional</span>
          <span v-else class="badge badge-warning badge-sm">Required</span>
        </div>
        <p class="text-sm text-base-content/60">
          Add screening questions for bidders. Leave empty to skip this step. Once you add questions, you must complete and save them before continuing.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn btn-ghost btn-sm" type="button" @click="emit('back')">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          Back
        </button>
        <button
          v-if="!isMandatory"
          class="btn btn-ghost btn-sm"
          type="button"
          :disabled="saving || loading"
          @click="skipStep"
        >
          Skip step
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
          class="rounded-lg border border-dashed border-base-200 p-8 text-center text-base-content/50"
        >
          <Icon name="lucide:list-checks" class="mx-auto mb-2 h-10 w-10" />
          <p class="text-sm">No eligibility questions yet. Add questions or skip this step.</p>
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
                :disabled="saving"
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
                  placeholder="e.g. Is your company registered in Zimbabwe?"
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
                </select>
              </label>
            </div>
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
const { getTenderEligibilityQuestions, syncTenderEligibilityQuestions } = useTenderHelper();

const loading = ref(true);
const saving = ref(false);
const errorMessage = ref('');
/** @type {import('vue').Ref<Array<{ _key: string, question: string, response_type: string }>>} */
const questions = ref([]);
const rowErrors = reactive({});

const isMandatory = computed(() => questions.value.length > 0);

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
    return true;
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
    errorMessage.value = 'Complete every question or remove empty rows before continuing.';
  }

  return valid;
}

function buildPayload() {
  return questions.value.map((row) => ({
    question: row.question.trim(),
    response_type: row.response_type,
  }));
}

async function persist(questionsPayload) {
  const { data, status, error } = await syncTenderEligibilityQuestions(props.tenderUuid, {
    questions: questionsPayload,
  });
  if (!status?.value) {
    errorMessage.value =
      error?.value?.data?.message
      || error?.value?.data?.errors
      || data?.value?.message
      || 'Failed to save eligibility questions.';
    if (typeof errorMessage.value === 'object') {
      errorMessage.value = Object.values(errorMessage.value).flat().join(' ');
    }
    return false;
  }
  return true;
}

async function skipStep() {
  if (questions.value.length > 0) {
    errorMessage.value = 'Remove added questions before skipping, or save them to continue.';
    return;
  }
  errorMessage.value = '';
  saving.value = true;
  const ok = await persist([]);
  saving.value = false;
  if (!ok) return;
  toast.success({
    title: 'Skipped',
    message: 'Eligibility forms step skipped.',
    position: 'topRight',
    layout: 2,
  });
  emit('saved');
}

async function saveAndContinue() {
  errorMessage.value = '';
  if (!validateClient()) return;

  saving.value = true;
  const ok = await persist(buildPayload());
  saving.value = false;
  if (!ok) return;

  toast.success({
    title: 'Saved',
    message: questions.value.length
      ? 'Eligibility questions saved.'
      : 'Eligibility forms cleared.',
    position: 'topRight',
    layout: 2,
  });
  emit('saved');
}

async function load() {
  loading.value = true;
  errorMessage.value = '';
  const { data, error } = await getTenderEligibilityQuestions(props.tenderUuid);
  if (error.value) {
    errorMessage.value = error.value?.data?.message || 'Failed to load eligibility questions.';
    loading.value = false;
    return;
  }
  const payload = data.value?.data ?? {};
  const rows = payload.questions ?? [];
  questions.value = rows.map((r) => newRow(r.question ?? '', r.response_type ?? 'YES_NO'));
  loading.value = false;
}

onMounted(() => load());
</script>

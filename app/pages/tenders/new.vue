<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold">New Tender</h1>
        <p class="text-xs text-base-content/60">Create a tender in {{ TOTAL_STEPS }} steps.</p>
      </div>
      <NuxtLink to="/dashboard" class="btn btn-ghost btn-sm">
        <Icon name="lucide:arrow-left" class="h-4 w-4" />
        Back
      </NuxtLink>
    </div>

    <ul class="steps steps-horizontal w-full overflow-x-auto text-xs sm:text-sm">
      <li
        v-for="(label, i) in STEP_LABELS"
        :key="i"
        class="step"
        :class="{ 'step-primary': step >= i + 1 }"
      >
        {{ label }}
      </li>
    </ul>

    <TendersAppItemsStep
      v-if="step === 2"
      :tender-uuid="tenderUuid"
      @saved="onStep2Saved"
      @back="onStep2Back"
    />

    <TendersDocumentEligibilityStep
      v-else-if="step === 3"
      :tender-uuid="tenderUuid"
      @saved="onStep3Saved"
      @back="onStep3Back"
    />

    <TendersEligibilityFormsStep
      v-else-if="step === 4"
      :tender-uuid="tenderUuid"
      @saved="onStep4Saved"
      @back="onStep4Back"
    />

    <TendersTechnicalEligibilityStep
      v-else-if="step === 5"
      :tender-uuid="tenderUuid"
      @saved="onStep5Saved"
      @back="onStep5Back"
    />

    <TendersFinancialTemplateStep
      v-else-if="step === 6"
      :tender-uuid="tenderUuid"
      @saved="onStep6Saved"
      @back="onStep6Back"
    />

    <TendersDatesManagementStep
      v-else-if="step === 7"
      :tender-uuid="tenderUuid"
      @saved="onStep7Saved"
      @back="onStep7Back"
    />

    <TendersSbdCreateStep
      v-else-if="step === 8"
      :tender-uuid="tenderUuid"
      @saved="onStep8Saved"
      @back="onStep8Back"
    />

    <TendersComplianceAnalysisStep
      v-else-if="step === 9"
      :tender-uuid="tenderUuid"
      @saved="onStep9Saved"
      @back="onStep9Back"
    />

    <div v-else class="card bg-base-100 shadow-sm border border-base-200">
      <div class="card-body">
        <TendersRequestDetailsStep
          v-if="step === 1"
          :mode="tenderUuid ? 'edit' : 'create'"
          :tender-uuid="tenderUuid"
          @saved="onStep1Saved"
        />

        <div v-else class="space-y-3">
          <div class="alert alert-info border border-info/30 bg-info/10">
            <Icon name="lucide:info" class="h-4 w-4" />
            <span>
              <strong>{{ currentStepLabel }}</strong> is a placeholder for now.
            </span>
          </div>

          <div class="flex items-center justify-between">
            <button class="btn" :disabled="step <= 1" @click="goBack">Back</button>
            <div class="flex items-center gap-2">
              <span v-if="tenderUuid" class="text-xs text-base-content/60">
                Draft: <span class="font-mono">{{ tenderUuid }}</span>
              </span>
              <button
                v-if="step < TOTAL_STEPS"
                class="btn btn-primary"
                @click="goNext"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'default',
  sanctum: { authOnly: true },
})

useHead({ title: 'New Tender' })

const TOTAL_STEPS = 9

const STEP_LABELS = [
  'Request details',
  'Line items',
  'Document eligibility',
  'Eligibility Forms',
  'Technical Eligibility',
  'Finance',
  'Dates management',
  'SBD create',
  'Preview & Analysis',
]

const { guardPage } = useCheckPermission('tenders')

onMounted(async () => {
  await guardPage('can.add.tenders', 'You do not have permission to create tenders.')
})

const route = useRoute()

const step = ref(1)
const tenderUuid = ref('')

const currentStepLabel = computed(() => STEP_LABELS[step.value - 1] ?? `Step ${step.value}`)

const getDraftStorageKey = (uuid) => `peclient:tenders:draft:${uuid}:step`

function onStep1Saved(payload) {
  tenderUuid.value = payload?.uuid ?? ''
  step.value = 2
  persistDraftStep()
}

function onStep2Saved() {
  step.value = 3
  persistDraftStep()
}

function onStep2Back() {
  step.value = 1
  persistDraftStep()
}

function onStep3Saved() {
  step.value = 4
  persistDraftStep()
}

function onStep3Back() {
  step.value = 2
  persistDraftStep()
}

function onStep4Saved() {
  step.value = 5
  persistDraftStep()
}

function onStep4Back() {
  step.value = 3
  persistDraftStep()
}

function onStep5Saved() {
  step.value = 6
  persistDraftStep()
}

function onStep5Back() {
  step.value = 4
  persistDraftStep()
}

function onStep6Saved() {
  step.value = 7
  persistDraftStep()
}

function onStep6Back() {
  step.value = 5
  persistDraftStep()
}

function onStep7Saved() {
  step.value = 8
  persistDraftStep()
}

function onStep7Back() {
  step.value = 6
  persistDraftStep()
}

function onStep8Saved() {
  step.value = 9
  persistDraftStep()
}

function onStep8Back() {
  step.value = 7
  persistDraftStep()
}

function onStep9Saved() {
  persistDraftStep()
  navigateTo('/tenders')
}

function onStep9Back() {
  step.value = 8
  persistDraftStep()
}

function goBack() {
  if (step.value > 1) {
    step.value--
    persistDraftStep()
  }
}

function goNext() {
  if (step.value < TOTAL_STEPS) {
    step.value++
    persistDraftStep()
  }
}

function persistDraftStep() {
  if (!process.client) return
  if (!tenderUuid.value) return
  try {
    window.localStorage.setItem(getDraftStorageKey(tenderUuid.value), String(step.value))
  } catch {
    // ignore localStorage failures (private mode, disabled storage, etc.)
  }
}

function restoreDraftFromQuery() {
  const uuid = String(route.query?.draft ?? '').trim()
  if (!uuid) return

  tenderUuid.value = uuid
  if (!process.client) return

  try {
    const raw = window.localStorage.getItem(getDraftStorageKey(uuid))
    const savedStep = Number(raw)
    if (Number.isFinite(savedStep) && savedStep >= 1 && savedStep <= TOTAL_STEPS) {
      step.value = savedStep
    } else {
      step.value = 2 // assume step 1 was already saved to create the draft
    }
  } catch {
    step.value = 2
  }
}

watch(step, () => persistDraftStep())

onMounted(() => restoreDraftFromQuery())
</script>

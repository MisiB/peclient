<template>
  <div class="w-full space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="text-lg font-semibold">Preview &amp; compliance analysis</h2>
          <span class="badge badge-warning badge-sm">Required</span>
        </div>
        <p class="text-sm text-base-content/60">
          The EGP AI application reviews the information captured in steps 1–8 and combines it with statutory
          and structural safeguards before publication.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn btn-ghost btn-sm" type="button" @click="emit('back')">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          Back
        </button>
        <button class="btn btn-primary btn-sm" type="button" :disabled="running" @click="runAnalysis">
          <span v-if="running" class="loading loading-spinner loading-xs" />
          <Icon v-else name="lucide:scan-search" class="h-4 w-4" />
          Run AI preview &amp; analysis
        </button>
      </div>
    </div>

    <div v-if="!lawKbReady" class="alert alert-warning border border-warning/30 bg-warning/10">
      <Icon name="lucide:book-open" class="h-5 w-5 shrink-0" />
      <span class="text-sm">
        The AI application will still review the tender, but legal citations cannot be verified until the
        procurement-law knowledge base is indexed.
      </span>
    </div>

    <div v-if="errorMessage" class="alert alert-error border border-error/30 bg-error/10">
      <Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <div v-if="running && analysisStatus === 'PENDING'" class="alert alert-info border border-info/30 bg-info/10">
      <span class="loading loading-spinner loading-sm" />
      <span class="text-sm text-black">The EGP AI application is reviewing the tender in the background…</span>
    </div>

    <div v-if="loading" class="card border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body flex items-center justify-center gap-2 p-10 text-base-content/50">
        <span class="loading loading-spinner loading-md" />
        <span class="text-sm">Loading analysis…</span>
      </div>
    </div>

    <template v-else-if="report">
      <div
        role="alert"
        :class="['alert', report.can_publish ? 'alert-success border-success/30 bg-success/10' : 'alert-warning border-warning/30 bg-warning/10']"
      >
        <Icon :name="report.can_publish ? 'lucide:check-circle' : 'lucide:alert-triangle'" class="h-5 w-5 shrink-0" />
        <div>
          <p class="font-semibold">
            {{ report.can_publish ? 'Tender appears ready for publication.' : 'Tender is not ready for publication.' }}
          </p>
          <p v-if="!report.can_publish" class="text-sm">Resolve the issues below before issuing the bidding document.</p>
        </div>
      </div>

      <section class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-4 p-4 sm:p-6">
          <div class="flex items-center justify-between border-b border-base-200 pb-2">
            <h3 class="text-base font-semibold">Tier 1 — Statutory &amp; structural checks</h3>
            <span :class="['badge badge-sm', report.tier1?.passed ? 'badge-success' : 'badge-error']">
              {{ report.tier1?.passed ? 'Passed' : 'Issues found' }}
            </span>
          </div>

          <div v-for="step in report.tier1?.steps ?? []" :key="step.step" class="border-b border-base-200 pb-4 last:border-0">
            <p class="font-medium">Step {{ step.step }}: {{ step.label }}</p>
            <ul class="mt-2 space-y-2">
              <li v-for="check in step.checks" :key="check.key" class="flex items-start gap-2 text-sm">
                <Icon
                  :name="check.status === 'pass' ? 'lucide:check-circle' : 'lucide:x-circle'"
                  :class="['mt-0.5 h-4 w-4 shrink-0', check.status === 'pass' ? 'text-success' : 'text-error']"
                />
                <div>
                  <span>{{ check.label }}</span>
                  <span class="block text-base-content/60">{{ check.message }}</span>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section v-if="report.tier2" class="card border border-base-200 bg-base-100 shadow-sm">
        <div class="card-body gap-3 p-4 sm:p-6">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-base font-semibold">Tier 2 — AI preview &amp; legal analysis</h3>
            <div v-if="report.ai_application?.used" class="flex flex-wrap gap-2">
              <span class="badge badge-primary badge-sm">EGP AI application</span>
              <span v-if="report.ai_application.model" class="badge badge-outline badge-sm">
                {{ report.ai_application.provider }} · {{ report.ai_application.model }}
              </span>
              <span class="badge badge-outline badge-sm">
                {{ report.ai_application.knowledge_base_used ? 'Law RAG used' : 'No law RAG' }}
              </span>
            </div>
          </div>
          <p v-if="report.tier2.message && report.tier2.status !== 'skipped'" class="text-sm text-base-content/60">
            {{ report.tier2.message }}
          </p>
          <p v-if="report.tier2.status === 'skipped'" class="text-sm text-base-content/60">
            {{ report.tier2.message }}
          </p>
          <ul v-else class="space-y-3">
            <li
              v-for="(finding, i) in report.tier2.findings"
              :key="i"
              class="rounded-lg border border-base-200 p-3 text-sm"
            >
              <div class="flex flex-wrap items-center gap-2">
                <span class="badge badge-sm badge-outline">Step {{ finding.step }}</span>
                <span
                  :class="[
                    'badge badge-sm',
                    finding.severity === 'critical' ? 'badge-error' : finding.severity === 'warning' ? 'badge-warning' : 'badge-ghost',
                  ]"
                >
                  {{ finding.severity }}
                </span>
              </div>
              <p class="mt-2 font-medium">{{ finding.finding }}</p>
              <p v-if="finding.recommendation" class="text-base-content/70">{{ finding.recommendation }}</p>
              <p v-if="finding.legal_citation" class="mt-1 text-xs text-primary">{{ finding.legal_citation }}</p>
            </li>
            <li v-if="!(report.tier2.findings?.length)" class="text-sm text-base-content/60">
              No additional legal findings.
            </li>
          </ul>
        </div>
      </section>

      <div class="flex justify-end">
        <button class="btn btn-primary" type="button" @click="finish">
          Finish draft review
        </button>
      </div>
    </template>

    <div v-else class="card border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body p-6 text-center text-base-content/60">
        <p>Run the EGP AI application to preview and analyse all wizard steps before publication.</p>
        <button class="btn btn-primary btn-sm mt-4" type="button" :disabled="running" @click="runAnalysis">
          Run AI preview &amp; analysis
        </button>
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
const { getTenderComplianceAnalysis, runTenderComplianceAnalysis } = useTenderHelper();

const loading = ref(true);
const running = ref(false);
const errorMessage = ref('');
const report = ref(null);
const lawKbReady = ref(false);
const analysisStatus = ref(null);
let pollTimer = null;

function clearPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPoll() {
  clearPoll();
  pollTimer = setInterval(() => load(false), 4000);
}

async function load(showSpinner = true) {
  if (showSpinner) loading.value = true;
  errorMessage.value = '';
  const { data, error } = await getTenderComplianceAnalysis(props.tenderUuid);
  if (error.value) {
    errorMessage.value = error.value?.data?.message || 'Failed to load compliance analysis.';
    loading.value = false;
    clearPoll();
    return;
  }
  const payload = data.value?.data ?? {};
  lawKbReady.value = Boolean(payload.law_kb_ready);
  analysisStatus.value = payload.analysis_status ?? null;

  if (payload.analysis_status === 'PENDING') {
    running.value = true;
    if (!pollTimer) startPoll();
    loading.value = false;
    return;
  }

  running.value = false;
  clearPoll();

  if (payload.analysis_status === 'FAILED') {
    errorMessage.value = payload.analysis_error || 'Analysis failed.';
    loading.value = false;
    return;
  }

  report.value = payload.report ?? null;
  if (!report.value && payload.tier1_preview) {
    report.value = {
      can_publish: false,
      preview_only: true,
      tier1: payload.tier1_preview,
      tier2: { status: 'skipped', findings: [], message: 'Run AI preview and analysis for the legal review.' },
    };
  }

  if (payload.report && showSpinner === false) {
    toast.success({
      title: 'Analysis complete',
      message: payload.report?.can_publish ? 'No blocking issues found.' : 'Review the findings below.',
      position: 'topRight',
      layout: 2,
    });
  }
  loading.value = false;
}

async function runAnalysis() {
  running.value = true;
  errorMessage.value = '';
  const { status, data, error } = await runTenderComplianceAnalysis(props.tenderUuid);

  if (!status?.value) {
    running.value = false;
    errorMessage.value = error.value?.data?.message || 'Analysis failed.';
    return;
  }

  const body = data.value?.data ?? {};
  if (body.analysis_status === 'PENDING' || !body.report) {
    analysisStatus.value = 'PENDING';
    startPoll();
    return;
  }

  running.value = false;
  report.value = body.report ?? null;
  lawKbReady.value = Boolean(report.value?.law_kb_ready);
  toast.success({
    title: 'Analysis complete',
    message: report.value?.can_publish ? 'No blocking issues found.' : 'Review the findings below.',
    position: 'topRight',
    layout: 2,
  });
}

function finish() {
  if (report.value && (!report.value.can_publish || !report.value.ai_application?.used)) {
    toast.error({
      title: 'Cannot finish review',
      message: 'Resolve the compliance issues and run the AI preview and analysis again.',
      position: 'topRight',
      layout: 2,
    });
    return;
  }
  emit('saved');
}

onMounted(() => load());
onUnmounted(() => clearPoll());
</script>

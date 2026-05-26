<template>
  <div class="flex flex-col gap-6">
    <!-- Annual procurement plan banner -->
    <section v-if="planChecked">
      <div
        v-if="!planFound"
        role="alert"
        class="alert alert-error border border-error/30 bg-error/10"
      >
        <Icon name="lucide:alert-triangle" class="h-5 w-5" />
        <div>
          <p class="font-semibold">
            No annual procurement plan found for {{ currentYear }}.
          </p>
          <p class="text-sm">
            All procurements will be subject to default procurement class
            <span class="font-mono font-bold">C</span>
            until a plan is captured for {{ companyName }} for {{ currentYear }}.
          </p>
        </div>
      </div>

      <div
        v-else-if="!planApproved"
        role="alert"
        class="alert alert-warning border border-warning/30 bg-warning/10"
      >
        <Icon name="lucide:alert-triangle" class="h-5 w-5" />
        <div>
          <p class="font-semibold">
            {{ currentYear }} Annual Procurement Plan
          </p>
          <p class="text-sm">
            Procurement class:
            <span class="font-bold">{{ planClassName || 'unassigned' }}</span>
            · Status: <span class="font-mono">{{ plan?.status }}</span>.
            <template v-if="planClassName">Class {{ planClassName }} will be in effect once approved.</template>
            <template v-else>The procurement class will be in effect once approved.</template>
          </p>
        </div>
      </div>

      <div
        v-else
        role="alert"
        class="alert alert-success border border-success/30 bg-success/10 text-success"
      >
        <Icon name="lucide:check-circle" class="h-5 w-5" />
        <div>
          <p class="font-semibold">
            {{ currentYear }} Annual Procurement Plan is approved.
          </p>
          <p class="text-sm">
            Procurement class:
            <span class="font-bold">{{ planClassName || 'unassigned' }}</span>
            · Status: <span class="font-mono">{{ plan?.status }}</span>
          </p>
        </div>
      </div>
    </section>

    <!-- KPI placeholders -->
    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="kpi in kpis" :key="kpi.label" class="card bg-base-100 shadow-sm border border-base-200">
        <div class="card-body p-5">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-base-content/60">{{ kpi.label }}</p>
              <p class="mt-1 text-2xl font-semibold">{{ kpi.value }}</p>
            </div>
            <div :class="['rounded-lg p-2', kpi.bg]">
              <Icon :name="kpi.icon" :class="['h-5 w-5', kpi.color]" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Coming soon -->
    <section class="card bg-base-100 shadow-sm border border-base-200">
      <div class="card-body">
        <ComingSoon
          title="Tender management"
          description="Create, publish, evaluate and award tenders. Coming soon."
        />
      </div>
    </section>
  </div>
</template>

<script setup>
definePageMeta({
  layout: 'default',
  sanctum: { authOnly: true },
});

useHead({ title: 'Dashboard' });

const { getCompanyPlan } = useDashboardHelper();

const planChecked = ref(false);
const planFound = ref(false);
const company = ref(null);
const plan = ref(null);
const currentYear = ref(new Date().getFullYear());

const companyName = computed(() => company.value?.name ?? 'your company');
const planClassName = computed(() => plan.value?.procurementclass?.name ?? null);
const planApproved = computed(() => plan.value?.status === 'ACTIVE');

const kpis = [
  { label: 'Open Tenders', value: '—', icon: 'lucide:megaphone', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Pending Evaluations', value: '—', icon: 'lucide:clipboard-check', color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Awarded Contracts', value: '—', icon: 'lucide:trophy', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Active Users', value: '—', icon: 'lucide:users', color: 'text-sky-600', bg: 'bg-sky-50' },
];

onMounted(async () => {
  const { data, error } = await getCompanyPlan();
  if (!error.value) {
    const payload = data.value?.data ?? {};
    company.value = payload.company ?? null;
    plan.value = payload.plan ?? null;
    currentYear.value = payload.year ?? currentYear.value;
    planFound.value = !!payload.has_plan;
  }
  // Show the banner regardless of fetch outcome — if the fetch errored we
  // still want the user to know to capture a plan.
  planChecked.value = true;
});
</script>

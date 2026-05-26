<template>
  <div class="p-6">
    <div class="card outline card-xs outline-1 outline-base-200">
      <div class="card-body">
        <div class="breadcrumbs text-sm">
          <ul>
            <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
            <li><NuxtLink to="/procurementrequests">Procurement Requests</NuxtLink></li>
            <li>{{ pr?.pr_number ?? 'Detail' }}</li>
          </ul>
        </div>
      </div>
    </div>

    <div v-if="loading" class="mt-6 flex justify-center">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="!pr" class="mt-6 rounded-lg border border-dashed border-base-300 p-12 text-center text-sm opacity-70">
      Not found.
    </div>

    <div v-else class="mt-4 space-y-4">
      <div class="card bg-base-100 outline outline-1 outline-base-200">
        <div class="card-body">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="text-xs uppercase opacity-60">{{ pr.status }}</div>
              <h1 class="text-2xl font-bold">{{ pr.pr_number }} — {{ pr.projectname }}</h1>
              <p class="text-sm opacity-70">{{ pr.location || '—' }}</p>
            </div>
            <div class="flex gap-2">
              <span v-if="pr.requires_spoc" class="badge badge-warning">SPOC required</span>
              <span v-if="pr.is_unplanned" class="badge badge-error">Unplanned</span>
            </div>
          </div>

          <div class="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <div><div class="opacity-60">Created</div><div>{{ pr.request_create_date }}</div></div>
            <div><div class="opacity-60">User requisition</div><div>{{ pr.user_requisition_date }}</div></div>
            <div><div class="opacity-60">Plan year</div><div>{{ pr.plan_year }}</div></div>
            <div><div class="opacity-60">Class / Group / Method</div>
              <div>{{ pr.procurementclass?.name ?? '—' }} / {{ pr.procurementgroup?.name ?? '—' }} / {{ pr.procurementmethod?.name ?? '—' }}</div>
            </div>
            <div><div class="opacity-60">Evaluation criterion</div><div>{{ pr.evaluationcriterion?.name ?? '—' }}</div></div>
            <div><div class="opacity-60">Selection / Response / Rule</div>
              <div>{{ pr.item_selection_mode }} / {{ pr.response_mode }} / {{ pr.multi_item_rule ?? '—' }}</div>
            </div>
            <div><div class="opacity-60">Total estimated</div><div class="font-bold">{{ Number(pr.total_estimated_value).toFixed(2) }} {{ pr.currency?.code ?? '' }}</div></div>
            <div><div class="opacity-60">SPOC threshold</div><div>{{ pr.spoc_threshold_amount ? Number(pr.spoc_threshold_amount).toFixed(2) : '—' }}</div></div>
            <div><div class="opacity-60">Bid security / sheet</div>
              <div>
                <span v-if="pr.bid_security_required">Security ({{ pr.bid_security_validity_days }}d)</span>
                <span v-else-if="pr.bid_submission_sheet_required">Submission sheet</span>
                <span v-else>None</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card bg-base-100 outline outline-1 outline-base-200">
        <div class="card-body">
          <h2 class="text-base font-semibold">Line items</h2>
          <div class="overflow-x-auto">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>APP item</th>
                  <th>Categories</th>
                  <th class="text-right">Consumption qty</th>
                  <th class="text-right">Estimated</th>
                  <th>Deliverables</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in pr.items" :key="item.id" class="align-top">
                  <td>
                    <div v-if="item.annualprocurementplanitem">{{ item.annualprocurementplanitem.description }}</div>
                    <div v-else class="text-xs opacity-50">— (unplanned)</div>
                  </td>
                  <td>
                    <div class="flex flex-wrap gap-1">
                      <span v-for="sc in item.suppliercategories" :key="sc.id" class="badge badge-xs">{{ sc.name }}</span>
                      <span v-if="!item.suppliercategories?.length" class="text-xs opacity-40">—</span>
                    </div>
                  </td>
                  <td class="text-right">{{ item.consumption_quantity ?? '—' }}</td>
                  <td class="text-right font-mono">{{ Number(item.estimated_value).toFixed(2) }}</td>
                  <td>
                    <ul class="list-disc pl-4 text-xs">
                      <li v-for="d in item.deliverables" :key="d.id">
                        {{ d.description }} — {{ d.quantity }} {{ d.unitofmeasure?.abbreviation ?? '' }}
                        <span v-if="d.estimated_value">@ {{ Number(d.estimated_value).toFixed(2) }}</span>
                      </li>
                      <li v-if="!item.deliverables?.length" class="text-xs opacity-40 list-none">— none —</li>
                    </ul>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } });
useHead({ title: 'Procurement Request' });

const route = useRoute();
const { get } = useProcurementrequestHelper();
const pr = ref(null);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  const { data } = await get(route.params.uuid);
  pr.value = data.value?.data ?? null;
  loading.value = false;
});
</script>

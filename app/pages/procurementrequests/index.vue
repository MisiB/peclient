<template>
  <div class="p-6">
    <div class="card outline card-xs outline-1 outline-base-200">
      <div class="card-body">
        <div class="breadcrumbs text-sm">
          <ul>
            <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
            <li>Procurement Requests</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="mt-4 flex items-center justify-between">
      <h1 class="text-xl font-bold">Procurement Requests</h1>
      <NuxtLink to="/procurementrequests/create" class="btn btn-success btn-sm">
        <Icon name="lucide:plus" />
        <span class="hidden md:block">New Request</span>
      </NuxtLink>
    </div>

    <div v-if="loading" class="mt-6 flex justify-center">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else-if="!rows.length" class="mt-6 rounded-lg border border-dashed border-base-300 p-12 text-center text-sm opacity-70">
      No procurement requests yet. <NuxtLink to="/procurementrequests/create" class="link link-primary">Create your first →</NuxtLink>
    </div>

    <div v-else class="mt-4 overflow-x-auto rounded-lg border border-base-300 bg-base-100">
      <table class="table table-sm">
        <thead>
          <tr>
            <th>PR No.</th>
            <th>Project</th>
            <th>Method</th>
            <th>Group</th>
            <th class="text-right">Estimated</th>
            <th>SPOC</th>
            <th>Unplanned</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pr in rows" :key="pr.id">
            <td class="font-mono">{{ pr.pr_number }}</td>
            <td>{{ pr.projectname }}</td>
            <td>{{ pr.procurementmethod?.name ?? '—' }}</td>
            <td>{{ pr.procurementgroup?.name ?? '—' }}</td>
            <td class="text-right">{{ Number(pr.total_estimated_value).toFixed(2) }}</td>
            <td>
              <span v-if="pr.requires_spoc" class="badge badge-warning badge-sm">SPOC</span>
              <span v-else class="text-xs opacity-50">—</span>
            </td>
            <td>
              <span v-if="pr.is_unplanned" class="badge badge-error badge-sm">Unplanned</span>
              <span v-else class="text-xs opacity-50">—</span>
            </td>
            <td><span class="badge badge-sm">{{ pr.status }}</span></td>
            <td class="text-right">
              <NuxtLink :to="`/procurementrequests/${pr.uuid}`" class="btn btn-ghost btn-xs">View</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } });
useHead({ title: 'Procurement Requests' });

const { list } = useProcurementrequestHelper();
const loading = ref(false);
const rows = ref([]);

onMounted(async () => {
  loading.value = true;
  const { data, error } = await list();
  if (!error.value) {
    rows.value = data.value?.data ?? [];
  }
  loading.value = false;
});
</script>

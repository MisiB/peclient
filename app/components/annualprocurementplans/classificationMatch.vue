<template>
  <div>
    <button type="button" class="btn btn-outline btn-sm gap-2" @click="open">
      <Icon name="lucide:sparkles" class="h-4 w-4" />
      Scan & match
    </button>

    <dialog ref="dialog" class="modal">
      <div class="modal-box max-w-6xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="flex items-center gap-2 text-xl font-bold">
              <Icon name="lucide:scan-search" class="text-primary" />
              APP classification matches
            </h3>
            <p class="mt-1 text-sm text-base-content/60">
              AI suggestions use the indexed UNSPSC catalogue and the published NSPL edition.
              Nothing changes until you confirm a row.
            </p>
          </div>
          <button type="button" class="btn btn-circle btn-ghost btn-sm" @click="close">
            <Icon name="lucide:x" />
          </button>
        </div>

        <div class="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-base-200/60 p-3">
          <div>
            <div class="font-semibold">{{ statusLabel }}</div>
            <progress
              v-if="isRunning"
              class="progress progress-primary mt-2 w-64"
              :value="run?.processed_items ?? 0"
              :max="run?.total_items || 1"
            />
            <div v-if="run" class="mt-1 text-xs text-base-content/60">
              {{ run.processed_items }}/{{ run.total_items }} processed · {{ run.matched_items }} with suggestions
            </div>
          </div>
          <button
            v-if="canEdit"
            type="button"
            class="btn btn-primary btn-sm gap-2"
            :disabled="isRunning || starting"
            @click="start"
          >
            <span v-if="starting" class="loading loading-spinner loading-xs" />
            <Icon v-else name="lucide:play" />
            {{ run ? 'Run again' : 'Start scan' }}
          </button>
        </div>

        <div v-if="run?.error_message" role="alert" class="alert alert-error mt-4">
          <Icon name="lucide:triangle-alert" />
          <span>{{ run.error_message }}</span>
        </div>

        <div v-if="matches.length" class="mt-5 max-h-[60vh] overflow-auto rounded-xl border border-base-200">
          <table class="table table-sm">
            <thead class="sticky top-0 z-10 bg-base-100">
              <tr>
                <th>APP item</th>
                <th>Suggested UNSPSC</th>
                <th>Suggested NSPL item</th>
                <th>Confidence</th>
                <th class="text-right">Review</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="match in matches" :key="match.id">
                <td class="max-w-xs">
                  <div class="font-semibold">{{ match.item?.reference_no || `Item ${match.item?.id}` }}</div>
                  <div class="whitespace-normal text-xs text-base-content/70">{{ match.item?.description }}</div>
                </td>
                <td>
                  <template v-if="match.suggested_unspsc">
                    <div class="font-mono font-semibold">{{ match.suggested_unspsc.code }}</div>
                    <div class="max-w-xs whitespace-normal text-xs">{{ match.suggested_unspsc.name }}</div>
                  </template>
                  <span v-else class="text-base-content/40">No match</span>
                </td>
                <td>
                  <template v-if="match.suggested_nspl_product">
                    <div class="font-mono font-semibold">{{ match.suggested_nspl_product.code }}</div>
                    <div class="max-w-xs whitespace-normal text-xs">{{ match.suggested_nspl_product.name }}</div>
                    <div class="text-xs text-base-content/50">
                      {{ match.suggested_nspl_product.edition?.period }}
                    </div>
                  </template>
                  <span v-else class="text-base-content/40">No match</span>
                </td>
                <td class="space-y-1">
                  <div>UNSPSC {{ percent(match.unspsc_score) }}</div>
                  <div>NSPL {{ percent(match.nspl_score) }}</div>
                </td>
                <td class="text-right">
                  <div v-if="match.status === 'PENDING' && canEdit" class="flex justify-end gap-1">
                    <button
                      class="btn btn-success btn-xs"
                      :disabled="deciding === match.id || (!match.suggested_unspsc_id && !match.suggested_nspl_product_id)"
                      @click="decide(match, 'CONFIRMED')"
                    >
                      Confirm
                    </button>
                    <button class="btn btn-ghost btn-xs" :disabled="deciding === match.id" @click="decide(match, 'REJECTED')">
                      Reject
                    </button>
                  </div>
                  <span v-else :class="['badge badge-sm', match.status === 'CONFIRMED' ? 'badge-success' : 'badge-ghost']">
                    {{ match.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="!loading && !isRunning" class="py-12 text-center text-base-content/50">
          No classification scan has been completed yet.
        </div>

        <div class="modal-action">
          <button type="button" class="btn" @click="close">Close</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
  canEdit: { type: Boolean, default: false },
});

const dialog = ref(null);
const run = ref(null);
const loading = ref(false);
const starting = ref(false);
const deciding = ref(null);
let pollTimer = null;

const { getClassificationMatches, startClassificationMatch, decideClassificationMatch } = useAnnualprocurementplanHelper();
const store = useAnnualprocurementplanStore();

const matches = computed(() => run.value?.matches ?? []);
const isRunning = computed(() => ['PENDING', 'PROCESSING'].includes(run.value?.status));
const statusLabel = computed(() => {
  if (!run.value) return 'Ready to scan';
  if (isRunning.value) return 'Scanning plan items…';
  if (run.value.status === 'COMPLETED') return 'Scan completed';
  return 'Scan failed';
});

const percent = (score) => score === null || score === undefined ? '—' : `${Math.round(Number(score) * 100)}%`;

const stopPoll = () => {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = null;
};

const load = async () => {
  const { data, error } = await getClassificationMatches(props.planUuid);
  if (!error.value) run.value = data.value?.data?.run ?? null;
  if (isRunning.value) {
    stopPoll();
    pollTimer = setTimeout(load, 2000);
  }
};

const open = async () => {
  dialog.value?.showModal();
  loading.value = true;
  await load();
  loading.value = false;
};

const close = () => {
  stopPoll();
  dialog.value?.close();
};

const start = async () => {
  starting.value = true;
  const { data, status } = await startClassificationMatch(props.planUuid);
  starting.value = false;
  if (status.value) {
    run.value = data.value?.data?.run ?? null;
    await load();
  }
};

const decide = async (match, decision) => {
  deciding.value = match.id;
  const { status } = await decideClassificationMatch(props.planUuid, match.id, decision);
  deciding.value = null;
  if (status.value) {
    await Promise.all([load(), store.fetchGroupedItems(props.planUuid, { page: 1 })]);
  }
};

onBeforeUnmount(stopPoll);
</script>

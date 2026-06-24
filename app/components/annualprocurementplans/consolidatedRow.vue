<template>
  <div class="overflow-hidden rounded-xl border border-base-200">
    <div class="flex w-full items-center gap-2 bg-base-200/40 px-3 py-2.5 transition-colors hover:bg-base-200/60">
      <button
        type="button"
        class="shrink-0"
        :title="expanded ? 'Collapse' : 'Expand'"
        @click="expanded = !expanded"
      >
        <Icon :name="expanded ? 'lucide:chevron-down' : 'lucide:chevron-right'" class="h-4 w-4" />
      </button>
      <span class="badge badge-neutral badge-sm shrink-0">Consolidated</span>

      <!-- Edit mode: rename the group -->
      <div v-if="editing" class="flex min-w-0 flex-1 items-center gap-1">
        <input
          ref="nameInput"
          v-model="draftName"
          type="text"
          class="input input-bordered input-sm min-w-0 flex-1"
          :placeholder="group.derived_name || 'Group name'"
          :disabled="saving"
          @keyup.enter="save"
          @keyup.esc="cancel"
        />
        <button type="button" class="btn btn-success btn-sm btn-square" :disabled="saving" title="Save" @click="save">
          <span v-if="saving" class="loading loading-spinner loading-xs" />
          <Icon v-else name="lucide:check" class="h-4 w-4" />
        </button>
        <button type="button" class="btn btn-ghost btn-sm btn-square" :disabled="saving" title="Cancel" @click="cancel">
          <Icon name="lucide:x" class="h-4 w-4" />
        </button>
      </div>

      <!-- Display mode -->
      <template v-else>
        <button type="button" class="flex min-w-0 flex-1 flex-col items-start text-left" @click="expanded = !expanded">
          <span class="flex max-w-full items-center gap-1.5">
            <span class="truncate font-semibold" :title="group.name">{{ group.name || group.reference_no }}</span>
            <Icon
              v-if="group.name_custom"
              name="lucide:pencil-line"
              class="h-3 w-3 shrink-0 text-base-content/40"
              title="Custom name"
            />
          </span>
          <span class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-base-content/50">
            <span class="font-mono">{{ group.reference_no }}</span>
            <span class="opacity-40">·</span>
            <span>{{ group.item_count }} items</span>
            <span class="opacity-40">·</span>
            <span class="inline-flex items-center gap-1">
              <Icon name="lucide:boxes" class="h-3 w-3" />
              {{ groupLabel }}
            </span>
            <span class="opacity-40">·</span>
            <span class="inline-flex items-center gap-1">
              <Icon name="lucide:gavel" class="h-3 w-3" />
              {{ methodLabel }}
            </span>
          </span>
        </button>
        <span class="flex shrink-0 items-baseline gap-4 text-right">
          <span class="text-xs text-base-content/60">
            <span class="font-semibold">Total Qnty</span> {{ formatAmount(group.total_quantity) }}
          </span>
          <span class="text-xs text-base-content/60">
            <span class="font-semibold">Total Value</span>
            <span class="ml-1 font-mono text-sm font-semibold text-base-content/80">{{ currency }}{{ formatAmount(group.total_budget) }}</span>
          </span>
        </span>
        <button
          v-if="canEdit && canEditPlan"
          type="button"
          class="btn btn-ghost btn-xs btn-square shrink-0"
          title="Rename group"
          @click="startEdit"
        >
          <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
        </button>
      </template>
    </div>

    <div v-if="expanded" class="divide-y divide-base-200 border-t border-base-200">
      <AnnualprocurementplansPlanItemRow
        v-for="child in group.children"
        :key="child.id"
        :item="child"
        :plan-uuid="planUuid"
        :can-edit="canEdit"
        :can-delete="canDelete"
        :can-edit-plan="canEditPlan"
      />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  group: { type: Object, required: true },
  planUuid: { type: String, required: true },
  currency: { type: String, default: '' },
  canEdit: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
  canEditPlan: { type: Boolean, default: false },
});

const store = useAnnualprocurementplanStore();

const expanded = ref(false);

// Inline rename of the consolidation group.
const editing = ref(false);
const saving = ref(false);
const draftName = ref('');
const nameInput = ref(null);

function startEdit() {
  // Pre-fill with the custom name if one exists; otherwise leave blank so the
  // placeholder shows the auto-derived name (blank on save reverts to auto).
  draftName.value = props.group.name_custom ? (props.group.name ?? '') : '';
  editing.value = true;
  nextTick(() => nameInput.value?.focus?.());
}

function cancel() {
  editing.value = false;
}

async function save() {
  saving.value = true;
  const ok = await store.renameConsolidation(props.planUuid, props.group.reference_no, draftName.value.trim());
  saving.value = false;
  if (ok) editing.value = false;
}

const formatAmount = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Procurement group/method for the whole consolidation. Children usually share
// one value (they must to be tender-eligible together), but a plan can group by
// reference alone — so show the shared value, or "Mixed" when they differ.
const distinctLabel = (relation, rawKey) => {
  const labels = new Set();
  for (const child of props.group.children ?? []) {
    const name = child[relation]?.name || (child[rawKey] ? `"${child[rawKey]}"` : null);
    if (name) labels.add(name);
  }
  if (labels.size === 0) return '—';
  if (labels.size === 1) return [...labels][0];
  return 'Mixed';
};

const groupLabel = computed(() => distinctLabel('procurementgroup', 'raw_procurementgroup_code'));
const methodLabel = computed(() => distinctLabel('procurementmethod', 'raw_procurementmethod_code'));
</script>

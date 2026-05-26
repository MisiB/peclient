<template>
  <div class="inline-flex">
    <button class="btn btn-ghost btn-xs" @click="open">
      <Icon name="lucide:eye" />
      Open
    </button>

    <dialog :id="dialogId" class="modal">
      <div class="modal-box h-screen max-h-none w-screen max-w-none rounded-none">
        <div class="flex items-center justify-between border-b border-base-200 pb-2">
          <div>
            <h3 class="text-lg font-bold">
              {{ supplement.title || 'Supplement' }}
              <span class="text-sm font-normal text-base-content/60">· {{ formatStatus(s?.status) }}</span>
            </h3>
            <p v-if="s?.reason" class="text-xs text-base-content/60">{{ s.reason }}</p>
          </div>
          <div class="flex items-center gap-2">
            <SupplementsWorkflowActions v-if="s" :plan-uuid="planUuid" :supplement="s" />
            <button class="btn btn-ghost btn-circle" @click="close">
              <Icon name="lucide:x" />
            </button>
          </div>
        </div>

        <div v-if="!s" class="flex justify-center py-16">
          <span class="loading loading-spinner loading-lg"></span>
        </div>

        <div v-else class="mt-3 space-y-4">
          <!-- Items table -->
          <div class="rounded border border-base-200">
            <div class="flex items-center justify-between border-b border-base-200 bg-base-200/40 px-3 py-2">
              <span class="text-sm font-semibold">Items ({{ s.items?.length ?? 0 }})</span>
              <button v-if="canEditItems" class="btn btn-ghost btn-xs" @click="openItemForm()">
                <Icon name="lucide:plus" />
                Add item
              </button>
            </div>
            <table class="table table-sm w-full">
              <thead>
                <tr class="text-left">
                  <th>Ref</th>
                  <th>Description</th>
                  <th>Method</th>
                  <th>Group</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Unit cost</th>
                  <th class="text-right">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!s.items?.length">
                  <td colspan="8" class="text-center text-base-content/50">No items yet.</td>
                </tr>
                <tr v-for="it in s.items ?? []" :key="it.id">
                  <td class="font-mono text-xs">{{ it.reference_no || '—' }}</td>
                  <td class="max-w-md truncate" :title="it.description">{{ it.description }}</td>
                  <td>{{ it.procurementmethod?.name || '—' }}</td>
                  <td>{{ it.procurementgroup?.name || '—' }}</td>
                  <td class="text-right font-mono">{{ formatAmount(it.quantity) }}</td>
                  <td class="text-right font-mono">{{ formatAmount(it.unit_cost) }}</td>
                  <td class="text-right font-mono">{{ formatAmount(it.total_cost) }}</td>
                  <td class="text-right">
                    <div v-if="canEditItems" class="flex justify-end gap-1">
                      <button class="btn btn-ghost btn-xs" @click="openItemForm(it)">
                        <Icon name="lucide:edit" />
                      </button>
                      <button class="btn btn-ghost btn-xs text-error" @click="confirmRemove(it)">
                        <Icon name="lucide:trash-2" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Workflow history -->
          <div v-if="s.transitions?.length" class="rounded border border-base-200">
            <div class="border-b border-base-200 bg-base-200/40 px-3 py-2 text-sm font-semibold">Workflow history</div>
            <table class="table table-sm w-full">
              <thead>
                <tr class="text-left">
                  <th>When</th>
                  <th>Who</th>
                  <th>Action</th>
                  <th>Status change</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in s.transitions" :key="t.id">
                  <td class="text-xs">{{ formatTime(t.created_at) }}</td>
                  <td class="text-xs">{{ formatUser(t.user) }}</td>
                  <td class="text-xs">{{ t.action }}</td>
                  <td class="font-mono text-xs">{{ t.from_status }} → {{ t.to_status }}</td>
                  <td class="text-xs">{{ t.comment || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Item form modal -->
        <dialog :id="itemFormDialogId" class="modal">
          <div class="modal-box h-screen max-h-none w-screen max-w-none rounded-none">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-bold">{{ editingItem ? 'Edit item' : 'Add item' }}</h3>
              <button class="btn btn-ghost btn-circle" @click="closeItemForm">
                <Icon name="lucide:x" />
              </button>
            </div>
            <form class="mt-3" @submit.prevent="saveItem">
              <AnnualprocurementplansItemForm
                v-model="itemForm"
                :errors="itemErrors"
                :procurementmethods="store.procurementmethods"
                :procurementgroups="store.procurementgroups"
                :sourceoffunds="store.sourceoffunds"
                :unitofmeasures="store.unitofmeasures"
              />
              <div class="modal-action">
                <button type="button" class="btn" @click="closeItemForm">Cancel</button>
                <button type="submit" class="btn btn-primary" :disabled="itemSaving">
                  <span v-if="itemSaving">Saving...</span>
                  <span v-else>Save</span>
                </button>
              </div>
            </form>
          </div>
        </dialog>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';

const props = defineProps({
  planUuid: { type: String, required: true },
  supplement: { type: Object, required: true },
});

const store = useAnnualprocurementplanStore();
const dialogId = computed(() => `supplement_detail_${props.supplement.uuid}`);
const itemFormDialogId = computed(() => `supplement_item_form_${props.supplement.uuid}`);

const s = computed(() => store.currentSupplement);
const canEditItems = computed(() => s.value?.status === 'DRAFT' && store.supplementIsCreator);

const editingItem = ref(null);
const itemForm = ref(initialItemForm());
const itemErrors = reactive({ description: '', quantity: '', unit_cost: '' });
const itemSaving = ref(false);

function initialItemForm() {
  return {
    reference_no: '',
    description: '',
    procurementgroup_id: null,
    procurementmethod_id: null,
    pre_qualification: false,
    eoi: false,
    spoc: false,
    sustainable_procurement: false,
    affirmative_procurement: false,
    procurement_exemption: false,
    eoi_publication_date: '',
    eoi_closing_date: '',
    bid_notice_publication_date: '',
    bid_closing_date: '',
    publish_award_notice: '',
    contract_signing: '',
    cycle_days: null,
    lead_time_days: null,
    estimated_contract_negotiation_days: null,
    sourceoffunds_id: null,
    unitofmeasure_id: null,
    quantity: 0,
    unit_cost: 0,
    total_cost: null,
    expensecategory: 'MOOE',
    consumption_mode: 'ONCE_OFF',
    msds: '',
    quarter: null,
  };
}

const open = async () => {
  document.getElementById(dialogId.value).showModal();
  await store.fetchSupplement(props.planUuid, props.supplement.uuid);
  await store.fetchItemLookups();
};

const close = () => document.getElementById(dialogId.value).close();

const openItemForm = async (item = null) => {
  editingItem.value = item;
  if (item) {
    itemForm.value = {
      ...initialItemForm(),
      ...item,
    };
  } else {
    itemForm.value = initialItemForm();
  }
  await store.fetchItemLookups();
  document.getElementById(itemFormDialogId.value).showModal();
};

const closeItemForm = () => {
  document.getElementById(itemFormDialogId.value).close();
  editingItem.value = null;
};

const saveItem = async () => {
  itemSaving.value = true;
  const ok = editingItem.value
    ? await store.updateSupplementItemAction(props.planUuid, props.supplement.uuid, editingItem.value.id, itemForm.value)
    : await store.addSupplementItemAction(props.planUuid, props.supplement.uuid, itemForm.value);
  itemSaving.value = false;
  if (ok) closeItemForm();
};

const confirmRemove = async (item) => {
  if (!window.confirm(`Remove this item from the supplement?`)) return;
  await store.deleteSupplementItemAction(props.planUuid, props.supplement.uuid, item.id);
};

const formatStatus = (s) => {
  if (!s) return '—';
  return s.split('_').map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(' ');
};

const formatAmount = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
};

const formatUser = (u) => {
  if (!u) return '—';
  return [u.name, u.lastname].filter(Boolean).join(' ') || u.email || '—';
};
</script>

<template>
  <div>
    <button class="btn btn-success btn-sm" @click="openModal">
      <Icon name="lucide:plus" />
      <span class="hidden md:block">Add Item</span>
    </button>
    <dialog id="new_apitem_modal" class="modal">
      <div class="modal-box h-screen max-h-none w-screen max-w-none rounded-none">
        <div class="flex justify-between">
          <h3 class="text-lg font-bold">Add Plan Item</h3>
          <button class="btn btn-ghost btn-circle" onclick="new_apitem_modal.close()">
            <Icon name="lucide:x" />
          </button>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="mt-3">
            <AnnualprocurementplansItemForm
              v-model="form"
              :errors="errors"
              :procurementmethods="store.procurementmethods"
              :procurementgroups="store.procurementgroups"
              :sourceoffunds="store.sourceoffunds"
              :unitofmeasures="store.unitofmeasures"
            />
          </div>
          <div class="modal-action">
            <button class="btn" type="button" onclick="new_apitem_modal.close()">Close</button>
            <button class="btn btn-primary" type="submit" :disabled="submitting">
              <span v-if="submitting">Saving...</span>
              <span v-else>Save</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
});

const store = useAnnualprocurementplanStore();
const form = ref(initial());
const errors = reactive({ description: '', quantity: '', unit_cost: '' });
const submitting = ref(false);

function initial() {
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

const openModal = async () => {
  await store.fetchItemLookups();
  document.getElementById('new_apitem_modal').showModal();
};

const handleSubmit = async () => {
  errors.description = '';
  errors.quantity = '';
  errors.unit_cost = '';
  try {
    submitting.value = true;
    const valid = await AnnualprocurementplanItemSchema.validate(form.value, { abortEarly: false });
    const ok = await store.addItem(props.planUuid, valid);
    if (ok) {
      form.value = initial();
      document.getElementById('new_apitem_modal').close();
    }
  } catch (err) {
    if (err?.inner?.length) {
      err.inner.forEach((e) => {
        if (e.path && Object.prototype.hasOwnProperty.call(errors, e.path)) errors[e.path] = e.message;
      });
    } else if (err?.path && Object.prototype.hasOwnProperty.call(errors, err.path)) {
      errors[err.path] = err.message;
    }
  } finally {
    submitting.value = false;
  }
};
</script>

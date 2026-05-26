<template>
  <div class="inline-flex">
    <button class="btn btn-success btn-sm" @click="openModal">
      <Icon name="lucide:upload" />
      Submit Payment Proof
    </button>

    <dialog id="submit_plan_payment_modal" class="modal">
      <div class="modal-box max-w-2xl">
        <div class="flex items-center justify-between border-b border-base-200 pb-2">
          <h3 class="text-lg font-bold">Submit RTGS Payment</h3>
          <button class="btn btn-ghost btn-circle" @click="closeModal">
            <Icon name="lucide:x" />
          </button>
        </div>

        <p class="mt-3 text-sm text-base-content/70">
          Once you've made the bank transfer, attach the proof of payment and confirm the transfer details below.
          We will mark the invoice as <span class="font-mono">AWAITING</span> and verify the payment against the bank import.
        </p>

        <form class="mt-4 space-y-3" @submit.prevent="submit">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Source bank (required)</legend>
              <input v-model="form.source_bank" type="text" class="input input-bordered input-sm w-full" placeholder="e.g. CBZ Bank" />
            </fieldset>
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Account name (required)</legend>
              <input v-model="form.account_name" type="text" class="input input-bordered input-sm w-full" placeholder="Account holder name" />
            </fieldset>
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Account number (required)</legend>
              <input v-model="form.account_number" type="text" class="input input-bordered input-sm w-full" placeholder="Source account number" />
            </fieldset>
            <fieldset class="fieldset">
              <legend class="fieldset-legend">Payment date (required)</legend>
              <input v-model="form.payment_date" type="date" class="input input-bordered input-sm w-full" />
            </fieldset>
            <fieldset class="fieldset sm:col-span-2">
              <legend class="fieldset-legend">Source reference (required)</legend>
              <input v-model="form.source_reference" type="text" class="input input-bordered input-sm w-full" placeholder="The reference / narration used on your transfer" />
            </fieldset>
            <fieldset class="fieldset sm:col-span-2">
              <legend class="fieldset-legend">Proof of payment (required, PDF or image)</legend>
              <div class="flex items-center gap-2">
                <label
                  :class="['btn btn-info btn-sm', uploading ? 'btn-disabled' : 'cursor-pointer']"
                >
                  <span v-if="uploading" class="loading loading-spinner loading-xs" />
                  <Icon v-else :name="form.proof_key ? 'lucide:refresh-ccw' : 'lucide:upload'" />
                  {{ form.proof_key ? 'Replace file' : 'Choose file' }}
                  <input type="file" class="hidden" :disabled="uploading" @change="onProofChange" />
                </label>
                <span v-if="form.file_name" class="text-xs text-base-content/70 truncate">
                  {{ form.file_name }}
                </span>
                <span v-else class="text-xs text-base-content/50">No file selected</span>
              </div>
            </fieldset>
          </div>

          <div v-if="error" class="alert alert-warning text-sm">
            <Icon name="lucide:alert-triangle" />
            <span>{{ error }}</span>
          </div>

          <div class="modal-action">
            <button type="button" class="btn" @click="closeModal">Cancel</button>
            <button type="submit" class="btn btn-success" :disabled="!canSubmit || submitting">
              <span v-if="submitting">Submitting...</span>
              <span v-else>
                <Icon name="lucide:send" />
                Submit
              </span>
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
const { uploadFile } = useDocmanUpload();

const initialForm = () => ({
  source_bank: '',
  account_name: '',
  account_number: '',
  payment_date: new Date().toISOString().slice(0, 10),
  source_reference: '',
  proof_key: '',
  file_name: '',
});

const form = ref(initialForm());
const uploading = ref(false);
const submitting = ref(false);
const error = ref('');

const canSubmit = computed(() =>
  form.value.source_bank.trim()
    && form.value.account_name.trim()
    && form.value.account_number.trim()
    && form.value.payment_date
    && form.value.source_reference.trim()
    && form.value.proof_key,
);

const openModal = () => {
  form.value = initialForm();
  error.value = '';
  document.getElementById('submit_plan_payment_modal').showModal();
};

const closeModal = () => document.getElementById('submit_plan_payment_modal').close();

const onProofChange = async (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  uploading.value = true;
  error.value = '';
  const result = await uploadFile(file, `plan-payment-proofs/${props.planUuid}`);
  uploading.value = false;
  if (!result.ok) {
    error.value = result.error || 'Failed to upload proof.';
    return;
  }
  form.value.proof_key = result.data.file_key;
  form.value.file_name = result.data.file_name;
};

const submit = async () => {
  if (!canSubmit.value) return;
  error.value = '';
  submitting.value = true;
  const ok = await store.submitInvoiceRtgs(props.planUuid, {
    source_bank: form.value.source_bank,
    account_name: form.value.account_name,
    account_number: form.value.account_number,
    payment_date: form.value.payment_date,
    source_reference: form.value.source_reference,
    proof_key: form.value.proof_key,
  });
  submitting.value = false;
  if (ok) closeModal();
};
</script>

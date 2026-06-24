<template>
  <dialog ref="dialogEl" class="modal">
    <div class="modal-box max-w-2xl">
      <h3 class="text-lg font-bold">{{ title }}</h3>
      <p v-if="maxQuantity != null" class="mt-1 text-xs text-base-content/60">
        Maximum quantity for this product: {{ maxQuantity }}
        <span v-if="remainingQuantity != null"> · Remaining on line item: {{ remainingQuantity }}</span>
      </p>

      <div v-if="formError" class="alert alert-error mt-3 py-2 text-sm">{{ formError }}</div>

      <form class="mt-4 space-y-4" @submit.prevent="submit">
        <label class="form-control w-full">
          <span class="label-text text-xs font-medium">Description</span>
          <textarea
            v-model="form.description"
            class="textarea textarea-bordered w-full"
            rows="2"
            :disabled="submitting"
          />
        </label>

        <label class="form-control w-full max-w-xs">
          <span class="label-text text-xs font-medium">Quantity</span>
          <input
            v-model.number="form.quantity"
            type="number"
            min="0.01"
            step="0.01"
            class="input input-bordered w-full"
            :disabled="submitting"
          />
        </label>

        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold">Specifications</span>
            <button type="button" class="btn btn-ghost btn-xs" :disabled="submitting" @click="addSpecRow">
              <Icon name="lucide:plus" class="h-3.5 w-3.5" />
              Add specification
            </button>
          </div>

          <div v-if="form.specifications.length === 0" class="text-xs text-base-content/50">
            No specifications yet. Add criteria such as dimensions, brand, or technical requirements.
          </div>

          <div
            v-for="(spec, idx) in form.specifications"
            :key="idx"
            class="grid grid-cols-1 gap-2 rounded-lg border border-base-200 p-3 sm:grid-cols-[1fr_1fr_auto]"
          >
            <input
              v-model="spec.label"
              type="text"
              class="input input-bordered input-sm w-full"
              placeholder="Label (e.g. Colour)"
              :disabled="submitting"
            />
            <input
              v-model="spec.value"
              type="text"
              class="input input-bordered input-sm w-full"
              placeholder="Value"
              :disabled="submitting"
            />
            <button
              type="button"
              class="btn btn-ghost btn-sm text-error"
              :disabled="submitting"
              @click="removeSpecRow(idx)"
            >
              <Icon name="lucide:trash-2" class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="modal-action">
          <button type="button" class="btn" :disabled="submitting" @click="close">Cancel</button>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            <span v-if="submitting" class="loading loading-spinner loading-sm" />
            <span v-else>{{ submitLabel }}</span>
          </button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop"><button type="button" @click="close">close</button></form>
  </dialog>
</template>

<script setup>
const props = defineProps({
  title: { type: String, default: 'Product or service' },
  submitLabel: { type: String, default: 'Save' },
  maxQuantity: { type: Number, default: null },
  remainingQuantity: { type: Number, default: null },
  initial: {
    type: Object,
    default: () => ({
      description: '',
      quantity: 1,
      specifications: [],
    }),
  },
})

const emit = defineEmits(['submit', 'close'])

const dialogEl = ref(null)
const submitting = ref(false)
const formError = ref('')

const form = reactive({
  description: '',
  quantity: 1,
  specifications: [],
})

function applyInitial() {
  form.description = props.initial?.description ?? ''
  form.quantity = Number(props.initial?.quantity ?? 1)
  form.specifications = (props.initial?.specifications ?? []).map(s => ({
    label: s.label ?? '',
    value: s.value ?? '',
    sort_order: s.sort_order ?? 0,
  }))
  formError.value = ''
}

function addSpecRow() {
  form.specifications.push({ label: '', value: '', sort_order: form.specifications.length })
}

function removeSpecRow(idx) {
  form.specifications.splice(idx, 1)
}

function open() {
  applyInitial()
  if (form.specifications.length === 0) addSpecRow()
  dialogEl.value?.showModal?.()
}

function close() {
  dialogEl.value?.close?.()
  emit('close')
}

function setSubmitting(val) {
  submitting.value = val
}

function setError(msg) {
  formError.value = msg ?? ''
}

function submit() {
  formError.value = ''
  if (!form.description?.trim()) {
    formError.value = 'Description is required.'
    return
  }
  if (Number(form.quantity) <= 0) {
    formError.value = 'Quantity must be greater than zero.'
    return
  }
  if (props.remainingQuantity != null && Number(form.quantity) > props.remainingQuantity) {
    formError.value = `Quantity cannot exceed remaining allocatable quantity (${props.remainingQuantity}).`
    return
  }
  emit('submit', {
    description: form.description.trim(),
    quantity: form.quantity,
    specifications: form.specifications
      .filter(s => s.label?.trim())
      .map((s, i) => ({
        label: s.label.trim(),
        value: (s.value ?? '').trim(),
        sort_order: i,
      })),
  })
}

defineExpose({ open, close, setSubmitting, setError })
</script>

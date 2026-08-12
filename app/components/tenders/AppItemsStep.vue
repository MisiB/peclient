<template>
  <div class="w-full space-y-4">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-lg font-semibold">Line items & breakdown</h2>
        <p class="text-sm text-base-content/60">
          Each procurement line item is shown in its own card. Break items down into products or services and add specifications.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button class="btn btn-ghost btn-sm" type="button" @click="emit('back')">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          Back
        </button>
        <button
          class="btn btn-success btn-sm"
          type="button"
          :disabled="!canAddMore || loading"
          @click="openAdd"
        >
          <Icon name="lucide:plus" class="h-4 w-4" />
          Add line item
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-error border border-error/30 bg-error/10">
      <Icon name="lucide:alert-triangle" class="h-5 w-5 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <div v-if="loading" class="card w-full border border-base-200 bg-base-100 shadow-sm">
      <div class="card-body flex items-center justify-center gap-2 p-10 text-base-content/50">
        <span class="loading loading-spinner loading-md" />
        <span class="text-sm">Loading line items…</span>
      </div>
    </div>

    <div
      v-else-if="requestItems.length === 0"
      class="card w-full border border-dashed border-base-200 bg-base-100/50 shadow-sm"
    >
      <div class="card-body p-10 text-center text-base-content/50">
        <Icon name="lucide:inbox" class="mx-auto mb-2 h-10 w-10" />
        <p class="text-sm">No line items yet. Click <strong>Add line item</strong> to begin.</p>
      </div>
    </div>

    <div v-else class="space-y-4">
      <TendersRequestItemCard
        v-for="row in requestItems"
        :key="row.id"
        :tender-uuid="tenderUuid"
        :item="row"
        @edit-item="openEdit"
        @delete-item="confirmDelete"
        @delete-product="confirmDeleteProduct"
        @refresh="loadAll"
      />
    </div>

    <TendersFeesPanel v-if="tenderUuid && requestItems.length" ref="feesPanel" :tender-uuid="tenderUuid" />

    <div class="flex justify-end border-t border-base-200 pt-4">
      <button
        class="btn btn-primary w-full sm:w-auto"
        type="button"
        :disabled="loading"
        @click="emit('saved')"
      >
        Save & continue
        <Icon name="lucide:arrow-right" class="h-4 w-4" />
      </button>
    </div>

    <TendersItemAddDialog
      ref="addDialog"
      :has-valid-app="hasValidApp"
      :tender-uuid="tenderUuid"
      @select-app="onAppItemPicked"
      @select-app-bulk="onAppItemsBulkPicked"
      @manual="onManualAdd"
    />

    <TendersItemFormModal
      ref="formModal"
      :title="formModalTitle"
      :submit-label="formModalSubmitLabel"
      :app-ref="formAppRef"
      :consumption-mode="formConsumptionMode"
      :description-readonly="formDescriptionReadonly"
      :quantity-readonly="formQuantityReadonly"
      :unit-price-readonly="formUnitPriceReadonly"
      :max-quantity="formMaxQuantity"
      :initial="formInitial"
      @submit="onFormSubmit"
    />

    <dialog ref="deleteDialog" class="modal">
      <div class="modal-box">
        <h3 class="text-lg font-bold">Delete line item?</h3>
        <p class="py-2 text-sm">Remove this line item and all its products from the tender?</p>
        <div class="modal-action">
          <button type="button" class="btn" @click="closeDeleteDialog">Cancel</button>
          <button type="button" class="btn btn-error" :disabled="deleting" @click="doDelete">
            <span v-if="deleting" class="loading loading-spinner loading-sm" />
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button type="button" @click="closeDeleteDialog">close</button></form>
    </dialog>

    <dialog ref="deleteProductDialog" class="modal">
      <div class="modal-box">
        <h3 class="text-lg font-bold">Delete product?</h3>
        <p class="py-2 text-sm">Remove <strong>{{ pendingDeleteProduct?.product?.description }}</strong>?</p>
        <div class="modal-action">
          <button type="button" class="btn" @click="closeDeleteProductDialog">Cancel</button>
          <button type="button" class="btn btn-error" :disabled="deletingProduct" @click="doDeleteProduct">
            <span v-if="deletingProduct" class="loading loading-spinner loading-sm" />
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button type="button" @click="closeDeleteProductDialog">close</button></form>
    </dialog>
  </div>
</template>

<script setup>
const props = defineProps({
  tenderUuid: { type: String, default: '' },
})

const emit = defineEmits(['saved', 'back'])

const {
  getTender,
  getTenderItems,
  createTenderItem,
  createTenderItemsBulk,
  updateTenderItem,
  deleteTenderItem,
  deleteTenderItemProduct,
} = useTenderHelper()

const loading = ref(true)
const errorMessage = ref('')
const tender = ref(null)
const requestItems = ref([])
const feesPanel = ref(null)

const addDialog = ref(null)
const formModal = ref(null)

const formMode = ref('create')
const editingItem = ref(null)
const pendingAppItem = ref(null)

const formModalTitle = ref('Line item')
const formModalSubmitLabel = ref('Save')
const formAppRef = ref('')
const formConsumptionMode = ref('')
const formDescriptionReadonly = ref(false)
const formQuantityReadonly = ref(false)
const formUnitPriceReadonly = ref(false)
const formMaxQuantity = ref(null)
const formInitial = ref({ description: '', quantity: 0, unit_price: 0, total: 0 })

const deleteDialog = ref(null)
const pendingDelete = ref(null)
const deleting = ref(false)

const deleteProductDialog = ref(null)
const pendingDeleteProduct = ref(null)
const deletingProduct = ref(false)

const hasValidApp = computed(() =>
  Boolean(tender.value?.annualprocurementplan_id) && tender.value?.app_status === 'PLANNED',
)

const isSingleLot = computed(() =>
  String(tender.value?.item_selection_mode ?? '').toUpperCase() === 'SINGLE',
)

const canAddMore = computed(() => {
  if (!props.tenderUuid) return false
  if (isSingleLot.value && requestItems.value.length >= 1) return false
  return true
})

function buildInitialFromAppLine(planItem) {
  const qty = Number(planItem?.quantity ?? 0)
  const unit = Number(planItem?.unit_cost ?? 0)
  return {
    description: planItem?.description ?? '',
    quantity: qty,
    unit_price: unit,
    total: Number(planItem?.total_cost ?? 0) || Math.round(qty * unit * 100) / 100,
  }
}

function configureFormForApp(planItem) {
  const mode = String(planItem?.consumption_mode ?? '').toUpperCase()
  formAppRef.value = planItem?.reference_no ?? ''
  formConsumptionMode.value = mode
  formUnitPriceReadonly.value = true
  formMaxQuantity.value = mode === 'DRILL_DOWN' ? Number(planItem?.quantity ?? 0) : null

  if (mode === 'ONCE_OFF') {
    formDescriptionReadonly.value = true
    formQuantityReadonly.value = true
  } else if (mode === 'DRILL_DOWN') {
    formDescriptionReadonly.value = true
    formQuantityReadonly.value = false
  } else {
    formDescriptionReadonly.value = false
    formQuantityReadonly.value = false
  }

  formInitial.value = buildInitialFromAppLine(planItem)
  return formInitial.value
}

function configureFormForManual(initial = {}) {
  formAppRef.value = ''
  formConsumptionMode.value = ''
  formDescriptionReadonly.value = false
  formQuantityReadonly.value = false
  formUnitPriceReadonly.value = false
  formMaxQuantity.value = null
  formInitial.value = {
    description: initial.description ?? '',
    quantity: Number(initial.quantity ?? 0),
    unit_price: Number(initial.unit_price ?? 0),
    total: Number(initial.total ?? 0),
  }
}

async function loadAll() {
  if (!props.tenderUuid) return
  loading.value = true
  errorMessage.value = ''
  try {
    const [tenderRes, itemsRes] = await Promise.all([
      getTender(props.tenderUuid),
      getTenderItems(props.tenderUuid),
    ])
    if (tenderRes.error.value) {
      errorMessage.value = 'Failed to load tender.'
      return
    }
    if (itemsRes.error.value) {
      errorMessage.value = 'Failed to load tender line items.'
      return
    }
    tender.value = tenderRes.data.value?.data ?? null
    requestItems.value = itemsRes.data.value?.data ?? []
    nextTick(() => feesPanel.value?.reload?.())
  } finally {
    loading.value = false
  }
}

function openAdd() {
  if (!canAddMore.value) return
  if (hasValidApp.value) {
    addDialog.value?.open?.()
  } else {
    onManualAdd()
  }
}

function onAppItemPicked(planItem) {
  addDialog.value?.close?.()
  pendingAppItem.value = planItem
  formMode.value = 'create'
  formModalTitle.value = 'Add APP line item'
  formModalSubmitLabel.value = 'Add item'
  const initial = configureFormForApp(planItem)
  nextTick(() => formModal.value?.open?.(initial))
}

async function onAppItemsBulkPicked(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return
  addDialog.value?.close?.()
  loading.value = true
  errorMessage.value = ''
  try {
    const { status, error } = await createTenderItemsBulk(props.tenderUuid, ids)
    if (!status.value) {
      const msg = error.value?.data?.message
        ?? (error.value?.data?.errors
          ? Object.values(error.value.data.errors).flat().join(' ')
          : 'Failed to add selected items.')
      errorMessage.value = msg
      return
    }
    await loadAll()
  } finally {
    loading.value = false
  }
}

function onManualAdd() {
  addDialog.value?.close?.()
  pendingAppItem.value = null
  formMode.value = 'create'
  formModalTitle.value = 'Add line item (manual)'
  formModalSubmitLabel.value = 'Add item'
  configureFormForManual()
  formModal.value?.open?.()
}

function openEdit(row) {
  editingItem.value = row
  formMode.value = 'edit'
  formModalTitle.value = 'Edit line item'
  formModalSubmitLabel.value = 'Save changes'
  pendingAppItem.value = row.annualprocurementplanitem ?? null
  const initial = configureFormForEdit(row)
  nextTick(() => formModal.value?.open?.(initial))
}

function configureFormForEdit(row) {
  const planItem = row.annualprocurementplanitem
  if (row.annualprocurementplanitem_id && planItem) {
    configureFormForApp(planItem)
    formInitial.value = {
      description: row.description,
      quantity: Number(row.quantity),
      unit_price: Number(row.unit_price),
      total: Number(row.total),
    }
    const mode = String(planItem?.consumption_mode ?? '').toUpperCase()
    if (mode === 'ONCE_OFF') {
      formDescriptionReadonly.value = true
      formQuantityReadonly.value = true
    }
    return formInitial.value
  }
  configureFormForManual(row)
  return formInitial.value
}

async function onFormSubmit(payload) {
  formModal.value?.setSubmitting?.(true)
  formModal.value?.setError?.('')

  const body = { ...payload }
  if (formMode.value === 'create' && pendingAppItem.value?.id) {
    body.annualprocurementplanitem_id = pendingAppItem.value.id
  }

  try {
    if (formMode.value === 'edit' && editingItem.value?.id) {
      const { status, error } = await updateTenderItem(props.tenderUuid, editingItem.value.id, body)
      if (!status.value) {
        formModal.value?.setError?.(error.value?.data?.message ?? 'Failed to update item.')
        return
      }
    } else {
      const { status, error } = await createTenderItem(props.tenderUuid, body)
      if (!status.value) {
        const msg = error.value?.data?.message
          ?? (error.value?.data?.errors
            ? Object.values(error.value.data.errors).flat().join(' ')
            : 'Failed to add item.')
        formModal.value?.setError?.(msg)
        return
      }
    }
    formModal.value?.close?.()
    await loadAll()
  } finally {
    formModal.value?.setSubmitting?.(false)
  }
}

function confirmDelete(row) {
  pendingDelete.value = row
  deleteDialog.value?.showModal?.()
}

function closeDeleteDialog() {
  pendingDelete.value = null
  deleteDialog.value?.close?.()
}

async function doDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    const { status } = await deleteTenderItem(props.tenderUuid, pendingDelete.value.id)
    if (!status.value) {
      errorMessage.value = 'Failed to delete item.'
      return
    }
    closeDeleteDialog()
    await loadAll()
  } finally {
    deleting.value = false
  }
}

function confirmDeleteProduct({ item, product }) {
  pendingDeleteProduct.value = { item, product }
  deleteProductDialog.value?.showModal?.()
}

function closeDeleteProductDialog() {
  pendingDeleteProduct.value = null
  deleteProductDialog.value?.close?.()
}

async function doDeleteProduct() {
  if (!pendingDeleteProduct.value) return
  deletingProduct.value = true
  const { item, product } = pendingDeleteProduct.value
  try {
    const { status } = await deleteTenderItemProduct(props.tenderUuid, item.id, product.id)
    if (!status.value) {
      errorMessage.value = 'Failed to delete product.'
      return
    }
    closeDeleteProductDialog()
    await loadAll()
  } finally {
    deletingProduct.value = false
  }
}

onMounted(() => loadAll())
</script>

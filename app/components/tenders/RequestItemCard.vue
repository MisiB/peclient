<template>
  <div class="card w-full border border-base-200 bg-base-100 shadow-sm">
    <div class="card-body gap-4 p-4 sm:p-5">
      <div class="flex flex-col gap-3 border-b border-base-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="badge badge-sm" :class="item.annualprocurementplanitem_id ? 'badge-ghost' : 'badge-neutral'">
              {{ item.annualprocurementplanitem_id ? 'APP line' : 'Manual line' }}
            </span>
            <span v-if="item.annualprocurementplanitem?.reference_no" class="font-mono text-xs text-base-content/60">
              {{ item.annualprocurementplanitem.reference_no }}
            </span>
          </div>
          <h3 class="mt-2 text-base font-semibold">{{ item.description }}</h3>
          <div class="mt-2 flex flex-wrap gap-4 text-sm text-base-content/70">
            <span>Qty: <strong class="font-mono">{{ item.quantity }}</strong></span>
            <span>Unit: <strong class="font-mono">{{ formatMoney(item.unit_price) }}</strong></span>
            <span>Total: <strong class="font-mono">{{ formatMoney(item.total) }}</strong></span>
          </div>
        </div>
        <div class="flex shrink-0 gap-1">
          <button type="button" class="btn btn-ghost btn-sm" title="Edit line item" @click="emit('edit-item', item)">
            <Icon name="lucide:pencil" class="h-4 w-4" />
          </button>
          <button type="button" class="btn btn-ghost btn-sm text-error" title="Delete line item" @click="emit('delete-item', item)">
            <Icon name="lucide:trash-2" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 class="text-sm font-semibold">Products & services</h4>
            <p class="text-xs text-base-content/60">
              Allocated {{ allocatedQty }} / {{ item.quantity }}
              <span v-if="remainingQty > 0" class="text-warning"> · {{ remainingQty }} remaining</span>
              <span v-else-if="remainingQty === 0" class="text-success"> · fully allocated</span>
            </p>
          </div>
          <button
            type="button"
            class="btn btn-outline btn-sm"
            :disabled="remainingQty <= 0"
            @click="openAddProduct"
          >
            <Icon name="lucide:plus" class="h-4 w-4" />
            Add product / service
          </button>
        </div>

        <div v-if="!products.length" class="mt-4 rounded-lg border border-dashed border-base-200 p-6 text-center text-sm text-base-content/50">
          Break this line item into the actual products or services to be procured.
        </div>

        <div v-else class="mt-4 space-y-3">
          <div
            v-for="product in products"
            :key="product.id"
            class="rounded-lg border border-base-200 bg-base-200/20 p-4"
          >
            <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0 flex-1">
                <p class="font-medium">{{ product.description }}</p>
                <p class="mt-1 text-xs text-base-content/60">
                  Quantity: <span class="font-mono">{{ product.quantity }}</span>
                </p>
              </div>
              <div class="flex gap-1">
                <button type="button" class="btn btn-ghost btn-xs" @click="openEditProduct(product)">
                  <Icon name="lucide:pencil" class="h-3.5 w-3.5" />
                </button>
                <button type="button" class="btn btn-ghost btn-xs text-error" @click="emit('delete-product', { item, product })">
                  <Icon name="lucide:trash-2" class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div v-if="product.specifications?.length" class="mt-3 overflow-x-auto">
              <table class="table table-xs w-full">
                <thead>
                  <tr class="text-base-content/60">
                    <th>Specification</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="spec in product.specifications" :key="spec.id">
                    <td class="font-medium">{{ spec.label }}</td>
                    <td>{{ spec.value || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-else class="mt-2 text-xs text-base-content/40">No specifications defined.</p>
          </div>
        </div>
      </div>
    </div>

    <TendersProductFormModal
      ref="productModal"
      :title="productModalTitle"
      :submit-label="productModalSubmitLabel"
      :remaining-quantity="productRemainingQty"
      :tender-uuid="tenderUuid"
      :item-id="item?.id"
      :initial="productInitial"
      @submit="onProductSubmit"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  tenderUuid: { type: String, required: true },
  item: { type: Object, required: true },
})

const emit = defineEmits(['edit-item', 'delete-item', 'delete-product', 'refresh'])

const {
  createTenderItemProduct,
  updateTenderItemProduct,
} = useTenderHelper()

const productModal = ref(null)
const productMode = ref('create')
const editingProduct = ref(null)

const productModalTitle = ref('Add product / service')
const productModalSubmitLabel = ref('Add')
const productRemainingQty = ref(null)
const productInitial = ref({ description: '', quantity: 1, specifications: [] })

const products = computed(() => props.item?.products ?? [])

const allocatedQty = computed(() =>
  products.value.reduce((sum, p) => sum + Number(p.quantity ?? 0), 0),
)

const remainingQty = computed(() =>
  Math.max(0, Number(props.item?.quantity ?? 0) - allocatedQty.value),
)

function formatMoney(value) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-ZW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function openAddProduct() {
  productMode.value = 'create'
  editingProduct.value = null
  productModalTitle.value = 'Add product / service'
  productModalSubmitLabel.value = 'Add'
  productRemainingQty.value = remainingQty.value
  productInitial.value = { description: '', quantity: Math.min(1, remainingQty.value) || 1, specifications: [] }
  productModal.value?.open?.()
}

function openEditProduct(product) {
  productMode.value = 'edit'
  editingProduct.value = product
  productModalTitle.value = 'Edit product / service'
  productModalSubmitLabel.value = 'Save'
  const others = allocatedQty.value - Number(product.quantity ?? 0)
  productRemainingQty.value = Math.max(0, Number(props.item.quantity) - others)
  productInitial.value = {
    description: product.description,
    quantity: Number(product.quantity),
    specifications: (product.specifications ?? []).map(s => ({
      label: s.label,
      value: s.value,
      sort_order: s.sort_order,
    })),
  }
  productModal.value?.open?.()
}

async function onProductSubmit(payload) {
  productModal.value?.setSubmitting?.(true)
  productModal.value?.setError?.('')

  try {
    if (productMode.value === 'edit' && editingProduct.value?.id) {
      const { status, error } = await updateTenderItemProduct(
        props.tenderUuid,
        props.item.id,
        editingProduct.value.id,
        payload,
      )
      if (!status.value) {
        productModal.value?.setError?.(parseError(error))
        return
      }
    } else {
      const { status, error } = await createTenderItemProduct(
        props.tenderUuid,
        props.item.id,
        payload,
      )
      if (!status.value) {
        productModal.value?.setError?.(parseError(error))
        return
      }
    }
    productModal.value?.close?.()
    emit('refresh')
  } finally {
    productModal.value?.setSubmitting?.(false)
  }
}

function parseError(error) {
  return error.value?.data?.message
    ?? (error.value?.data?.errors
      ? Object.values(error.value.data.errors).flat().join(' ')
      : 'Request failed.')
}
</script>

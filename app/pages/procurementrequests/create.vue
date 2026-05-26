<template>
  <div class="p-6">
    <div class="card outline card-xs outline-1 outline-base-200">
      <div class="card-body">
        <div class="breadcrumbs text-sm">
          <ul>
            <li><NuxtLink to="/dashboard">Home</NuxtLink></li>
            <li><NuxtLink to="/procurementrequests">Procurement Requests</NuxtLink></li>
            <li>New</li>
          </ul>
        </div>
      </div>
    </div>

    <form class="mt-4 space-y-4" @submit.prevent="onSubmit">
      <!-- ─── Basics ───────────────────────────────────────────────────── -->
      <div class="card bg-base-100 outline outline-1 outline-base-200">
        <div class="card-body">
          <h2 class="text-base font-semibold">Basics</h2>
          <div class="grid gap-3 md:grid-cols-2">
            <label class="fieldset">
              <span class="fieldset-legend">PR number <span class="text-xs opacity-60">(leave blank to auto-generate)</span></span>
              <input v-model="form.pr_number" type="text" class="input input-bordered" placeholder="PR-26-00001" />
            </label>
            <label class="fieldset">
              <span class="fieldset-legend">Project name</span>
              <input v-model="form.projectname" type="text" required class="input input-bordered" />
            </label>
            <label class="fieldset">
              <span class="fieldset-legend">Request create date</span>
              <input v-model="form.request_create_date" type="date" class="input input-bordered" />
            </label>
            <label class="fieldset">
              <span class="fieldset-legend">User requisition date</span>
              <input v-model="form.user_requisition_date" type="date" required class="input input-bordered" />
            </label>
            <label class="fieldset md:col-span-2">
              <span class="fieldset-legend">Location</span>
              <input v-model="form.location" type="text" class="input input-bordered" placeholder="Where the goods/services are needed" />
            </label>
            <label class="fieldset">
              <span class="fieldset-legend">Plan year</span>
              <input v-model.number="form.plan_year" type="number" min="2020" max="2100" class="input input-bordered" />
            </label>
          </div>
        </div>
      </div>

      <!-- ─── Procurement classification ────────────────────────────────── -->
      <div class="card bg-base-100 outline outline-1 outline-base-200">
        <div class="card-body">
          <h2 class="text-base font-semibold">Procurement classification</h2>
          <div class="grid gap-3 md:grid-cols-3">
            <label class="fieldset">
              <span class="fieldset-legend">Procurement class</span>
              <select v-model.number="form.procurementclass_id" class="select select-bordered">
                <option :value="null">— Pick —</option>
                <option v-for="c in lookups.classes" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </label>
            <label class="fieldset">
              <span class="fieldset-legend">Procurement group</span>
              <select v-model.number="form.procurementgroup_id" required class="select select-bordered">
                <option :value="null">— Pick —</option>
                <option v-for="g in lookups.groups" :key="g.id" :value="g.id">{{ g.name }}</option>
              </select>
            </label>
            <label class="fieldset">
              <span class="fieldset-legend">Procurement method</span>
              <select v-model.number="form.procurementmethod_id" required class="select select-bordered">
                <option :value="null">— Pick —</option>
                <option v-for="m in lookups.methods" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
            </label>
            <label class="fieldset md:col-span-3">
              <span class="fieldset-legend">Evaluation criterion</span>
              <select v-model.number="form.evaluationcriterion_id" class="select select-bordered">
                <option :value="null">— Pick —</option>
                <option v-for="ec in lookups.criteria" :key="ec.id" :value="ec.id">{{ ec.name }}</option>
              </select>
              <span class="text-xs opacity-60">LCS / QCBS / QBS etc. — linked to procurement groups.</span>
            </label>
          </div>
        </div>
      </div>

      <!-- ─── Modes + rules ─────────────────────────────────────────────── -->
      <div class="card bg-base-100 outline outline-1 outline-base-200">
        <div class="card-body">
          <h2 class="text-base font-semibold">Item selection &amp; bidder response</h2>
          <div class="grid gap-3 md:grid-cols-3">
            <label class="fieldset">
              <span class="fieldset-legend">Item selection mode</span>
              <select v-model="form.item_selection_mode" required class="select select-bordered">
                <option value="SINGLE">SINGLE — one APP item</option>
                <option value="MULTIPLE">MULTIPLE — several APP items</option>
              </select>
            </label>
            <label class="fieldset">
              <span class="fieldset-legend">Response mode</span>
              <select v-model="form.response_mode" required class="select select-bordered">
                <option value="SINGLE">SINGLE — bidder picks one</option>
                <option value="MULTIPLE">MULTIPLE — bidder quotes many</option>
              </select>
            </label>
            <label v-if="form.response_mode === 'MULTIPLE'" class="fieldset">
              <span class="fieldset-legend">Multi-item rule</span>
              <select v-model="form.multi_item_rule" class="select select-bordered">
                <option value="ALL">ALL items required</option>
                <option value="SELECTED">SELECTED items only</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <!-- ─── Line items ────────────────────────────────────────────────── -->
      <div class="card bg-base-100 outline outline-1 outline-base-200">
        <div class="card-body">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-base font-semibold">Line items</h2>
              <p class="text-xs opacity-60">
                Add one row per APP line item. For now items are entered manually — leave APP item ID
                blank to mark as unplanned.
              </p>
            </div>
            <button type="button" class="btn btn-success btn-sm" @click="addItem">
              <Icon name="lucide:plus" /> Add item
            </button>
          </div>

          <div v-for="(item, idx) in form.items" :key="idx" class="mt-4 rounded-lg border border-base-200 p-3">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-semibold uppercase opacity-60">Item #{{ idx + 1 }}</span>
              <button type="button" class="btn btn-ghost btn-xs text-error" @click="removeItem(idx)">
                <Icon name="lucide:trash-2" /> Remove
              </button>
            </div>

            <div class="mt-2 grid gap-3 md:grid-cols-3">
              <label class="fieldset">
                <span class="fieldset-legend">APP line item ID <span class="text-xs opacity-50">(optional)</span></span>
                <input v-model.number="item.annualprocurementplanitem_id" type="number" class="input input-bordered" />
              </label>
              <label class="fieldset">
                <span class="fieldset-legend">Consumption quantity</span>
                <input v-model.number="item.consumption_quantity" type="number" step="0.01" class="input input-bordered" />
              </label>
              <label class="fieldset">
                <span class="fieldset-legend">Estimated value</span>
                <input v-model.number="item.estimated_value" type="number" step="0.01" class="input input-bordered" />
              </label>
            </div>

            <div class="mt-3">
              <span class="text-xs font-semibold opacity-70">Preferred supplier categories</span>
              <div class="mt-1 flex flex-wrap gap-2">
                <label v-for="sc in lookups.supplierCategories" :key="sc.id" class="label cursor-pointer gap-1">
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    :value="sc.id"
                    :checked="item.suppliercategory_ids.includes(sc.id)"
                    @change="toggleSupplierCategory(item, sc.id, $event.target.checked)"
                  />
                  <span class="text-xs">{{ sc.name }}</span>
                </label>
              </div>
            </div>

            <div class="mt-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold opacity-70">Deliverables</span>
                <button type="button" class="btn btn-ghost btn-xs" @click="addDeliverable(item)">
                  <Icon name="lucide:plus" /> Add deliverable
                </button>
              </div>
              <div v-for="(d, di) in item.deliverables" :key="di" class="mt-2 grid gap-2 md:grid-cols-12">
                <label class="fieldset md:col-span-5">
                  <span class="fieldset-legend">Description</span>
                  <input v-model="d.description" type="text" required class="input input-bordered input-sm" />
                </label>
                <label class="fieldset md:col-span-2">
                  <span class="fieldset-legend">Qty</span>
                  <input v-model.number="d.quantity" type="number" step="0.01" class="input input-bordered input-sm" />
                </label>
                <label class="fieldset md:col-span-2">
                  <span class="fieldset-legend">UoM</span>
                  <select v-model.number="d.unitofmeasure_id" class="select select-bordered select-sm">
                    <option :value="null">—</option>
                    <option v-for="u in lookups.uoms" :key="u.id" :value="u.id">{{ u.abbreviation ?? u.name }}</option>
                  </select>
                </label>
                <label class="fieldset md:col-span-2">
                  <span class="fieldset-legend">Estimated</span>
                  <input v-model.number="d.estimated_value" type="number" step="0.01" class="input input-bordered input-sm" />
                </label>
                <div class="md:col-span-1 flex items-end">
                  <button type="button" class="btn btn-ghost btn-xs text-error" @click="removeDeliverable(item, di)">
                    <Icon name="lucide:x" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!form.items.length" class="mt-4 rounded-lg border border-dashed border-base-300 p-6 text-center text-sm opacity-60">
            No items yet. Click "Add item" to start.
          </div>
        </div>
      </div>

      <!-- ─── Bid security ──────────────────────────────────────────────── -->
      <div class="card bg-base-100 outline outline-1 outline-base-200">
        <div class="card-body">
          <h2 class="text-base font-semibold">Bid security</h2>
          <p class="text-xs opacity-60">Choose one (or neither). Bid security can only be required when the procurement method allows it.</p>
          <div class="mt-3 grid gap-3 md:grid-cols-3">
            <label class="label cursor-pointer">
              <input v-model="form.bid_security_required" type="checkbox" class="checkbox" @change="onBidSecurityToggle" />
              <span>Require bid security</span>
            </label>
            <label v-if="form.bid_security_required" class="fieldset md:col-span-2">
              <span class="fieldset-legend">Validity (days)</span>
              <input v-model.number="form.bid_security_validity_days" type="number" min="1" max="365" class="input input-bordered" />
            </label>
            <label class="label cursor-pointer">
              <input v-model="form.bid_submission_sheet_required" type="checkbox" class="checkbox" @change="onSheetToggle" />
              <span>Require bid submission sheet</span>
            </label>
          </div>
        </div>
      </div>

      <!-- ─── Submit ───────────────────────────────────────────────────── -->
      <div class="flex items-center justify-end gap-2">
        <NuxtLink to="/procurementrequests" class="btn">Cancel</NuxtLink>
        <button type="submit" class="btn btn-primary" :disabled="submitting">
          <span v-if="submitting" class="loading loading-spinner loading-xs"></span>
          Save draft
        </button>
      </div>

      <div v-if="errorMessage" role="alert" class="alert alert-error">
        <Icon name="lucide:alert-circle" />
        <span>{{ errorMessage }}</span>
      </div>
    </form>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'default', sanctum: { authOnly: true } });
useHead({ title: 'New Procurement Request' });

const router = useRouter();
const {
  create,
  listProcurementClasses, listProcurementGroups, listProcurementMethods,
  listEvaluationCriteria, listUnitOfMeasures, listSupplierCategories,
} = useProcurementrequestHelper();

const today = new Date().toISOString().slice(0, 10);
const form = ref({
  pr_number: '',
  request_create_date: today,
  user_requisition_date: today,
  projectname: '',
  location: '',
  plan_year: new Date().getFullYear(),
  procurementclass_id: null,
  procurementgroup_id: null,
  procurementmethod_id: null,
  evaluationcriterion_id: null,
  item_selection_mode: 'MULTIPLE',
  response_mode: 'MULTIPLE',
  multi_item_rule: 'SELECTED',
  bid_security_required: false,
  bid_security_validity_days: 90,
  bid_submission_sheet_required: false,
  items: [],
});

const lookups = ref({
  classes: [],
  groups: [],
  methods: [],
  criteria: [],
  uoms: [],
  supplierCategories: [],
});

const submitting = ref(false);
const errorMessage = ref('');

onMounted(async () => {
  const [c, g, m, ec, u, sc] = await Promise.all([
    listProcurementClasses(),
    listProcurementGroups(),
    listProcurementMethods(),
    listEvaluationCriteria(),
    listUnitOfMeasures(),
    listSupplierCategories(),
  ]);
  lookups.value.classes = c.data.value?.data ?? c.data.value ?? [];
  lookups.value.groups = g.data.value?.data ?? g.data.value ?? [];
  lookups.value.methods = m.data.value?.data ?? m.data.value ?? [];
  lookups.value.criteria = ec.data.value?.data ?? ec.data.value ?? [];
  lookups.value.uoms = u.data.value?.data ?? u.data.value ?? [];
  lookups.value.supplierCategories = sc.data.value?.data ?? sc.data.value ?? [];
});

const addItem = () => {
  form.value.items.push({
    annualprocurementplanitem_id: null,
    consumption_quantity: null,
    estimated_value: null,
    suppliercategory_ids: [],
    deliverables: [],
  });
};

const removeItem = (idx) => form.value.items.splice(idx, 1);

const toggleSupplierCategory = (item, id, checked) => {
  if (checked) {
    if (!item.suppliercategory_ids.includes(id)) item.suppliercategory_ids.push(id);
  } else {
    item.suppliercategory_ids = item.suppliercategory_ids.filter((x) => x !== id);
  }
};

const addDeliverable = (item) => {
  item.deliverables.push({
    description: '',
    quantity: 1,
    unitofmeasure_id: null,
    estimated_value: null,
  });
};
const removeDeliverable = (item, idx) => item.deliverables.splice(idx, 1);

const onBidSecurityToggle = () => {
  if (form.value.bid_security_required) form.value.bid_submission_sheet_required = false;
};
const onSheetToggle = () => {
  if (form.value.bid_submission_sheet_required) form.value.bid_security_required = false;
};

const onSubmit = async () => {
  errorMessage.value = '';
  if (!form.value.items.length) {
    errorMessage.value = 'Add at least one line item.';
    return;
  }
  submitting.value = true;
  const payload = JSON.parse(JSON.stringify(form.value));
  if (payload.pr_number === '') delete payload.pr_number;
  const { status, data, error } = await create(payload);
  submitting.value = false;
  if (status?.value) {
    const uuid = data.value?.data?.uuid;
    router.push(uuid ? `/procurementrequests/${uuid}` : '/procurementrequests');
  } else {
    errorMessage.value = error?.value?.data?.message
      || Object.values(error?.value?.data?.errors ?? {}).flat()[0]
      || 'Failed to save draft.';
  }
};
</script>

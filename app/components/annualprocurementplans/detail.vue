<template>
  <div class="mt-3 space-y-3">
    <!-- Header -->
    <div class="card border border-base-200">
      <div class="card-body">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-2xl font-bold">
              {{ plan?.year ?? '...' }}
              <span class="text-base-content/60 font-normal">·</span>
              {{ plan?.company?.name ?? '' }}
            </h2>
            <div class="mt-2 space-y-1 text-sm">
              <div class="flex items-center gap-2">
                <span class="w-20 text-xs uppercase tracking-wide text-base-content/60">Approval</span>
                <span :class="['badge', statusBadge(plan?.status)]">{{ formatStatus(plan?.status) }}</span>
              </div>
              <div v-if="plan?.paymentstatus" class="flex items-center gap-2">
                <span class="w-20 text-xs uppercase tracking-wide text-base-content/60">Payment</span>
                <span :class="['badge', paymentStatusBadge(plan?.paymentstatus)]">
                  {{ formatPaymentStatus(plan?.paymentstatus) }}
                </span>
              </div>
              <div v-if="plan?.currency" class="flex items-center gap-2">
                <span class="w-20 text-xs uppercase tracking-wide text-base-content/60">Currency</span>
                <span class="badge badge-outline">
                  {{ plan.currency.code }}<template v-if="plan.currency.symbol"> {{ plan.currency.symbol }}</template>
                </span>
              </div>
            </div>
            <div class="mt-2 text-sm text-base-content/60">
              Annual procurement plan · {{ totalItems }} item{{ totalItems === 1 ? '' : 's' }}
            </div>
            <div v-if="plan?.submitted_at" class="mt-1 text-xs text-base-content/60">
              Submitted by {{ plan.submitted_by_user?.name || plan.submittedBy?.name || '—' }}
              on {{ formatDateTime(plan.submitted_at) }}
            </div>
          </div>

          <div class="flex items-center gap-2">
            <AnnualprocurementplansAnalyzePlan :plan-uuid="planUuid" :can-edit="canEditPlan" />
            <AnnualprocurementplansWorkflowActions :plan-uuid="planUuid" />
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs + active tab content -->
    <div class="card border border-base-200">
      <div class="card-body">
        <div role="tablist" class="tabs tabs-border">
          <button
            role="tab"
            class="tab"
            :class="{ 'tab-active': activeTab === 'items' }"
            @click="activeTab = 'items'"
          >
            <Icon name="lucide:list" class="mr-1" />
            Plan Items
            <span class="badge badge-sm ml-2">{{ totalItems }}</span>
          </button>
          <button
            role="tab"
            class="tab"
            :class="{ 'tab-active': activeTab === 'issues' }"
            @click="activeTab = 'issues'"
          >
            <Icon name="lucide:alert-triangle" class="mr-1" />
            Issues
            <span :class="['badge badge-sm ml-2', unresolvedCount > 0 ? 'badge-warning' : '']">
              {{ unresolvedCount }}
            </span>
          </button>
          <button
            role="tab"
            class="tab"
            :class="{ 'tab-active': activeTab === 'disposal' }"
            @click="activeTab = 'disposal'"
          >
            <Icon name="lucide:trash-2" class="mr-1" />
            Disposal Plan
            <span class="badge badge-sm ml-2">{{ store.disposalPlansMeta.total }}</span>
          </button>
          <button
            role="tab"
            class="tab"
            :class="{ 'tab-active': activeTab === 'evaluation' }"
            @click="activeTab = 'evaluation'"
          >
            <Icon name="lucide:users" class="mr-1" />
            Evaluation Committee
            <span class="badge badge-sm ml-2">{{ store.committeeMembersMeta.total }}</span>
          </button>
          <button
            role="tab"
            class="tab"
            :class="{ 'tab-active': activeTab === 'disposalcommittee' }"
            @click="activeTab = 'disposalcommittee'"
          >
            <Icon name="lucide:users" class="mr-1" />
            Disposal Committee
            <span class="badge badge-sm ml-2">{{ store.disposalCommitteeMembersMeta.total }}</span>
          </button>
          <button
            role="tab"
            class="tab"
            :class="{ 'tab-active': activeTab === 'attachments' }"
            @click="activeTab = 'attachments'"
          >
            <Icon name="lucide:paperclip" class="mr-1" />
            Required Attachments
            <span class="badge badge-sm ml-2">{{ store.planDocuments.length }}</span>
          </button>
          <button
            role="tab"
            class="tab"
            :class="{ 'tab-active': activeTab === 'history' }"
            @click="activeTab = 'history'"
          >
            <Icon name="lucide:history" class="mr-1" />
            Workflow History
            <span class="badge badge-sm ml-2">{{ peTransitions.length }}</span>
          </button>
        </div>

        <!-- Plan Items -->
        <div v-if="activeTab === 'items'">
          <div class="mt-3 flex justify-end gap-2">
            <AnnualprocurementplansItemImport v-if="canAdd && canEditPlan" :plan-uuid="planUuid" />
            <AnnualprocurementplansItemAdd v-if="canAdd && canEditPlan" :plan-uuid="planUuid" />
          </div>

          <!-- Totals by procurement method / group / flags -->
          <div v-if="store.itemTotals.length || store.itemTotalsByGroup.length || store.itemTotalsByFlag.length" class="mt-3 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <div v-if="store.itemTotals.length" class="rounded border border-base-200">
              <div class="flex items-center justify-between border-b border-base-200 bg-base-200/40 px-3 py-2">
                <div class="text-sm font-semibold">Totals by Procurement Method</div>
                <div class="text-xs text-base-content/60">{{ totalItems }} item{{ totalItems === 1 ? '' : 's' }}</div>
              </div>
              <table class="table table-sm w-full">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th class="text-right">Items</th>
                    <th class="text-right">Total Cost</th>
                    <th class="text-right">% of Plan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in store.itemTotals" :key="row.key">
                    <td>
                      <span v-if="row.unresolved" class="text-warning">{{ row.label }}</span>
                      <span v-else>{{ row.label }}</span>
                    </td>
                    <td class="text-right">{{ row.count }}</td>
                    <td class="text-right font-mono">{{ formatAmount(row.total) }}</td>
                    <td class="text-right">{{ planTotal > 0 ? ((row.total / planTotal) * 100).toFixed(1) + '%' : '—' }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="font-semibold">
                    <td>Total</td>
                    <td class="text-right">{{ totalItems }}</td>
                    <td class="text-right font-mono">{{ formatAmount(planTotal) }}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div v-if="store.itemTotalsByGroup.length" class="rounded border border-base-200">
              <div class="flex items-center justify-between border-b border-base-200 bg-base-200/40 px-3 py-2">
                <div class="text-sm font-semibold">Totals by Procurement Group</div>
                <div class="text-xs text-base-content/60">{{ totalItems }} item{{ totalItems === 1 ? '' : 's' }}</div>
              </div>
              <table class="table table-sm w-full">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th class="text-right">Items</th>
                    <th class="text-right">Total Cost</th>
                    <th class="text-right">% of Plan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in store.itemTotalsByGroup" :key="row.key">
                    <td>
                      <span v-if="row.unresolved" class="text-warning">{{ row.label }}</span>
                      <span v-else>{{ row.label }}</span>
                    </td>
                    <td class="text-right">{{ row.count }}</td>
                    <td class="text-right font-mono">{{ formatAmount(row.total) }}</td>
                    <td class="text-right">{{ planGroupTotal > 0 ? ((row.total / planGroupTotal) * 100).toFixed(1) + '%' : '—' }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="font-semibold">
                    <td>Total</td>
                    <td class="text-right">{{ totalItems }}</td>
                    <td class="text-right font-mono">{{ formatAmount(planGroupTotal) }}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div v-if="store.itemTotalsByFlag.length" class="rounded border border-base-200">
              <div class="flex items-center justify-between border-b border-base-200 bg-base-200/40 px-3 py-2">
                <div class="text-sm font-semibold">Totals by Flag</div>
                <div class="text-xs text-base-content/60">{{ totalItems }} item{{ totalItems === 1 ? '' : 's' }}</div>
              </div>
              <table class="table table-sm w-full">
                <thead>
                  <tr>
                    <th>Flag</th>
                    <th class="text-right">Items</th>
                    <th class="text-right">Total Cost</th>
                    <th class="text-right">% of Plan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in store.itemTotalsByFlag" :key="row.key">
                    <td>{{ row.label }}</td>
                    <td class="text-right">{{ row.count }}</td>
                    <td class="text-right font-mono">{{ formatAmount(row.total) }}</td>
                    <td class="text-right">{{ planTotal > 0 ? ((row.total / planTotal) * 100).toFixed(1) + '%' : '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="card mt-3 border border-base-200">
            <div class="card-body">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 pb-2">
                <span class="text-lg font-bold">Plan Items</span>
                <div class="flex items-center gap-2">
                  <input
                    v-model="itemsSearch"
                    type="text"
                    placeholder="Search ref or description..."
                    class="input input-bordered input-sm w-56"
                    @input="onSearchInput"
                  />
                  <select v-model.number="itemsPerPage" class="select select-bordered select-sm" @change="changePerPage">
                    <option :value="25">25 / page</option>
                    <option :value="50">50 / page</option>
                    <option :value="100">100 / page</option>
                    <option :value="200">200 / page</option>
                  </select>
                </div>
              </div>

              <div class="mt-2 flex flex-wrap items-center gap-1.5">
                <span class="text-xs text-base-content/60 mr-1">Filter:</span>
                <button
                  v-for="f in FILTER_FLAGS"
                  :key="f.key"
                  type="button"
                  :class="['badge badge-sm gap-1 cursor-pointer select-none', itemsFilters[f.key] ? 'badge-primary' : 'badge-outline']"
                  @click="toggleFlagFilter(f.key)"
                >
                  <Icon v-if="itemsFilters[f.key]" name="lucide:check" class="h-3 w-3" />
                  {{ f.label }}
                </button>
                <select
                  v-model="itemsFilters.consumption_mode"
                  class="select select-bordered select-xs ml-2"
                  @change="onConsumptionModeChange"
                >
                  <option value="">Mode: any</option>
                  <option value="ONCE_OFF">Once off</option>
                  <option value="DRILL_DOWN">Drill down</option>
                </select>
                <button
                  v-if="activeFilterCount > 0"
                  type="button"
                  class="btn btn-ghost btn-xs ml-1"
                  @click="clearItemsFilters"
                >
                  <Icon name="lucide:x" class="h-3 w-3" /> Clear ({{ activeFilterCount }})
                </button>
              </div>

              <div v-if="store.planItemsLoading" class="flex justify-center py-10">
                <span class="loading loading-spinner loading-lg"></span>
              </div>

              <div v-else class="overflow-x-auto">
                <table class="table table-zebra mt-3 w-full text-sm">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Ref</th>
                      <th>Description</th>
                      <th>Group</th>
                      <th>Method</th>
                      <th>Quarter</th>
                      <th>Mode</th>
                      <th class="text-right">Qty</th>
                      <th class="text-right">Unit Cost</th>
                      <th class="text-right">Total</th>
                      <th class="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!store.planItems.length">
                      <td colspan="11" class="text-center text-base-content/50">
                        {{ (itemsSearch || activeFilterCount > 0)
                          ? 'No items match the current search / filters.'
                          : 'No items yet. Add an item to start building the plan.' }}
                      </td>
                    </tr>
                    <tr
                      v-for="(it, i) in store.planItems"
                      :key="it.id"
                      :class="{ 'bg-warning/10': hasUnresolved(it) }"
                    >
                      <td>
                        {{ rowNumber(i) }}
                        <Icon
                          v-if="hasUnresolved(it)"
                          name="lucide:alert-triangle"
                          class="ml-1 text-warning"
                          :title="'Has unresolved values — see Issues tab'"
                        />
                      </td>
                      <td class="font-mono text-xs">{{ it.reference_no || '—' }}</td>
                      <td class="max-w-xs truncate" :title="it.description">{{ it.description }}</td>
                      <td>{{ it.procurementgroup?.name || (it.raw_procurementgroup_code ? `"${it.raw_procurementgroup_code}" (unresolved)` : '—') }}</td>
                      <td>{{ it.procurementmethod?.name || (it.raw_procurementmethod_code ? `"${it.raw_procurementmethod_code}" (unresolved)` : '—') }}</td>
                      <td>{{ it.quarter || '—' }}</td>
                      <td>
                        <span
                          v-if="it.consumption_mode"
                          :class="['badge badge-sm', it.consumption_mode === 'DRILL_DOWN' ? 'badge-warning' : 'badge-ghost']"
                          :title="it.consumption_mode === 'DRILL_DOWN'
                            ? 'Budget drawn down across multiple procurements'
                            : 'Whole budget used in a single procurement'"
                        >
                          {{ it.consumption_mode === 'DRILL_DOWN' ? 'Drill down' : 'Once off' }}
                        </span>
                        <span v-else class="text-base-content/40">—</span>
                      </td>
                      <td class="text-right font-mono">{{ formatAmount(it.quantity) }}</td>
                      <td class="text-right font-mono">{{ formatAmount(it.unit_cost) }}</td>
                      <td class="text-right font-mono">{{ formatAmount(it.total_cost) }}</td>
                      <td class="text-right">
                        <div class="flex justify-end gap-1">
                          <AnnualprocurementplansItemView :item="it" />
                          <AnnualprocurementplansItemEdit v-if="canEdit && canEditPlan" :plan-uuid="planUuid" :item="it" />
                          <AnnualprocurementplansItemDelete v-if="canDelete && canEditPlan" :plan-uuid="planUuid" :item="it" />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Pagination -->
              <div v-if="store.planItemsMeta.last_page > 1" class="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div class="text-xs text-base-content/60">
                  Page {{ store.planItemsMeta.current_page }} of {{ store.planItemsMeta.last_page }}
                  · {{ store.planItemsMeta.total }} total
                </div>
                <div class="join">
                  <button
                    class="btn btn-sm join-item"
                    :disabled="store.planItemsMeta.current_page <= 1 || store.planItemsLoading"
                    @click="goToPage(1)"
                  >
                    <Icon name="lucide:chevrons-left" />
                  </button>
                  <button
                    class="btn btn-sm join-item"
                    :disabled="store.planItemsMeta.current_page <= 1 || store.planItemsLoading"
                    @click="goToPage(store.planItemsMeta.current_page - 1)"
                  >
                    <Icon name="lucide:chevron-left" />
                    Prev
                  </button>
                  <button class="btn btn-sm join-item btn-disabled">
                    {{ store.planItemsMeta.current_page }}
                  </button>
                  <button
                    class="btn btn-sm join-item"
                    :disabled="store.planItemsMeta.current_page >= store.planItemsMeta.last_page || store.planItemsLoading"
                    @click="goToPage(store.planItemsMeta.current_page + 1)"
                  >
                    Next
                    <Icon name="lucide:chevron-right" />
                  </button>
                  <button
                    class="btn btn-sm join-item"
                    :disabled="store.planItemsMeta.current_page >= store.planItemsMeta.last_page || store.planItemsLoading"
                    @click="goToPage(store.planItemsMeta.last_page)"
                  >
                    <Icon name="lucide:chevrons-right" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Issues -->
        <div v-else-if="activeTab === 'issues'">
          <AnnualprocurementplansItemIssues
            :plan-uuid="planUuid"
            @resolved="onResolved"
          />
        </div>

        <!-- Disposal Plan -->
        <div v-else-if="activeTab === 'disposal'">
          <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <input
                v-model="disposalSearch"
                type="text"
                placeholder="Search disposal items..."
                class="input input-bordered input-sm w-56"
                @input="onDisposalSearchInput"
              />
              <select v-model.number="disposalPerPage" class="select select-bordered select-sm" @change="changeDisposalPerPage">
                <option :value="25">25 / page</option>
                <option :value="50">50 / page</option>
                <option :value="100">100 / page</option>
                <option :value="200">200 / page</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <DisposalplansImport v-if="canAdd && canEditPlan" :plan-uuid="planUuid" />
              <DisposalplansAdd v-if="canAdd && canEditPlan" :plan-uuid="planUuid" />
            </div>
          </div>

          <div v-if="store.disposalPlansLoading" class="flex justify-center py-10">
            <span class="loading loading-spinner loading-lg"></span>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="table table-zebra mt-3 w-full text-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Asset No.</th>
                  <th>Serial No.</th>
                  <th>Location</th>
                  <th>Acquired</th>
                  <th class="text-right">Useful Life</th>
                  <th class="text-right">Salvage Value</th>
                  <th>Target Disposal</th>
                  <th>Reason</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!store.disposalPlans.length">
                  <td colspan="12" class="text-center text-base-content/50">
                    {{ disposalSearch ? 'No disposal items match your search.' : 'No disposal items yet.' }}
                  </td>
                </tr>
                <tr v-for="(d, i) in store.disposalPlans" :key="d.id">
                  <td>{{ disposalRowNumber(i) }}</td>
                  <td class="max-w-xs truncate" :title="d.description">{{ d.description }}</td>
                  <td>{{ d.category }}</td>
                  <td class="font-mono text-xs">{{ d.assetnumber || '—' }}</td>
                  <td class="font-mono text-xs">{{ d.serialnumber || '—' }}</td>
                  <td>{{ d.physicallocation }}</td>
                  <td>{{ formatDate(d.acquisitiondate) }}</td>
                  <td class="text-right">{{ d.estimatedusefullife }} yr</td>
                  <td class="text-right font-mono">{{ formatAmount(d.estimatedsalvagevalue) }}</td>
                  <td>{{ formatDate(d.targetdisposaldate) }}</td>
                  <td>{{ d.disposalreason?.name || '—' }}</td>
                  <td class="text-right">
                    <div class="flex justify-end gap-1">
                      <DisposalplansEdit v-if="canEdit && canEditPlan" :plan-uuid="planUuid" :item="d" />
                      <DisposalplansDelete v-if="canDelete && canEditPlan" :plan-uuid="planUuid" :item="d" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="store.disposalPlansMeta.last_page > 1" class="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div class="text-xs text-base-content/60">
              Page {{ store.disposalPlansMeta.current_page }} of {{ store.disposalPlansMeta.last_page }}
              · {{ store.disposalPlansMeta.total }} total
            </div>
            <div class="join">
              <button
                class="btn btn-sm join-item"
                :disabled="store.disposalPlansMeta.current_page <= 1 || store.disposalPlansLoading"
                @click="goToDisposalPage(1)"
              >
                <Icon name="lucide:chevrons-left" />
              </button>
              <button
                class="btn btn-sm join-item"
                :disabled="store.disposalPlansMeta.current_page <= 1 || store.disposalPlansLoading"
                @click="goToDisposalPage(store.disposalPlansMeta.current_page - 1)"
              >
                <Icon name="lucide:chevron-left" /> Prev
              </button>
              <button class="btn btn-sm join-item btn-disabled">
                {{ store.disposalPlansMeta.current_page }}
              </button>
              <button
                class="btn btn-sm join-item"
                :disabled="store.disposalPlansMeta.current_page >= store.disposalPlansMeta.last_page || store.disposalPlansLoading"
                @click="goToDisposalPage(store.disposalPlansMeta.current_page + 1)"
              >
                Next <Icon name="lucide:chevron-right" />
              </button>
              <button
                class="btn btn-sm join-item"
                :disabled="store.disposalPlansMeta.current_page >= store.disposalPlansMeta.last_page || store.disposalPlansLoading"
                @click="goToDisposalPage(store.disposalPlansMeta.last_page)"
              >
                <Icon name="lucide:chevrons-right" />
              </button>
            </div>
          </div>
        </div>

        <!-- Evaluation Committee -->
        <div v-else-if="activeTab === 'evaluation'">
          <Evaluationcommittees
            :plan-uuid="planUuid"
            :can-add="canAdd && canEditPlan"
            :can-edit="canEdit && canEditPlan"
            :can-delete="canDelete && canEditPlan"
          />
        </div>

        <!-- Disposal Committee -->
        <div v-else-if="activeTab === 'disposalcommittee'">
          <Disposalcommittees
            :plan-uuid="planUuid"
            :can-add="canAdd && canEditPlan"
            :can-edit="canEdit && canEditPlan"
            :can-delete="canDelete && canEditPlan"
          />
        </div>

        <!-- Required Attachments -->
        <div v-else-if="activeTab === 'attachments'">
          <Plandocuments
            :plan-uuid="planUuid"
            :can-edit="canEdit && canEditPlan"
            :can-delete="canDelete && canEditPlan"
          />
        </div>

        <!-- Workflow History -->
        <div v-else-if="activeTab === 'history'" class="overflow-x-auto">
          <table class="table table-zebra mt-3 w-full text-sm">
            <thead>
              <tr>
                <th>#</th>
                <th>When</th>
                <th>Who</th>
                <th>Action</th>
                <th>Status change</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!peTransitions.length">
                <td colspan="6" class="text-center text-base-content/50">No workflow activity yet.</td>
              </tr>
              <tr v-for="(t, i) in peTransitions" :key="t.id ?? i">
                <td>{{ i + 1 }}</td>
                <td>{{ formatDateTime(t.created_at) }}</td>
                <td>{{ t.user?.name || '—' }}</td>
                <td>
                  <span :class="['badge', actionBadge(t.action)]">{{ actionLabel(t.action) }}</span>
                </td>
                <td class="font-mono text-xs">{{ t.from_status }} → {{ t.to_status }}</td>
                <td class="max-w-xl whitespace-pre-line">{{ t.comment || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  planUuid: { type: String, required: true },
  canAdd: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
});

const store = useAnnualprocurementplanStore();
const { currentPlan: plan } = storeToRefs(store);

const activeTab = ref('items');

const isDraft = computed(() => store.isDraft(plan.value));
// Only the creator of a draft can edit; everyone else sees a read-only view.
const canEditPlan = computed(() => isDraft.value && store.workflowIsCreator);
// PE-side workflow history hides admin-internal chatter — handler
// recommendations, manager agree/disagree, and approver-to-manager
// bouncebacks are all noise for the PE. Show only the PE-visible actions
// (PE-side workflow steps + the approver's final-approve and the
// approver-to-PE send-back).
const PE_VISIBLE_ACTIONS = new Set([
  'submit_for_review',
  'review_approve',
  'review_send_back',
  'approve',
  'approve_send_back',
  'approver_approve',
  'approver_send_back_to_pe',
]);
const peTransitions = computed(() =>
  (store.transitions ?? []).filter((t) => PE_VISIBLE_ACTIONS.has(t.action)),
);

const totalItems = computed(() => store.planItemsMeta?.total ?? plan.value?.items_count ?? 0);

const hasUnresolved = (item) =>
  (item.raw_procurementmethod_code !== null && item.raw_procurementmethod_code !== undefined && !item.procurementmethod_id)
  || (item.raw_procurementgroup_code !== null && item.raw_procurementgroup_code !== undefined && !item.procurementgroup_id)
  || (item.raw_sourceoffunds_name !== null && item.raw_sourceoffunds_name !== undefined && !item.sourceoffunds_id)
  || (item.raw_unitofmeasure_name !== null && item.raw_unitofmeasure_name !== undefined && !item.unitofmeasure_id);

// Issues badge — sum of all unresolved (field, raw_value) groups across the
// whole plan, not just the visible page.
const unresolvedCount = computed(() =>
  (store.unresolvedSummary ?? []).reduce((sum, g) => sum + (g.count ?? 0), 0),
);

// Plan total = sum of every method bucket's total (server-aggregated).
const planTotal = computed(() =>
  (store.itemTotals ?? []).reduce((sum, row) => sum + (Number(row.total) || 0), 0),
);

const planGroupTotal = computed(() =>
  (store.itemTotalsByGroup ?? []).reduce((sum, row) => sum + (Number(row.total) || 0), 0),
);

// Pagination state for the items table.
const itemsPerPage = ref(50);
const itemsSearch = ref('');
let searchTimer = null;

// Items filter state — one boolean per filterable flag, plus a tri-state
// consumption_mode select. Kept in one object so the build-opts helper
// can spread it straight into the fetch call.
const FILTER_FLAGS = [
  { key: 'pre_qualification', label: 'Pre-Qual' },
  { key: 'eoi', label: 'EOI' },
  { key: 'spoc', label: 'SPOC' },
  { key: 'sustainable_procurement', label: 'Sustainable' },
  { key: 'affirmative_procurement', label: 'Affirmative' },
  { key: 'procurement_exemption', label: 'Exemption' },
];
const itemsFilters = reactive({
  pre_qualification: false,
  eoi: false,
  spoc: false,
  sustainable_procurement: false,
  affirmative_procurement: false,
  procurement_exemption: false,
  consumption_mode: '',
});
const activeFilterCount = computed(() => {
  let n = 0;
  for (const f of FILTER_FLAGS) if (itemsFilters[f.key]) n++;
  if (itemsFilters.consumption_mode) n++;
  return n;
});

const buildItemsOpts = (extra = {}) => ({
  per_page: itemsPerPage.value,
  search: itemsSearch.value || undefined,
  ...itemsFilters,
  consumption_mode: itemsFilters.consumption_mode || undefined,
  ...extra,
});

// Refresh the three totals cards using the same filter set as the items
// list so the summary numbers always agree with the visible rows.
const refreshFilteredTotals = (opts) => Promise.all([
  store.fetchItemTotals(props.planUuid, opts),
  store.fetchItemTotalsByGroup(props.planUuid, opts),
  store.fetchItemTotalsByFlag(props.planUuid, opts),
]);

const rowNumber = (i) => ((store.planItemsMeta.current_page - 1) * store.planItemsMeta.per_page) + i + 1;

const goToPage = async (page) => {
  if (page < 1 || page > store.planItemsMeta.last_page) return;
  // Pagination doesn't change the filter set, so the totals don't need a
  // refresh here — just paginate the items list.
  await store.fetchPlanItems(props.planUuid, buildItemsOpts({ page }));
};

const changePerPage = async () => {
  await store.fetchPlanItems(props.planUuid, buildItemsOpts({ page: 1 }));
};

const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const opts = buildItemsOpts({ page: 1 });
    store.fetchPlanItems(props.planUuid, opts);
    refreshFilteredTotals(opts);
  }, 250);
};

const toggleFlagFilter = (key) => {
  itemsFilters[key] = !itemsFilters[key];
  const opts = buildItemsOpts({ page: 1 });
  store.fetchPlanItems(props.planUuid, opts);
  refreshFilteredTotals(opts);
};

const onConsumptionModeChange = () => {
  const opts = buildItemsOpts({ page: 1 });
  store.fetchPlanItems(props.planUuid, opts);
  refreshFilteredTotals(opts);
};

const clearItemsFilters = () => {
  for (const f of FILTER_FLAGS) itemsFilters[f.key] = false;
  itemsFilters.consumption_mode = '';
  const opts = buildItemsOpts({ page: 1 });
  store.fetchPlanItems(props.planUuid, opts);
  refreshFilteredTotals(opts);
};

const onResolved = async () => {
  await Promise.all([
    store.fetchPlanItems(props.planUuid, buildItemsOpts({ page: store.planItemsMeta.current_page })),
    store.fetchItemTotals(props.planUuid),
    store.fetchItemTotalsByGroup(props.planUuid),
    store.fetchItemTotalsByFlag(props.planUuid),
    store.fetchUnresolved(props.planUuid),
  ]);
};

const actionLabel = (action) => ({
  submit_for_review: 'Submitted for Review',
  review_approve: 'Review Approved',
  review_send_back: 'Sent Back to Creator',
  approve: 'Approved',
  approve_send_back: 'Sent Back to Reviewer',
})[action] ?? action;

const actionBadge = (action) => ({
  submit_for_review: 'badge-info',
  review_approve: 'badge-success',
  review_send_back: 'badge-warning',
  approve: 'badge-success',
  approve_send_back: 'badge-warning',
})[action] ?? 'badge-ghost';

// Disposal plan pagination state.
const disposalPerPage = ref(50);
const disposalSearch = ref('');
let disposalSearchTimer = null;

const disposalRowNumber = (i) =>
  ((store.disposalPlansMeta.current_page - 1) * store.disposalPlansMeta.per_page) + i + 1;

const goToDisposalPage = async (page) => {
  if (page < 1 || page > store.disposalPlansMeta.last_page) return;
  await store.fetchDisposalplans(props.planUuid, {
    page,
    per_page: disposalPerPage.value,
    search: disposalSearch.value || undefined,
  });
};

const changeDisposalPerPage = async () => {
  await store.fetchDisposalplans(props.planUuid, {
    page: 1,
    per_page: disposalPerPage.value,
    search: disposalSearch.value || undefined,
  });
};

const onDisposalSearchInput = () => {
  if (disposalSearchTimer) clearTimeout(disposalSearchTimer);
  disposalSearchTimer = setTimeout(() => {
    store.fetchDisposalplans(props.planUuid, {
      page: 1,
      per_page: disposalPerPage.value,
      search: disposalSearch.value || undefined,
    });
  }, 250);
};

const formatDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString();
};

const formatDateTime = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
};

const formatStatus = (status) => {
  if (!status) return '—';
  return status.split('_').map((s) => s.charAt(0) + s.slice(1).toLowerCase()).join(' ');
};

const statusBadge = (status) => {
  if (status === 'ACTIVE') return 'badge-success';
  if (status === 'PENDING_ADMIN_AUTHORIZATION') return 'badge-info';
  if (status === 'PENDING_INTERNAL_APPROVAL') return 'badge-info';
  if (status === 'PENDING_REVIEW') return 'badge-info';
  if (status === 'DRAFT') return 'badge-warning';
  return 'badge-ghost';
};

const paymentStatusBadge = (status) => {
  if (status === 'PAID') return 'badge-success';
  if (status === 'PARTIALLY_PAID') return 'badge-info';
  if (status === 'PENDING') return 'badge-warning';
  if (status === 'OVERDUE') return 'badge-error';
  return 'badge-ghost';
};

const formatPaymentStatus = (status) => (status ?? '').replace('_', ' ');

const formatAmount = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
</script>

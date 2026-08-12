<template>
  <div class="mt-3 space-y-4">
    <!-- Header / hero -->
    <div class="relative overflow-hidden rounded-2xl border border-base-200 bg-gradient-to-br from-primary/10 via-base-100 to-base-100 shadow-sm">
      <div class="absolute inset-y-0 left-0 w-1.5 bg-primary"></div>
      <div class="p-5 sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-base-content/50">
              <Icon name="lucide:clipboard-list" class="h-4 w-4" />
              Annual Procurement Plan
            </div>
            <h1 class="mt-1 flex flex-wrap items-baseline gap-x-3 text-3xl font-bold tracking-tight">
              <span>{{ plan?.year ?? '…' }}</span>
              <span class="text-base-content/25">/</span>
              <span class="text-base-content/80">{{ plan?.company?.name ?? '' }}</span>
            </h1>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <span :class="['badge badge-lg gap-1.5', statusBadge(plan?.status)]">
                <Icon name="lucide:circle-dot" class="h-3.5 w-3.5" />
                {{ formatStatus(plan?.status) }}
              </span>
              <span v-if="plan?.paymentstatus" :class="['badge badge-lg gap-1.5', paymentStatusBadge(plan?.paymentstatus)]">
                <Icon name="lucide:credit-card" class="h-3.5 w-3.5" />
                {{ formatPaymentStatus(plan?.paymentstatus) }}
              </span>
              <span v-if="plan?.currency" class="badge badge-lg badge-outline gap-1.5">
                <Icon name="lucide:coins" class="h-3.5 w-3.5" />
                {{ plan.currency.code }}<template v-if="plan.currency.symbol"> · {{ plan.currency.symbol }}</template>
              </span>
            </div>
            <div v-if="plan?.submitted_at" class="mt-3 flex items-center gap-1.5 text-xs text-base-content/50">
              <Icon name="lucide:send" class="h-3.5 w-3.5" />
              Submitted by {{ plan.submitted_by_user?.name || plan.submittedBy?.name || '—' }}
              on {{ formatDateTime(plan.submitted_at) }}
            </div>
          </div>

          <div class="flex items-center gap-2">
            <AnnualprocurementplansClassificationMatch :plan-uuid="planUuid" :can-edit="canEditPlan" />
            <AnnualprocurementplansAnalyzePlan :plan-uuid="planUuid" :can-edit="canEditPlan" />
            <AnnualprocurementplansWorkflowActions :plan-uuid="planUuid" />
          </div>
        </div>

        <!-- Stat strip -->
        <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-xl border border-base-200 bg-base-100/70 p-3 backdrop-blur">
            <div class="flex items-center gap-1.5 text-xs font-medium text-base-content/50">
              <Icon name="lucide:wallet" class="h-4 w-4" /> Total Budget
            </div>
            <div class="mt-1 truncate font-mono text-xl font-bold" :title="formatAmount(planTotal)">
              <span class="text-sm text-base-content/50">{{ currencySymbol }}</span>{{ formatAmount(planTotal) }}
            </div>
          </div>
          <div class="rounded-xl border border-base-200 bg-base-100/70 p-3 backdrop-blur">
            <div class="flex items-center gap-1.5 text-xs font-medium text-base-content/50">
              <Icon name="lucide:list" class="h-4 w-4" /> Plan Items
            </div>
            <div class="mt-1 text-xl font-bold">{{ totalItems }}</div>
          </div>
          <div class="rounded-xl border border-base-200 bg-base-100/70 p-3 backdrop-blur">
            <div class="flex items-center gap-1.5 text-xs font-medium text-base-content/50">
              <Icon name="lucide:layers" class="h-4 w-4" /> Consolidated
            </div>
            <div class="mt-1 text-xl font-bold">{{ store.groupedConsolidated.length }}</div>
          </div>
          <div class="rounded-xl border border-base-200 bg-base-100/70 p-3 backdrop-blur">
            <div class="flex items-center gap-1.5 text-xs font-medium text-base-content/50">
              <Icon name="lucide:alert-triangle" class="h-4 w-4" /> Issues
            </div>
            <div class="mt-1 text-xl font-bold" :class="unresolvedCount > 0 ? 'text-warning' : 'text-success'">{{ unresolvedCount }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs + active tab content -->
    <div class="card overflow-hidden rounded-2xl border border-base-200 shadow-sm">
      <div class="card-body p-0">
        <div class="sticky top-0 z-20 overflow-x-auto border-b border-base-200 bg-base-100/90 backdrop-blur">
          <div role="tablist" class="tabs tabs-border min-w-max px-3 pt-1">
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
            :class="{ 'tab-active': activeTab === 'pmu' }"
            @click="activeTab = 'pmu'"
          >
            <Icon name="lucide:building-2" class="mr-1" />
            Procurement Management Unit
            <span class="badge badge-sm ml-2">{{ store.pmuMembersMeta.total }}</span>
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
        </div>

        <div class="space-y-4 p-4 sm:p-5">
        <!-- Plan Items -->
        <div v-if="activeTab === 'items'">
          <div class="mt-3 flex justify-end gap-2">
            <AnnualprocurementplansItemImport v-if="canAdd && canEditPlan" :plan-uuid="planUuid" />
            <AnnualprocurementplansItemAdd v-if="canAdd && canEditPlan" :plan-uuid="planUuid" />
          </div>

          <!-- Totals by procurement method / group / flags -->
          <div v-if="store.itemTotals.length || store.itemTotalsByGroup.length || store.itemTotalsByFlag.length" class="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <AnnualprocurementplansTotalsBars
              v-if="store.itemTotals.length"
              title="Totals by Procurement Method"
              icon="lucide:gavel"
              accent="primary"
              :rows="store.itemTotals"
              :denominator="planTotal"
              :total-items="totalItems"
              :grand-total="planTotal"
              show-footer
            />
            <AnnualprocurementplansTotalsBars
              v-if="store.itemTotalsByGroup.length"
              title="Totals by Procurement Group"
              icon="lucide:boxes"
              accent="secondary"
              :rows="store.itemTotalsByGroup"
              :denominator="planGroupTotal"
              :total-items="totalItems"
              :grand-total="planGroupTotal"
              show-footer
            />
            <AnnualprocurementplansTotalsBars
              v-if="store.itemTotalsByFlag.length"
              title="Totals by Flag"
              icon="lucide:flag"
              accent="accent"
              :rows="store.itemTotalsByFlag"
              :denominator="planTotal"
              :total-items="totalItems"
            />
          </div>
          <div class="card mt-4 rounded-xl border border-base-200 shadow-sm">
            <div class="card-body">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 pb-3">
                <span class="flex items-center gap-2 text-lg font-bold">
                  <Icon name="lucide:list-checks" class="h-5 w-5 text-primary" />
                  Plan Items
                </span>
                <div class="flex flex-wrap items-center gap-2">
                  <input
                    v-model="itemsSearch"
                    type="text"
                    placeholder="Search ref or description..."
                    class="input input-bordered input-sm w-56"
                    @input="onSearchInput"
                  />

                  <button type="button" class="btn btn-outline btn-sm gap-1.5" @click="openFilters">
                    <Icon name="lucide:filter" class="h-4 w-4" />
                    Filters
                    <span v-if="activeFilterCount > 0" class="badge badge-primary badge-xs">{{ activeFilterCount }}</span>
                  </button>

                  <select v-model.number="itemsPerPage" class="select select-bordered select-sm" @change="changePerPage">
                    <option :value="25">25 / page</option>
                    <option :value="50">50 / page</option>
                    <option :value="100">100 / page</option>
                    <option :value="200">200 / page</option>
                  </select>
                </div>
              </div>

              <!-- Filters dialog -->
              <dialog ref="filtersDialog" class="modal">
                <div class="modal-box max-w-md">
                  <div class="flex items-center justify-between">
                    <h3 class="flex items-center gap-2 text-lg font-bold">
                      <Icon name="lucide:filter" class="h-5 w-5 text-primary" />
                      Filters
                    </h3>
                    <button type="button" class="btn btn-circle btn-ghost btn-sm" @click="closeFilters">
                      <Icon name="lucide:x" class="h-4 w-4" />
                    </button>
                  </div>

                  <div class="mt-4 space-y-4">
                    <div>
                      <div class="mb-1.5 text-sm font-semibold">Procurement flags</div>
                      <div class="grid grid-cols-2 gap-1">
                        <label
                          v-for="f in FILTER_FLAGS"
                          :key="f.key"
                          class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-base-200"
                        >
                          <input
                            type="checkbox"
                            class="checkbox checkbox-sm"
                            :checked="itemsFilters[f.key]"
                            @change="toggleFlagFilter(f.key)"
                          />
                          <span class="text-sm">{{ f.label }}</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <div class="mb-1.5 text-sm font-semibold">Consumption mode</div>
                      <select
                        v-model="itemsFilters.consumption_mode"
                        class="select select-bordered select-sm w-full"
                        @change="onConsumptionModeChange"
                      >
                        <option value="">Any</option>
                        <option value="ONCE_OFF">Once off</option>
                        <option value="DRILL_DOWN">Drill down</option>
                      </select>
                    </div>
                  </div>

                  <div class="modal-action">
                    <button
                      v-if="activeFilterCount > 0"
                      type="button"
                      class="btn btn-ghost btn-sm"
                      @click="clearItemsFilters"
                    >
                      <Icon name="lucide:x" class="h-3 w-3" /> Clear all
                    </button>
                    <button type="button" class="btn btn-primary btn-sm" @click="closeFilters">Done</button>
                  </div>
                </div>
                <form method="dialog" class="modal-backdrop">
                  <button type="button" @click="closeFilters">close</button>
                </form>
              </dialog>

              <div v-if="store.groupedItemsLoading" class="flex justify-center py-10">
                <span class="loading loading-spinner loading-lg"></span>
              </div>

              <template v-else>
                <!-- Sub-tabs: consolidated groups vs individual rows. -->
                <div class="mt-3">
                  <div role="tablist" class="tabs tabs-box tabs-sm inline-flex bg-base-200/60">
                    <button
                      role="tab"
                      type="button"
                      class="tab gap-1.5"
                      :class="{ 'tab-active': effectiveItemsView === 'consolidated' }"
                      :disabled="!store.groupedConsolidated.length"
                      @click="itemsView = 'consolidated'"
                    >
                      <Icon name="lucide:layers" class="h-4 w-4" />
                      Consolidated
                      <span class="badge badge-xs">{{ store.groupedConsolidated.length }}</span>
                    </button>
                    <button
                      role="tab"
                      type="button"
                      class="tab gap-1.5"
                      :class="{ 'tab-active': effectiveItemsView === 'individual' }"
                      @click="itemsView = 'individual'"
                    >
                      <Icon name="lucide:list" class="h-4 w-4" />
                      Individual
                      <span class="badge badge-xs">{{ store.groupedIndividualMeta.total }}</span>
                    </button>
                  </div>
                </div>

                <!-- Consolidated items: rows sharing a reference number, shown
                     as one collapsible line carrying only the total qty/budget;
                     unit prices live on the children when drilled down. -->
                <div v-if="effectiveItemsView === 'consolidated'" class="mt-3 space-y-2">
                  <AnnualprocurementplansConsolidatedRow
                    v-for="grp in store.groupedConsolidated"
                    :key="grp.reference_no"
                    :group="grp"
                    :plan-uuid="planUuid"
                    :currency="currencySymbol"
                    :can-edit="canEdit"
                    :can-delete="canDelete"
                    :can-edit-plan="canEditPlan"
                  />
                </div>

                <!-- Individual items: null/unique reference rows, paginated. -->
                <template v-else>
                  <div class="mt-3 overflow-hidden rounded-xl border border-base-200">
                    <div
                      v-if="!store.groupedIndividual.length"
                      class="p-6 text-center text-sm text-base-content/50"
                    >
                      {{ (itemsSearch || activeFilterCount > 0)
                        ? 'No individual items match the current search / filters.'
                        : (store.groupedConsolidated.length
                          ? 'All matching items are consolidated.'
                          : 'No items yet. Add an item to start building the plan.') }}
                    </div>
                    <div v-else class="divide-y divide-base-200">
                      <AnnualprocurementplansPlanItemRow
                        v-for="it in store.groupedIndividual"
                        :key="it.id"
                        :item="it"
                        :plan-uuid="planUuid"
                        :can-edit="canEdit"
                        :can-delete="canDelete"
                        :can-edit-plan="canEditPlan"
                      />
                    </div>
                  </div>

                  <!-- Pagination (individual list) -->
                  <div v-if="store.groupedIndividualMeta.last_page > 1" class="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div class="text-xs text-base-content/60">
                      Page {{ store.groupedIndividualMeta.current_page }} of {{ store.groupedIndividualMeta.last_page }}
                      · {{ store.groupedIndividualMeta.total }} total
                    </div>
                    <div class="join">
                      <button
                        class="btn btn-sm join-item"
                        :disabled="store.groupedIndividualMeta.current_page <= 1 || store.groupedItemsLoading"
                        @click="goToPage(1)"
                      >
                        <Icon name="lucide:chevrons-left" />
                      </button>
                      <button
                        class="btn btn-sm join-item"
                        :disabled="store.groupedIndividualMeta.current_page <= 1 || store.groupedItemsLoading"
                        @click="goToPage(store.groupedIndividualMeta.current_page - 1)"
                      >
                        <Icon name="lucide:chevron-left" />
                        Prev
                      </button>
                      <button class="btn btn-sm join-item btn-disabled">
                        {{ store.groupedIndividualMeta.current_page }}
                      </button>
                      <button
                        class="btn btn-sm join-item"
                        :disabled="store.groupedIndividualMeta.current_page >= store.groupedIndividualMeta.last_page || store.groupedItemsLoading"
                        @click="goToPage(store.groupedIndividualMeta.current_page + 1)"
                      >
                        Next
                        <Icon name="lucide:chevron-right" />
                      </button>
                      <button
                        class="btn btn-sm join-item"
                        :disabled="store.groupedIndividualMeta.current_page >= store.groupedIndividualMeta.last_page || store.groupedItemsLoading"
                        @click="goToPage(store.groupedIndividualMeta.last_page)"
                      >
                        <Icon name="lucide:chevrons-right" />
                      </button>
                    </div>
                  </div>
                </template>
              </template>
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

        <!-- Procurement Management Unit -->
        <div v-else-if="activeTab === 'pmu'">
          <Procurementmanagementunits
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
                <td class="max-w-xl whitespace-pre-line">
                  <div>{{ t.comment || '—' }}</div>
                  <span
                    v-if="t.ai_overridden"
                    class="badge badge-warning badge-sm mt-1 gap-1"
                    :title="`AI recommended ${formatAiDecision(t.ai_decision)} — the user proceeded against it`"
                  >
                    <Icon name="lucide:alert-triangle" class="h-3 w-3" />
                    Overrode AI ({{ formatAiDecision(t.ai_decision) }})
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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

// Sub-view within the Plan Items tab: consolidated groups vs individual rows.
const itemsView = ref('consolidated');
// Fall back to the individual list when there are no consolidated groups, so
// the Consolidated sub-tab is never shown empty.
const effectiveItemsView = computed(() =>
  (itemsView.value === 'consolidated' && store.groupedConsolidated.length === 0)
    ? 'individual'
    : itemsView.value,
);

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

const totalItems = computed(() => plan.value?.items_count ?? store.groupedIndividualMeta?.total ?? 0);

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
const activeFlagCount = computed(() => {
  let n = 0;
  for (const f of FILTER_FLAGS) if (itemsFilters[f.key]) n++;
  return n;
});

// Filters dialog open/close.
const filtersDialog = ref(null);
const openFilters = () => filtersDialog.value?.showModal?.();
const closeFilters = () => filtersDialog.value?.close?.();

const activeFilterCount = computed(() =>
  activeFlagCount.value + (itemsFilters.consumption_mode ? 1 : 0),
);

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

const goToPage = async (page) => {
  if (page < 1 || page > store.groupedIndividualMeta.last_page) return;
  // Pagination doesn't change the filter set, so the totals don't need a
  // refresh here — just paginate the individual items list.
  await store.fetchGroupedItems(props.planUuid, buildItemsOpts({ page }));
};

const changePerPage = async () => {
  await store.fetchGroupedItems(props.planUuid, buildItemsOpts({ page: 1 }));
};

const onSearchInput = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const opts = buildItemsOpts({ page: 1 });
    store.fetchGroupedItems(props.planUuid, opts);
    refreshFilteredTotals(opts);
  }, 250);
};

const toggleFlagFilter = (key) => {
  itemsFilters[key] = !itemsFilters[key];
  const opts = buildItemsOpts({ page: 1 });
  store.fetchGroupedItems(props.planUuid, opts);
  refreshFilteredTotals(opts);
};

const onConsumptionModeChange = () => {
  const opts = buildItemsOpts({ page: 1 });
  store.fetchGroupedItems(props.planUuid, opts);
  refreshFilteredTotals(opts);
};

const clearItemsFilters = () => {
  for (const f of FILTER_FLAGS) itemsFilters[f.key] = false;
  itemsFilters.consumption_mode = '';
  const opts = buildItemsOpts({ page: 1 });
  store.fetchGroupedItems(props.planUuid, opts);
  refreshFilteredTotals(opts);
};

const onResolved = async () => {
  await Promise.all([
    store.fetchGroupedItems(props.planUuid, buildItemsOpts({ page: store.groupedIndividualMeta.current_page })),
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

const formatAiDecision = (d) => ({
  SEND_BACK_TO_PE: 'send back',
  NEEDS_CORRECTIONS: 'needs corrections',
  APPROVE: 'approve',
  READY: 'ready',
})[d] ?? (d || 'n/a');

const formatAmount = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const currencySymbol = computed(() => {
  const c = plan.value?.currency;
  if (!c) return '';
  return c.symbol ? `${c.symbol} ` : `${c.code} `;
});
</script>

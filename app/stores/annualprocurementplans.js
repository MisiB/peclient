import { defineStore } from 'pinia';

export const useAnnualprocurementplanStore = defineStore('annualprocurementplan', () => {
  const items = ref([]);
  const loading = ref(false);

  const currentPlan = ref(null);
  const currentPlanLoading = ref(false);

  // Paginated items belonging to the currently-loaded plan.
  const planItems = ref([]);
  const planItemsMeta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 50 });
  const planItemsLoading = ref(false);

  // Aggregates + unresolved summary, cached at the plan level so the totals
  // card and Issues badge stay accurate across paginated views.
  const itemTotals = ref([]);
  const itemTotalsByGroup = ref([]);
  const itemTotalsByFlag = ref([]);
  const unresolvedSummary = ref([]);

  // Disposal plan items + their lookup reasons.
  const disposalPlans = ref([]);
  const disposalPlansMeta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 50 });
  const disposalPlansLoading = ref(false);
  const disposalreasons = ref([]);

  // Evaluation committee (paginated members) + currently-loaded member detail.
  const committeeMembers = ref([]);
  const committeeMembersMeta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 25 });
  const committeeMembersLoading = ref(false);
  const currentMember = ref(null);
  // Roles available for the plan's company — populates the role dropdown.
  const committeeRoles = ref([]);

  // Required-document uploads for the currently-loaded plan.
  const planDocuments = ref([]);
  const planDocumentsLoading = ref(false);

  // Latest plan-analysis report (tier1 + tier2 + can_submit).
  const analysisReport = ref(null);
  const analysisLoading = ref(false);

  const planInvoice = ref(null);
  const invoiceLoading = ref(false);
  const invoiceSettling = ref(false);

  const virements = ref([]);
  const virementsMeta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 25 });
  const virementsLoading = ref(false);

  const supplements = ref([]);
  const supplementsMeta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 25 });
  const supplementsLoading = ref(false);
  const currentSupplement = ref(null);
  const supplementWorkflowActions = ref([]);
  const supplementIsCreator = ref(false);

  // Workflow actions available to the current user for the current plan,
  // and the chronological transition history.
  const workflowActions = ref([]);
  const workflowIsCreator = ref(false);
  const transitions = ref([]);

  // Disposal committee (paginated members; no qualifications/work history).
  const disposalCommitteeMembers = ref([]);
  const disposalCommitteeMembersMeta = ref({ current_page: 1, last_page: 1, total: 0, per_page: 25 });
  const disposalCommitteeMembersLoading = ref(false);
  const disposalCommitteeRoles = ref([]);

  // Lookups for plan-item form (UNSPSC is searched on demand, not preloaded)
  const procurementclasses = ref([]);
  const procurementmethods = ref([]);
  const procurementgroups = ref([]);
  const sourceoffunds = ref([]);
  const unitofmeasures = ref([]);
  const currencies = ref([]);

  const {
    getPlans,
    getPlan,
    createPlan,
    updatePlan,
    deletePlan,
    getItems,
    getItemTotals,
    getItemTotalsByGroup,
    getItemTotalsByFlag,
    createItem,
    updateItem,
    deleteItem,
    getDisposalplans,
    createDisposalplan,
    updateDisposalplan,
    deleteDisposalplan,
    getDisposalreasons,
    importDisposalplans,
    getCommitteeRoles,
    getCommitteeMembers,
    getCommitteeMember,
    createCommitteeMember,
    updateCommitteeMember,
    deleteCommitteeMember,
    createQualification,
    updateQualification,
    deleteQualification,
    createWorkhistory,
    updateWorkhistory,
    deleteWorkhistory,
    getDisposalcommitteeRoles,
    getDisposalcommitteeMembers,
    createDisposalcommitteeMember,
    updateDisposalcommitteeMember,
    deleteDisposalcommitteeMember,
    getPlanDocuments,
    uploadPlanDocument,
    deletePlanDocument,
    analyzePlan,
    exportAnalyzeIssues,
    importAnalyzeFixes,
    bulkUpdateItems,
    transitionPlan,
    getWorkflowActions,
    getTransitions,
    getInvoice,
    settleInvoice,
    recordInvoiceRtgs,
    listVirements,
    createVirement,
    submitVirement,
    approveVirement,
    rejectVirement,
    deleteVirement,
    listSupplements,
    showSupplement,
    createSupplement,
    deleteSupplement,
    addSupplementItem,
    updateSupplementItem,
    deleteSupplementItem,
    supplementTransition,
    getSupplementWorkflowActions,
    startImport,
    getImport,
    getUnresolved,
    resolveLookup,
    getProcurementClasses,
    getProcurementMethods,
    getProcurementGroups,
    getSourceOfFunds,
    getUnitOfMeasures,
    getCurrencies,
  } = useAnnualprocurementplanHelper();

  const toast = useToast();

  const showError = (error, fallback) => {
    const msg = error?.value?.data?.message || error?.value?.message || fallback;
    toast.error({ title: 'Error', message: msg, position: 'topRight', layout: 2 });
  };

  const showSuccess = (title, message) => {
    toast.success({ title, message, position: 'topRight', layout: 2 });
  };

  const isDraft = (plan) => (plan?.status ?? 'DRAFT') === 'DRAFT';

  const fetchAll = async () => {
    loading.value = true;
    const { data, error } = await getPlans();
    if (!error.value) {
      items.value = data.value?.data ?? [];
    } else {
      showError(error, 'Failed to fetch annual procurement plans.');
    }
    loading.value = false;
  };

  const fetchPlan = async (uuid) => {
    currentPlanLoading.value = true;
    const { data, error } = await getPlan(uuid);
    if (!error.value) {
      currentPlan.value = data.value?.data ?? null;
    } else {
      currentPlan.value = null;
      showError(error, 'Failed to fetch annual procurement plan.');
    }
    currentPlanLoading.value = false;
    return currentPlan.value;
  };

  // Remember the latest filter set so downstream refreshes (refreshItemViews,
  // analysis fix-all, etc.) keep the totals cards in lockstep with the items
  // list without each call site needing to pass filters explicitly.
  const lastItemsOpts = ref({});

  const fetchPlanItems = async (uuid, opts = {}) => {
    lastItemsOpts.value = { ...opts };
    planItemsLoading.value = true;
    const params = {
      page: opts.page ?? planItemsMeta.value.current_page ?? 1,
      per_page: opts.per_page ?? planItemsMeta.value.per_page ?? 50,
    };
    if (opts.search) params.search = opts.search;
    // Boolean flag filters — each one is a separate query param, only
    // included when truthy so the server's filter_var read maps cleanly to
    // "show only items where this flag is Y".
    const flagKeys = [
      'pre_qualification', 'eoi', 'spoc',
      'sustainable_procurement', 'affirmative_procurement', 'procurement_exemption',
    ];
    for (const k of flagKeys) {
      if (opts[k]) params[k] = 1;
    }
    if (opts.consumption_mode) params.consumption_mode = opts.consumption_mode;
    const { data, error } = await getItems(uuid, params);
    if (!error.value) {
      const payload = data.value?.data ?? {};
      planItems.value = payload.data ?? [];
      planItemsMeta.value = {
        current_page: payload.current_page ?? 1,
        last_page: payload.last_page ?? 1,
        total: payload.total ?? 0,
        per_page: payload.per_page ?? 50,
      };
    } else {
      showError(error, 'Failed to fetch items.');
    }
    planItemsLoading.value = false;
  };

  // Build the query-string params the three totals endpoints accept. Mirrors
  // the filter shape fetchPlanItems uses so the cards always agree with the
  // visible row set.
  const totalsParams = (opts = {}) => {
    const out = {};
    if (opts.search) out.search = opts.search;
    const flagKeys = [
      'pre_qualification', 'eoi', 'spoc',
      'sustainable_procurement', 'affirmative_procurement', 'procurement_exemption',
    ];
    for (const k of flagKeys) if (opts[k]) out[k] = 1;
    if (opts.consumption_mode) out.consumption_mode = opts.consumption_mode;
    return out;
  };

  const fetchItemTotals = async (uuid, opts = {}) => {
    const { data, error } = await getItemTotals(uuid, totalsParams(opts));
    if (!error.value) itemTotals.value = data.value?.data ?? [];
  };

  const fetchItemTotalsByGroup = async (uuid, opts = {}) => {
    const { data, error } = await getItemTotalsByGroup(uuid, totalsParams(opts));
    if (!error.value) itemTotalsByGroup.value = data.value?.data ?? [];
  };

  const fetchItemTotalsByFlag = async (uuid, opts = {}) => {
    const { data, error } = await getItemTotalsByFlag(uuid, totalsParams(opts));
    if (!error.value) itemTotalsByFlag.value = data.value?.data ?? [];
  };

  const create = async (payload) => {
    const { data: response, status, error } = await createPlan(payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Plan created', res.message);
      await fetchAll();
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to create plan.');
    return false;
  };

  const update = async (uuid, payload) => {
    const { data: response, status, error } = await updatePlan(uuid, payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Plan updated', res.message);
      await fetchAll();
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to update plan.');
    return false;
  };

  const remove = async (uuid) => {
    const { data: response, status, error } = await deletePlan(uuid);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Plan deleted', res.message);
      await fetchAll();
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to delete plan.');
    return false;
  };

  // ─── Plan items ─────────────────────────────────────────────────────────
  const refreshItemViews = async (planUuid) => {
    const opts = lastItemsOpts.value ?? {};
    await Promise.all([
      fetchPlanItems(planUuid, opts),
      fetchItemTotals(planUuid, opts),
      fetchItemTotalsByGroup(planUuid, opts),
      fetchItemTotalsByFlag(planUuid, opts),
      fetchUnresolved(planUuid),
      fetchPlan(planUuid), // refresh items_count
    ]);
  };

  const addItem = async (planUuid, payload) => {
    const { data: response, status, error } = await createItem(planUuid, payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Item added', res.message);
      await refreshItemViews(planUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to add item.');
    return false;
  };

  const editItem = async (planUuid, itemId, payload) => {
    const { data: response, status, error } = await updateItem(planUuid, itemId, payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Item updated', res.message);
      await refreshItemViews(planUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to update item.');
    return false;
  };

  /**
   * Apply many item updates in a single request, then refresh derived views
   * once. Designed for the analysis fix-violations bulk save — N×6 GETs
   * collapses to 1×6, which is the difference between snappy and frozen on
   * large plans.
   */
  const bulkEditItems = async (planUuid, updates) => {
    if (!Array.isArray(updates) || updates.length === 0) {
      return { ok: true, updated: 0, errors: [] };
    }
    const { data: response, status, error } = await bulkUpdateItems(planUuid, updates);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      const updated = res.data?.updated ?? 0;
      const errors = res.data?.errors ?? [];
      if (errors.length > 0) {
        showError(
          ref({ data: { message: `${updated} updated, ${errors.length} failed.` } }),
          `${updated} updated, ${errors.length} failed.`,
        );
      } else {
        showSuccess('Items updated', `${updated} item(s) updated.`);
      }
      await refreshItemViews(planUuid);
      return { ok: true, updated, errors };
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to apply bulk updates.');
    return { ok: false, updated: 0, errors: [] };
  };

  const removeItem = async (planUuid, itemId) => {
    const { data: response, status, error } = await deleteItem(planUuid, itemId);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Item deleted', res.message);
      await refreshItemViews(planUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to delete item.');
    return false;
  };

  // ─── Disposal plan items ─────────────────────────────────────────────────
  const fetchDisposalplans = async (planUuid, opts = {}) => {
    disposalPlansLoading.value = true;
    const params = {
      page: opts.page ?? disposalPlansMeta.value.current_page ?? 1,
      per_page: opts.per_page ?? disposalPlansMeta.value.per_page ?? 50,
    };
    if (opts.search) params.search = opts.search;
    const { data, error } = await getDisposalplans(planUuid, params);
    if (!error.value) {
      const payload = data.value?.data ?? {};
      disposalPlans.value = payload.data ?? [];
      disposalPlansMeta.value = {
        current_page: payload.current_page ?? 1,
        last_page: payload.last_page ?? 1,
        total: payload.total ?? 0,
        per_page: payload.per_page ?? 50,
      };
    } else {
      showError(error, 'Failed to fetch disposal items.');
    }
    disposalPlansLoading.value = false;
  };

  const fetchDisposalreasons = async () => {
    if (disposalreasons.value.length > 0) return;
    const { data, error } = await getDisposalreasons();
    if (!error.value) disposalreasons.value = data.value?.data ?? [];
  };

  const addDisposalplan = async (planUuid, payload) => {
    const { data: response, status, error } = await createDisposalplan(planUuid, payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Disposal item added', res.message);
      await fetchDisposalplans(planUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to add disposal item.');
    return false;
  };

  const editDisposalplan = async (planUuid, disposalUuid, payload) => {
    const { data: response, status, error } = await updateDisposalplan(planUuid, disposalUuid, payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Disposal item updated', res.message);
      await fetchDisposalplans(planUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to update disposal item.');
    return false;
  };

  const removeDisposalplan = async (planUuid, disposalUuid) => {
    const { data: response, status, error } = await deleteDisposalplan(planUuid, disposalUuid);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Disposal item deleted', res.message);
      await fetchDisposalplans(planUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to delete disposal item.');
    return false;
  };

  // ─── Evaluation committee ────────────────────────────────────────────────
  const fetchCommitteeRoles = async (planUuid) => {
    const { data, error } = await getCommitteeRoles(planUuid);
    if (!error.value) committeeRoles.value = data.value?.data ?? [];
  };

  const fetchCommitteeMembers = async (planUuid, opts = {}) => {
    committeeMembersLoading.value = true;
    const params = {
      page: opts.page ?? committeeMembersMeta.value.current_page ?? 1,
      per_page: opts.per_page ?? committeeMembersMeta.value.per_page ?? 25,
    };
    if (opts.search) params.search = opts.search;
    const { data, error } = await getCommitteeMembers(planUuid, params);
    if (!error.value) {
      const payload = data.value?.data ?? {};
      committeeMembers.value = payload.data ?? [];
      committeeMembersMeta.value = {
        current_page: payload.current_page ?? 1,
        last_page: payload.last_page ?? 1,
        total: payload.total ?? 0,
        per_page: payload.per_page ?? 25,
      };
    } else {
      showError(error, 'Failed to fetch committee members.');
    }
    committeeMembersLoading.value = false;
  };

  const fetchCommitteeMember = async (planUuid, memberUuid) => {
    const { data, error } = await getCommitteeMember(planUuid, memberUuid);
    if (error.value) return null;
    currentMember.value = data.value?.data ?? null;
    return currentMember.value;
  };

  const addCommitteeMember = async (planUuid, payload) => {
    const { data: response, status, error } = await createCommitteeMember(planUuid, payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Member added', res.message);
      await fetchCommitteeMembers(planUuid, { page: 1 });
      return res.data ?? null;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to add member.');
    return null;
  };

  const editCommitteeMember = async (planUuid, memberUuid, payload) => {
    const { data: response, status, error } = await updateCommitteeMember(planUuid, memberUuid, payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Member updated', res.message);
      await fetchCommitteeMembers(planUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to update member.');
    return false;
  };

  const removeCommitteeMember = async (planUuid, memberUuid) => {
    const { data: response, status, error } = await deleteCommitteeMember(planUuid, memberUuid);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Member removed', res.message);
      await fetchCommitteeMembers(planUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to remove member.');
    return false;
  };

  const addQualification = async (planUuid, memberUuid, formData) => {
    const { data: response, status, error } = await createQualification(planUuid, memberUuid, formData);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Qualification added', res.message);
      await fetchCommitteeMember(planUuid, memberUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to add qualification.');
    return false;
  };

  const editQualification = async (planUuid, memberUuid, qualUuid, formData) => {
    const { data: response, status, error } = await updateQualification(planUuid, memberUuid, qualUuid, formData);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Qualification updated', res.message);
      await fetchCommitteeMember(planUuid, memberUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to update qualification.');
    return false;
  };

  const removeQualification = async (planUuid, memberUuid, qualUuid) => {
    const { data: response, status, error } = await deleteQualification(planUuid, memberUuid, qualUuid);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Qualification removed', res.message);
      await fetchCommitteeMember(planUuid, memberUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to remove qualification.');
    return false;
  };

  const addWorkhistoryEntry = async (planUuid, memberUuid, payload) => {
    const { data: response, status, error } = await createWorkhistory(planUuid, memberUuid, payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Work history added', res.message);
      await fetchCommitteeMember(planUuid, memberUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to add work history.');
    return false;
  };

  const editWorkhistoryEntry = async (planUuid, memberUuid, entryUuid, payload) => {
    const { data: response, status, error } = await updateWorkhistory(planUuid, memberUuid, entryUuid, payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Work history updated', res.message);
      await fetchCommitteeMember(planUuid, memberUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to update work history.');
    return false;
  };

  const removeWorkhistoryEntry = async (planUuid, memberUuid, entryUuid) => {
    const { data: response, status, error } = await deleteWorkhistory(planUuid, memberUuid, entryUuid);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Work history removed', res.message);
      await fetchCommitteeMember(planUuid, memberUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to remove work history.');
    return false;
  };

  // ─── Disposal committee ──────────────────────────────────────────────────
  const fetchDisposalCommitteeRoles = async (planUuid) => {
    const { data, error } = await getDisposalcommitteeRoles(planUuid);
    if (!error.value) disposalCommitteeRoles.value = data.value?.data ?? [];
  };

  const fetchDisposalCommitteeMembers = async (planUuid, opts = {}) => {
    disposalCommitteeMembersLoading.value = true;
    const params = {
      page: opts.page ?? disposalCommitteeMembersMeta.value.current_page ?? 1,
      per_page: opts.per_page ?? disposalCommitteeMembersMeta.value.per_page ?? 25,
    };
    if (opts.search) params.search = opts.search;
    const { data, error } = await getDisposalcommitteeMembers(planUuid, params);
    if (!error.value) {
      const payload = data.value?.data ?? {};
      disposalCommitteeMembers.value = payload.data ?? [];
      disposalCommitteeMembersMeta.value = {
        current_page: payload.current_page ?? 1,
        last_page: payload.last_page ?? 1,
        total: payload.total ?? 0,
        per_page: payload.per_page ?? 25,
      };
    } else {
      showError(error, 'Failed to fetch disposal committee members.');
    }
    disposalCommitteeMembersLoading.value = false;
  };

  const addDisposalCommitteeMember = async (planUuid, payload) => {
    const { data: response, status, error } = await createDisposalcommitteeMember(planUuid, payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Member added', res.message);
      await fetchDisposalCommitteeMembers(planUuid, { page: 1 });
      return res.data ?? null;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to add member.');
    return null;
  };

  const editDisposalCommitteeMember = async (planUuid, memberUuid, payload) => {
    const { data: response, status, error } = await updateDisposalcommitteeMember(planUuid, memberUuid, payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Member updated', res.message);
      await fetchDisposalCommitteeMembers(planUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to update member.');
    return false;
  };

  const removeDisposalCommitteeMember = async (planUuid, memberUuid) => {
    const { data: response, status, error } = await deleteDisposalcommitteeMember(planUuid, memberUuid);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Member removed', res.message);
      await fetchDisposalCommitteeMembers(planUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to remove member.');
    return false;
  };

  // ─── Plan documents (required-document uploads) ──────────────────────────
  const fetchPlanDocuments = async (planUuid) => {
    planDocumentsLoading.value = true;
    const { data, error } = await getPlanDocuments(planUuid);
    if (!error.value) {
      planDocuments.value = data.value?.data ?? [];
    } else {
      showError(error, 'Failed to fetch required documents.');
    }
    planDocumentsLoading.value = false;
  };

  const uploadDocumentForPlan = async (planUuid, documentId, file) => {
    // Two-step: upload to docman first, then send the returned URL +
    // metadata to our backend so we never push the file through Laravel.
    const { uploadFile } = useDocmanUpload();
    const docmanResult = await uploadFile(file, `annualprocurementplan-documents/${planUuid}`);
    if (!docmanResult.ok) {
      showError(
        ref({ data: { message: docmanResult.error } }),
        docmanResult.error || 'Failed to upload to document service.',
      );
      return false;
    }

    const { data: response, status, error } = await uploadPlanDocument(planUuid, documentId, docmanResult.data);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Uploaded', res.message);
      await fetchPlanDocuments(planUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to register uploaded document.');
    return false;
  };

  const runAnalysis = async (planUuid) => {
    analysisLoading.value = true;
    const { data, error } = await analyzePlan(planUuid);
    if (!error.value) {
      analysisReport.value = data.value?.data ?? null;
    } else {
      analysisReport.value = null;
      showError(error, 'Failed to analyze plan.');
    }
    analysisLoading.value = false;
    return analysisReport.value;
  };

  /**
   * Trigger an .xlsx download of the current Tier 2 violations. Saves the
   * blob using an in-DOM anchor so we don't depend on any extra deps.
   */
  const downloadIssuesExport = async (planUuid) => {
    const { data, error } = await exportAnalyzeIssues(planUuid);
    if (error.value) {
      showError(error, 'Failed to export issues.');
      return false;
    }
    const blob = data.value;
    if (!blob) return false;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-${planUuid}-tier2-issues.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return true;
  };

  /**
   * Upload a filled-in issues file; the server applies fixes through
   * bulkUpdateItems and returns { updated, errors, parse_errors }.
   * Refreshes the analysis + items views on success.
   */
  const uploadIssuesFixes = async (planUuid, file) => {
    const { data: response, status, error } = await importAnalyzeFixes(planUuid, file);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      const updated = res.data?.updated ?? 0;
      const fixErrors = (res.data?.errors ?? []).length;
      const parseErrors = (res.data?.parse_errors ?? []).length;
      if (fixErrors > 0 || parseErrors > 0) {
        showError(
          ref({ data: { message: `${updated} fix(es) applied · ${fixErrors + parseErrors} row(s) failed.` } }),
          `${updated} fix(es) applied · ${fixErrors + parseErrors} row(s) failed.`,
        );
      } else {
        showSuccess('Fixes applied', `${updated} fix(es) applied.`);
      }
      await refreshItemViews(planUuid);
      await runAnalysis(planUuid);
      return { ok: true, ...res.data };
    }
    // Surface the actual server message so the page can show it instead of
    // a generic "could not be processed" fallback. The API uses
    // ApiResponse::error which puts the human-readable reason at
    // `error.value.data.message` and the parse errors at `error.value.data.data.parse_errors`.
    const serverMessage = error?.value?.data?.message
      || res?.message
      || 'Failed to upload fixes.';
    const parseErrors = error?.value?.data?.data?.parse_errors
      || res?.data?.parse_errors
      || [];
    showError(error || ref({ data: { message: serverMessage } }), serverMessage);
    return { ok: false, message: serverMessage, parse_errors: parseErrors };
  };

  const fetchPlanInvoice = async (planUuid) => {
    invoiceLoading.value = true;
    const { data, error } = await getInvoice(planUuid);
    if (!error.value) planInvoice.value = data.value?.data ?? null;
    invoiceLoading.value = false;
  };

  const fetchVirements = async (planUuid, page = 1, status = '') => {
    virementsLoading.value = true;
    const { data, error } = await listVirements(planUuid, { page, per_page: virementsMeta.value.per_page, status: status || undefined });
    if (!error.value) {
      const payload = data.value?.data ?? {};
      virements.value = payload.data ?? [];
      virementsMeta.value = {
        current_page: payload.current_page ?? 1,
        last_page: payload.last_page ?? 1,
        total: payload.total ?? 0,
        per_page: payload.per_page ?? virementsMeta.value.per_page,
      };
    }
    virementsLoading.value = false;
  };

  const addVirement = async (planUuid, payload) => {
    const { data: response, status, error } = await createVirement(planUuid, payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Virement saved', res.message);
      await fetchVirements(planUuid);
      return res.data ?? true;
    }
    showError(error || ref({ data: { message: res?.message } }), res?.message || 'Failed to create virement.');
    return false;
  };

  const submitDraftVirement = async (planUuid, uuid) => {
    const { data: response, status, error } = await submitVirement(planUuid, uuid);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Submitted', res.message);
      await Promise.all([fetchVirements(planUuid), fetchPlanItems(planUuid, { page: planItemsMeta.value.current_page })]);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), res?.message || 'Failed to submit virement.');
    return false;
  };

  const decideVirement = async (planUuid, uuid, decision, comment) => {
    const fn = decision === 'approve' ? approveVirement : rejectVirement;
    const { data: response, status, error } = await fn(planUuid, uuid, comment);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess(decision === 'approve' ? 'Approved' : 'Rejected', res.message);
      await Promise.all([fetchVirements(planUuid), fetchPlanItems(planUuid, { page: planItemsMeta.value.current_page })]);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), res?.message || 'Failed to decide virement.');
    return false;
  };

  const removeDraftVirement = async (planUuid, uuid) => {
    const { data: response, status, error } = await deleteVirement(planUuid, uuid);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Deleted', res.message);
      await fetchVirements(planUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), res?.message || 'Failed to delete virement.');
    return false;
  };

  const fetchSupplements = async (planUuid, page = 1, status = '') => {
    supplementsLoading.value = true;
    const { data, error } = await listSupplements(planUuid, { page, per_page: supplementsMeta.value.per_page, status: status || undefined });
    if (!error.value) {
      const payload = data.value?.data ?? {};
      supplements.value = payload.data ?? [];
      supplementsMeta.value = {
        current_page: payload.current_page ?? 1,
        last_page: payload.last_page ?? 1,
        total: payload.total ?? 0,
        per_page: payload.per_page ?? supplementsMeta.value.per_page,
      };
    }
    supplementsLoading.value = false;
  };

  const fetchSupplement = async (planUuid, uuid) => {
    const { data, error } = await showSupplement(planUuid, uuid);
    if (!error.value) currentSupplement.value = data.value?.data ?? null;
    // Refresh available actions in tandem.
    const { data: actData } = await getSupplementWorkflowActions(planUuid, uuid);
    if (actData.value?.data) {
      supplementWorkflowActions.value = actData.value.data.actions ?? [];
      supplementIsCreator.value = !!actData.value.data.is_creator;
    }
    return currentSupplement.value;
  };

  const addSupplement = async (planUuid, payload) => {
    const { data: response, status, error } = await createSupplement(planUuid, payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Supplement created', res.message);
      await fetchSupplements(planUuid);
      return res.data ?? true;
    }
    showError(error || ref({ data: { message: res?.message } }), res?.message || 'Failed to create supplement.');
    return false;
  };

  const removeSupplement = async (planUuid, uuid) => {
    const { data: response, status, error } = await deleteSupplement(planUuid, uuid);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Deleted', res.message);
      await fetchSupplements(planUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), res?.message || 'Failed to delete supplement.');
    return false;
  };

  const addSupplementItemAction = async (planUuid, uuid, payload) => {
    const { data: response, status, error } = await addSupplementItem(planUuid, uuid, payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Item added', res.message);
      await fetchSupplement(planUuid, uuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), res?.message || 'Failed to add item.');
    return false;
  };

  const updateSupplementItemAction = async (planUuid, uuid, itemId, payload) => {
    const { data: response, status, error } = await updateSupplementItem(planUuid, uuid, itemId, payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Item updated', res.message);
      await fetchSupplement(planUuid, uuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), res?.message || 'Failed to update item.');
    return false;
  };

  const deleteSupplementItemAction = async (planUuid, uuid, itemId) => {
    const { data: response, status, error } = await deleteSupplementItem(planUuid, uuid, itemId);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Item removed', res.message);
      await fetchSupplement(planUuid, uuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), res?.message || 'Failed to remove item.');
    return false;
  };

  const runSupplementTransition = async (planUuid, uuid, action, comment = null, extra = {}) => {
    const { data: response, status, error } = await supplementTransition(planUuid, uuid, { action, comment, ...extra });
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Done', res.message);
      await Promise.all([fetchSupplement(planUuid, uuid), fetchSupplements(planUuid)]);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), res?.message || 'Failed to perform action.');
    return false;
  };

  const submitInvoiceRtgs = async (planUuid, payload) => {
    invoiceSettling.value = true;
    const { data: response, status, error } = await recordInvoiceRtgs(planUuid, payload);
    invoiceSettling.value = false;
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Payment submitted', res.message || 'Awaiting verification.');
      await fetchPlanInvoice(planUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), res?.message || 'Failed to submit payment.');
    return false;
  };

  const settlePlanInvoice = async (planUuid) => {
    invoiceSettling.value = true;
    const { data: response, status, error } = await settleInvoice(planUuid);
    invoiceSettling.value = false;
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Settlement', res.message);
      await Promise.all([fetchPlanInvoice(planUuid), fetchPlan(planUuid)]);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), res?.message || 'Settlement failed.');
    return false;
  };

  const fetchWorkflowActions = async (planUuid) => {
    const { data, error } = await getWorkflowActions(planUuid);
    if (!error.value) {
      const payload = data.value?.data ?? {};
      workflowActions.value = payload.actions ?? [];
      workflowIsCreator.value = !!payload.is_creator;
    }
  };

  const fetchTransitions = async (planUuid) => {
    const { data, error } = await getTransitions(planUuid);
    if (!error.value) transitions.value = data.value?.data ?? [];
  };

  const runTransition = async (planUuid, action, comment = null) => {
    const { data: response, status, error } = await transitionPlan(planUuid, { action, comment });
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Transition complete', res.message);
      await Promise.all([
        fetchPlan(planUuid),
        fetchWorkflowActions(planUuid),
        fetchTransitions(planUuid),
      ]);
      if (res.data?.report) analysisReport.value = res.data.report;
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), res?.message || 'Failed to perform transition.');
    return false;
  };

  const removePlanDocument = async (planUuid, docUuid) => {
    const { data: response, status, error } = await deletePlanDocument(planUuid, docUuid);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Removed', res.message);
      await fetchPlanDocuments(planUuid);
      return true;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to remove document.');
    return false;
  };

  const importDisposalplansFile = async (planUuid, file) => {
    const { data: response, status, error } = await importDisposalplans(planUuid, file);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Disposal items imported', res.message);
      await fetchDisposalplans(planUuid, { page: 1 });
      return res.data ?? null;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to import disposal items.');
    return null;
  };

  // ─── Imports ────────────────────────────────────────────────────────────
  const beginImport = async (planUuid, file) => {
    const { data: response, status, error } = await startImport(planUuid, file);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      return res.data ?? null;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to start import.');
    return null;
  };

  const fetchImport = async (planUuid, importUuid) => {
    const { data, error } = await getImport(planUuid, importUuid);
    if (error.value) return null;
    return data.value?.data ?? null;
  };

  const fetchUnresolved = async (planUuid) => {
    const { data, error } = await getUnresolved(planUuid);
    if (error.value) {
      unresolvedSummary.value = [];
      return [];
    }
    const list = data.value?.data ?? [];
    unresolvedSummary.value = list;
    return list;
  };

  const applyResolveLookup = async (planUuid, payload) => {
    const { data: response, status, error } = await resolveLookup(planUuid, payload);
    const res = response?.value;
    if (status?.value && res?.status === true) {
      showSuccess('Resolved', res.message);
      await refreshItemViews(planUuid);
      return res.data?.updated ?? 0;
    }
    showError(error || ref({ data: { message: res?.message } }), 'Failed to resolve.');
    return 0;
  };

  // ─── Lookups ────────────────────────────────────────────────────────────
  const fetchProcurementClasses = async () => {
    if (procurementclasses.value.length > 0) return;
    const { data, error } = await getProcurementClasses();
    if (!error.value) procurementclasses.value = data.value?.data ?? [];
  };

  const fetchCurrencies = async () => {
    if (currencies.value.length > 0) return;
    const { data, error } = await getCurrencies();
    if (!error.value) currencies.value = data.value?.data ?? [];
  };

  const fetchItemLookups = async () => {
    if (procurementclasses.value.length === 0) {
      const { data, error } = await getProcurementClasses();
      if (!error.value) procurementclasses.value = data.value?.data ?? [];
    }
    if (procurementmethods.value.length === 0) {
      const { data, error } = await getProcurementMethods();
      if (!error.value) procurementmethods.value = data.value?.data ?? [];
    }
    if (procurementgroups.value.length === 0) {
      const { data, error } = await getProcurementGroups();
      if (!error.value) procurementgroups.value = data.value?.data ?? [];
    }
    if (sourceoffunds.value.length === 0) {
      const { data, error } = await getSourceOfFunds();
      if (!error.value) sourceoffunds.value = data.value?.data ?? [];
    }
    if (unitofmeasures.value.length === 0) {
      const { data, error } = await getUnitOfMeasures();
      if (!error.value) unitofmeasures.value = data.value?.data ?? [];
    }
  };

  return {
    items,
    loading,
    currentPlan,
    currentPlanLoading,
    planItems,
    planItemsMeta,
    planItemsLoading,
    itemTotals,
    itemTotalsByGroup,
    itemTotalsByFlag,
    unresolvedSummary,
    disposalPlans,
    disposalPlansMeta,
    disposalPlansLoading,
    disposalreasons,
    committeeMembers,
    committeeMembersMeta,
    committeeMembersLoading,
    currentMember,
    committeeRoles,
    disposalCommitteeMembers,
    disposalCommitteeMembersMeta,
    disposalCommitteeMembersLoading,
    disposalCommitteeRoles,
    planDocuments,
    planDocumentsLoading,
    analysisReport,
    analysisLoading,
    planInvoice,
    invoiceLoading,
    invoiceSettling,
    virements,
    virementsMeta,
    virementsLoading,
    supplements,
    supplementsMeta,
    supplementsLoading,
    currentSupplement,
    supplementWorkflowActions,
    supplementIsCreator,
    workflowActions,
    workflowIsCreator,
    transitions,
    procurementclasses,
    procurementmethods,
    procurementgroups,
    sourceoffunds,
    unitofmeasures,
    currencies,
    isDraft,
    fetchAll,
    fetchPlan,
    fetchPlanItems,
    fetchItemTotals,
    fetchItemTotalsByGroup,
    fetchItemTotalsByFlag,
    fetchProcurementClasses,
    fetchCurrencies,
    fetchItemLookups,
    create,
    update,
    remove,
    addItem,
    editItem,
    bulkEditItems,
    removeItem,
    fetchDisposalplans,
    fetchDisposalreasons,
    addDisposalplan,
    editDisposalplan,
    removeDisposalplan,
    importDisposalplansFile,
    fetchCommitteeRoles,
    fetchCommitteeMembers,
    fetchCommitteeMember,
    addCommitteeMember,
    editCommitteeMember,
    removeCommitteeMember,
    addQualification,
    editQualification,
    removeQualification,
    addWorkhistoryEntry,
    editWorkhistoryEntry,
    removeWorkhistoryEntry,
    fetchDisposalCommitteeRoles,
    fetchDisposalCommitteeMembers,
    addDisposalCommitteeMember,
    editDisposalCommitteeMember,
    removeDisposalCommitteeMember,
    fetchPlanDocuments,
    uploadDocumentForPlan,
    removePlanDocument,
    runAnalysis,
    downloadIssuesExport,
    uploadIssuesFixes,
    fetchPlanInvoice,
    settlePlanInvoice,
    submitInvoiceRtgs,
    fetchVirements,
    addVirement,
    submitDraftVirement,
    decideVirement,
    removeDraftVirement,
    fetchSupplements,
    fetchSupplement,
    addSupplement,
    removeSupplement,
    addSupplementItemAction,
    updateSupplementItemAction,
    deleteSupplementItemAction,
    runSupplementTransition,
    fetchWorkflowActions,
    fetchTransitions,
    runTransition,
    beginImport,
    fetchImport,
    fetchUnresolved,
    applyResolveLookup,
  };
});

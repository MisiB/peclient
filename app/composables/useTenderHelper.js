import { usePeClient } from './usePeClient'

export const useTenderHelper = () => {
  const client = usePeClient()

  const buildTenderListParams = ({
    year,
    page,
    perPage,
    status,
    procurementmethod_id,
    app_status,
    search,
  } = {}) => {
    const params = new URLSearchParams()
    if (year != null && year !== '') params.set('year', String(year))
    if (page != null) params.set('page', String(page))
    if (perPage != null) params.set('per_page', String(perPage))
    if (status) params.set('status', String(status))
    if (procurementmethod_id) params.set('procurementmethod_id', String(procurementmethod_id))
    if (app_status) params.set('app_status', String(app_status))
    if (search) params.set('search', String(search).trim())
    return params
  }

  const getTenderSummary = async (filters = {}) => {
    try {
      const params = buildTenderListParams(filters)
      const qs = params.toString()
      const data = await client(`/api/v1/me/tenders/summary${qs ? `?${qs}` : ''}`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getTenders = async (filters = {}) => {
    try {
      const { page = 1, perPage = 20, ...rest } = filters
      const params = buildTenderListParams({ ...rest, page, perPage })

      const data = await client(`/api/v1/me/tenders?${params.toString()}`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getTender = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const createTender = async (payload) => {
    try {
      const data = await client('/api/v1/me/tenders', { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const updateTender = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}`, { method: 'PUT', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const deleteTender = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}`, { method: 'DELETE' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getBidOpeningTypes = async () => {
    try {
      const data = await client('/api/v1/bid-opening-types/list', { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getBidValidityPeriodFees = async () => {
    try {
      const data = await client('/api/v1/bid-validity-period-fees/list', { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getSupplierCategories = async () => {
    try {
      const data = await client('/api/v1/supplier-categories/list', { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getTenderAddenda = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/addenda`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getTenderAddendum = async (uuid, addendumUuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/addenda/${addendumUuid}`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const createTenderAddendum = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/addenda`, { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const updateTenderAddendum = async (uuid, addendumUuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/addenda/${addendumUuid}`, { method: 'PUT', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const deleteTenderAddendum = async (uuid, addendumUuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/addenda/${addendumUuid}`, { method: 'DELETE' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getAddendumWorkflowActions = async (uuid, addendumUuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/addenda/${addendumUuid}/workflow-actions`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const transitionAddendum = async (uuid, addendumUuid, action, comment = null) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/addenda/${addendumUuid}/transition`, {
        method: 'POST',
        body: { action, comment },
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const downloadAddendumAttachment = async (uuid, addendumUuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/addenda/${addendumUuid}/attachment`, { method: 'GET' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const suggestProductSpecifications = async (uuid, itemId, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items/${itemId}/products/suggest-specifications`, {
        method: 'POST',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  /** Evaluation criteria linked to the procurement group (pivot `procurementgroup_evaluationcriteria`). */
  const getEvaluationCriteriaForProcurementGroup = async (groupId) => {
    if (!groupId) {
      return { data: ref({ data: [] }), error: ref(null) }
    }
    try {
      const data = await client(`/api/v1/procurement-groups/${groupId}/evaluation-criteria`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getTenderItems = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getEligibleAppItems = async (uuid, params = {}) => {
    try {
      const qs = new URLSearchParams()
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v)
      }
      const query = qs.toString()
      const data = await client(
        `/api/v1/me/tenders/${uuid}/eligible-app-items${query ? `?${query}` : ''}`,
        { method: 'GET' },
      )
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  // Eligible APP items split into consolidated groups (rows sharing a
  // reference_no) and standalone individual rows. Same params as
  // getEligibleAppItems.
  const getEligibleAppItemsGrouped = async (uuid, params = {}) => {
    try {
      const qs = new URLSearchParams()
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v)
      }
      const query = qs.toString()
      const data = await client(
        `/api/v1/me/tenders/${uuid}/eligible-app-items/grouped${query ? `?${query}` : ''}`,
        { method: 'GET' },
      )
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const createTenderItem = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items`, { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  // Add several APP line items in one request — each becomes its own tender
  // line. Used when a consolidated group's children are multi-selected.
  const createTenderItemsBulk = async (uuid, ids) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items/bulk`, {
        method: 'POST',
        body: { annualprocurementplanitem_ids: ids },
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const updateTenderItem = async (uuid, itemId, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items/${itemId}`, { method: 'PUT', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const deleteTenderItem = async (uuid, itemId) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items/${itemId}`, { method: 'DELETE' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const createTenderItemProduct = async (uuid, itemId, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items/${itemId}/products`, {
        method: 'POST',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const updateTenderItemProduct = async (uuid, itemId, productId, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items/${itemId}/products/${productId}`, {
        method: 'PUT',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const deleteTenderItemProduct = async (uuid, itemId, productId) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/items/${itemId}/products/${productId}`, {
        method: 'DELETE',
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderDocumentRequirements = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/document-requirements`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const syncTenderDocumentRequirements = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/document-requirements`, {
        method: 'PUT',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderEligibilityQuestions = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/eligibility-questions`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const syncTenderEligibilityQuestions = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/eligibility-questions`, {
        method: 'PUT',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const suggestTenderEligibilityQuestions = async (uuid, payload = {}) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/eligibility-questions/suggest`, {
        method: 'POST',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderTechnicalEligibilityQuestions = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/technical-eligibility-questions`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const syncTenderTechnicalEligibilityQuestions = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/technical-eligibility-questions`, {
        method: 'PUT',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const suggestTenderTechnicalEligibilityQuestions = async (uuid, payload = {}) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/technical-eligibility-questions/suggest`, {
        method: 'POST',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderFinancialTemplate = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/financial-template`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const acknowledgeTenderFinancialTemplate = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/financial-template/acknowledge`, {
        method: 'PUT',
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderDates = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/tender-dates`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const syncTenderDates = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/tender-dates`, {
        method: 'PUT',
        body: payload,
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderSbd = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/sbd`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const syncTenderSbd = async (uuid, payload) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/sbd`, { method: 'PUT', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const previewTenderSbd = async (uuid, payload = {}) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/sbd/preview`, { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getSbdSectionLibrary = async () => {
    try {
      const data = await client('/api/v1/me/sbd-sections', { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const saveSbdSection = async (payload) => {
    try {
      const data = await client('/api/v1/me/sbd-sections', { method: 'POST', body: payload })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const deleteSbdSection = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/sbd-sections/${uuid}`, { method: 'DELETE' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const autofillTenderSbd = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/sbd/autofill`, { method: 'POST' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const generateTenderSbd = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/sbd/generate`, { method: 'POST' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const downloadTenderSbd = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/sbd/download`, { method: 'GET' })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderComplianceAnalysis = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/compliance-analysis`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const runTenderComplianceAnalysis = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/compliance-analysis/run`, {
        method: 'POST',
        body: { use_ai: true, include_rag: true, async: true },
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderFees = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/fees`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const saveTenderBidBond = async (uuid, amount) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/bid-bond`, {
        method: 'PUT',
        body: { bid_bond_amount: amount },
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  const getTenderWorkflowActions = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/workflow-actions`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const getTenderTransitions = async (uuid) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/transitions`, { method: 'GET' })
      return { data: ref(data), error: ref(null) }
    } catch (err) {
      return { data: ref(null), error: ref(err) }
    }
  }

  const transitionTender = async (uuid, action, comment = null) => {
    try {
      const data = await client(`/api/v1/me/tenders/${uuid}/transition`, {
        method: 'POST',
        body: { action, comment },
      })
      return { data: ref(data), status: ref(true), error: ref(null) }
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) }
    }
  }

  return {
    buildTenderListParams,
    getTenderSummary,
    getTenders,
    getTender,
    createTender,
    updateTender,
    deleteTender,
    getBidOpeningTypes,
    getBidValidityPeriodFees,
    getSupplierCategories,
    suggestProductSpecifications,
    getTenderAddenda,
    getTenderAddendum,
    createTenderAddendum,
    updateTenderAddendum,
    deleteTenderAddendum,
    getAddendumWorkflowActions,
    transitionAddendum,
    downloadAddendumAttachment,
    getEvaluationCriteriaForProcurementGroup,
    getTenderItems,
    getEligibleAppItems,
    getEligibleAppItemsGrouped,
    createTenderItem,
    createTenderItemsBulk,
    updateTenderItem,
    deleteTenderItem,
    createTenderItemProduct,
    updateTenderItemProduct,
    deleteTenderItemProduct,
    getTenderDocumentRequirements,
    syncTenderDocumentRequirements,
    getTenderEligibilityQuestions,
    syncTenderEligibilityQuestions,
    suggestTenderEligibilityQuestions,
    getTenderTechnicalEligibilityQuestions,
    syncTenderTechnicalEligibilityQuestions,
    suggestTenderTechnicalEligibilityQuestions,
    getTenderFinancialTemplate,
    acknowledgeTenderFinancialTemplate,
    getTenderDates,
    syncTenderDates,
    getTenderSbd,
    syncTenderSbd,
    previewTenderSbd,
    getSbdSectionLibrary,
    saveSbdSection,
    deleteSbdSection,
    autofillTenderSbd,
    generateTenderSbd,
    downloadTenderSbd,
    getTenderComplianceAnalysis,
    runTenderComplianceAnalysis,
    getTenderFees,
    saveTenderBidBond,
    getTenderWorkflowActions,
    getTenderTransitions,
    transitionTender,
  }
}


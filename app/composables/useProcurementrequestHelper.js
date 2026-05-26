export const useProcurementrequestHelper = () => {
  const client = usePeClient();
  const base = '/api/v1/procurement-requests';

  const list = async () => {
    try {
      const data = await client(base, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const get = async (uuid) => {
    try {
      const data = await client(`${base}/${uuid}`, { method: 'GET' });
      return { data: ref(data), error: ref(null) };
    } catch (err) {
      return { data: ref(null), error: ref(err) };
    }
  };

  const create = async (payload) => {
    try {
      const data = await client(base, { method: 'POST', body: payload });
      return { data: ref(data), status: ref(true), error: ref(null) };
    } catch (err) {
      return { data: ref(null), status: ref(false), error: ref(err) };
    }
  };

  // Lookups (reuse existing list endpoints from APP module).
  const listProcurementClasses = async () => {
    try { return { data: ref(await client('/api/v1/procurement-classes/list', { method: 'GET' })), error: ref(null) }; }
    catch (err) { return { data: ref(null), error: ref(err) }; }
  };
  const listProcurementGroups = async () => {
    try { return { data: ref(await client('/api/v1/procurement-groups/list', { method: 'GET' })), error: ref(null) }; }
    catch (err) { return { data: ref(null), error: ref(err) }; }
  };
  const listProcurementMethods = async () => {
    try { return { data: ref(await client('/api/v1/procurement-methods/list', { method: 'GET' })), error: ref(null) }; }
    catch (err) { return { data: ref(null), error: ref(err) }; }
  };
  const listUnitOfMeasures = async () => {
    try { return { data: ref(await client('/api/v1/unit-of-measures/list', { method: 'GET' })), error: ref(null) }; }
    catch (err) { return { data: ref(null), error: ref(err) }; }
  };
  const listEvaluationCriteria = async () => {
    try { return { data: ref(await client('/api/v1/evaluation-criteria/list', { method: 'GET' })), error: ref(null) }; }
    catch (err) { return { data: ref(null), error: ref(err) }; }
  };
  const listSupplierCategories = async () => {
    try { return { data: ref(await client('/api/v1/supplier-categories', { method: 'GET' })), error: ref(null) }; }
    catch (err) { return { data: ref(null), error: ref(err) }; }
  };

  return {
    list, get, create,
    listProcurementClasses, listProcurementGroups, listProcurementMethods,
    listUnitOfMeasures, listEvaluationCriteria, listSupplierCategories,
  };
};

export const useConsultancyEoiEvaluation = () => {
  const client = usePeClient()

  const request = async (url, options = {}, fallback = 'The EOI evaluation request failed.') => {
    try {
      return { ok: true, data: await client(url, options), error: null }
    } catch (error) {
      const validationErrors = error?.data?.errors ?? error?.response?._data?.errors
      const message = validationErrors
        ? Object.values(validationErrors).flat().join(' ')
        : error?.data?.message ?? error?.response?._data?.message ?? error?.message ?? fallback

      return { ok: false, data: null, error: message }
    }
  }

  const endpoint = uuid => `/api/v1/me/tenders/${uuid}/consultancy-eoi/evaluation`

  return {
    getWorkspace: uuid => request(endpoint(uuid), { method: 'GET' }, 'Could not load the EOI evaluation workspace.'),
    initialize: uuid => request(`${endpoint(uuid)}/initialize`, { method: 'POST' }, 'Could not initialize the EOI evaluation.'),
    appointCommittee: (uuid, members) => request(`${endpoint(uuid)}/committee`, { method: 'PUT', body: { members } }, 'Could not appoint the EOI evaluation committee.'),
    declareConflict: (uuid, payload) => request(`${endpoint(uuid)}/conflict`, { method: 'PUT', body: payload }, 'Could not save the conflict declaration.'),
    submitScores: (uuid, submissions) => request(`${endpoint(uuid)}/scores`, { method: 'PUT', body: { submissions } }, 'Could not save the individual evaluation.'),
    recordConsensus: (uuid, payload) => request(`${endpoint(uuid)}/consensus`, { method: 'POST', body: payload }, 'Could not record the committee consensus.'),
  }
}

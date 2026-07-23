import * as yup from 'yup'

/** Stored on procurement requests; keep in sync with API `ProcurementRequestRequest`. */
export const TENDER_PRIORITY_CODES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export const TENDER_PRIORITY_OPTIONS = [
  { value: null, label: 'Not specified' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

export const TenderStep1Schema = yup.object({
  title: yup.string().required('Title is required').max(255),
  description: yup.string().nullable(),
  projectname: yup.string().nullable().max(255),
  user_requisition_date: yup.date().nullable(),
  delivery: yup.string().nullable().max(255),
  priority: yup
    .string()
    .nullable()
    .transform((v) => (v === '' || v === undefined ? null : v))
    .oneOf([null, ...TENDER_PRIORITY_CODES], 'Select a valid priority'),
  procurementgroup_id: yup.number().nullable(),
  procurementmethod_id: yup.number().required('Procurement method is required'),
  expensecategory: yup.string().oneOf(['CapEx', 'MOOE']).required('Expense category is required'),
  bidopeningtype_id: yup.number().nullable(),
  contracttype: yup.string().oneOf(['AWARD', 'FRAMEWORK']).required('Contract type is required'),
  item_selection_mode: yup.string().oneOf(['MULTIPLE', 'SINGLE']).required('LOT type is required'),
  response_mode: yup.string().oneOf(['MULTIPLE', 'SINGLE']).required('Response mode is required'),
  response_rules: yup.string().oneOf(['ALL ITEMS', 'SELECTED']).required('Response rules is required'),
  tendernumber: yup.string().nullable().max(100),
  allowed_participants: yup.string().oneOf(['Domestic', 'International']).required('Allowed participants is required'),
  required_bid_bond: yup.string().nullable().oneOf(['Y', 'N'], 'Select whether you require a bid bond'),
  bid_validity_period: yup.number().nullable().oneOf([30, 60, 90, 120], 'Select a valid bid validity period'),
  evaluationcriterion_id: yup.number().nullable(),
  supplier_category_ids: yup.array().of(yup.number()).default([]),
}).test('bid-security', function (value) {
  const { methodAllowsBidBond } = this.options.context ?? {}
  if (!methodAllowsBidBond) {
    return true
  }
  if (!value?.required_bid_bond) {
    return this.createError({
      path: 'required_bid_bond',
      message: 'Select whether you require a bid bond for this tender',
    })
  }
  if (value.required_bid_bond === 'Y' && value.bid_validity_period == null) {
    return this.createError({
      path: 'bid_validity_period',
      message: 'Bid validity period is required when you require a bid bond',
    })
  }
  return true
})


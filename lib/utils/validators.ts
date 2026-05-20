import { z } from 'zod'

export const uuidSchema = z.string().uuid('Must be a valid UUID')

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')

export const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Must be HH:MM (24-hour)')

export const nicSchema = z
  .string()
  .regex(/^[0-9]{9}[vVxX]$|^[0-9]{12}$/, 'Invalid Sri Lankan NIC')

export const phoneSchema = z
  .string()
  .regex(/^[0-9+\-\s()]+$/, 'Invalid phone number')
  .optional()
  .or(z.literal(''))

export const positiveDecimal = z
  .number({ error: 'Must be a number' })
  .positive('Must be greater than 0')

export const nonNegativeDecimal = z
  .number({ error: 'Must be a number' })
  .min(0, 'Cannot be negative')

export const loginSchema = z.object({
  station_code: z.string().min(1, 'Station code is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const staffSchema = z.object({
  employee_no: z.string().min(1, 'Employee number is required').max(255),
  name: z.string().min(1, 'Name is required').max(255),
  phone: phoneSchema,
  nic: nicSchema.optional().or(z.literal('')),
  address: z.string().max(255).optional().or(z.literal('')),
  operational_role_id: uuidSchema,
  basic_salary: nonNegativeDecimal.optional(),
  shift_rate: nonNegativeDecimal.optional(),
  ot_rate: nonNegativeDecimal.optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

export const productSchema = z.object({
  product_code: z.string().min(1, 'Product code is required').max(255),
  product_name: z.string().min(1, 'Product name is required').max(255),
  category: z.enum(['FUEL', 'GAS', 'LUBRICANT']),
  measurement_unit_id: uuidSchema,
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

export const productPriceSchema = z.object({
  selling_price: positiveDecimal,
  cost_price: nonNegativeDecimal.optional(),
  effective_from: z.string().min(1, 'Effective from is required'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
})

export const shiftTemplateSchema = z.object({
  shift_name: z.string().min(1, 'Shift name is required').max(255),
  start_time: timeSchema,
  end_time: timeSchema,
  sequence_no: z.number().int().positive(),
  is_night_shift: z.boolean().default(false),
})

export const shiftSessionSchema = z.object({
  shift_template_id: uuidSchema,
  business_date: dateSchema,
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type StaffFormValues = z.infer<typeof staffSchema>
export type ProductFormValues = z.infer<typeof productSchema>
export type ProductPriceFormValues = z.infer<typeof productPriceSchema>
export type ShiftTemplateFormValues = z.infer<typeof shiftTemplateSchema>
export type ShiftSessionFormValues = z.infer<typeof shiftSessionSchema>

// ─── Pagination ──────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number
  limit: number
  total: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface ListQuery {
  page?: number
  limit?: number
  search?: string
  status?: string
  date_from?: string
  date_to?: string
  sort_by?: string
  sort_order?: 'ASC' | 'DESC'
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export type PortalRole = 'ADMIN' | 'OWNER'

export interface PortalUser {
  id: string
  email: string
  name: string
  portal_role: PortalRole
  tenant_id: string
  tenant?: Tenant
}

export interface LoginPayload {
  station_code: string
  email: string
  password: string
}

// Backward-compat
export type AuthUser = PortalUser

// ─── Tenants ──────────────────────────────────────────────────────────────────

export type TenantStatus = 'ACTIVE' | 'INACTIVE'

export interface Tenant {
  id: string
  station_code: string
  station_name: string
  owner_name?: string
  address?: string
  district?: string
  contact_number?: string
  email?: string
  status: TenantStatus
  created_at: string
  updated_at: string
}

export interface TenantSettings {
  salary_deduction_enabled: boolean
  cash_shortfall_requires_approval: boolean
  night_shift_enabled: boolean
  night_stock_verification_required: boolean
  allow_shift_overlap: boolean
  currency: string
  timezone: string
  cpc_report_format: string
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export type StaffStatus = 'ACTIVE' | 'INACTIVE'
export type OperationalRoleName = 'MANAGER' | 'PUMPER' | 'ACCOUNTANT'

export interface OperationalRole {
  id: string
  name: string               // primary field returned by API
  role_name?: OperationalRoleName  // kept for compat
  requires_attendance: boolean
  liable_for_cash_shortfall: boolean
  description?: string
  status: StaffStatus
}

export interface Staff {
  id: string
  employee_no: string
  name: string
  phone?: string
  nic?: string
  address?: string
  operational_role_id: string
  operational_role?: OperationalRole
  basic_salary?: number
  shift_rate?: number
  ot_rate?: number
  tenant_id: string
  status: StaffStatus
  deleted_at?: string
  created_at: string
  updated_at: string
}

// Backward-compat
export type StaffProfile = Staff

// ─── Products ─────────────────────────────────────────────────────────────────

export type ProductCategory = 'FUEL' | 'GAS' | 'LUBRICANT'
export type ProductStatus = 'ACTIVE' | 'INACTIVE'
export type MeasurementUnit = 'LITRE' | 'UNIT'

export interface Product {
  id: string
  product_code: string
  product_name: string
  category: ProductCategory
  measurement_unit_id?: string
  is_fuel?: boolean
  is_gas?: boolean
  is_lubricant?: boolean
  current_price?: number
  status: ProductStatus
}

export interface ProductPrice {
  id: string
  product_id: string
  selling_price: number
  cost_price?: number
  effective_from: string
  effective_to?: string
  status: ProductStatus
}

// ─── Shifts ───────────────────────────────────────────────────────────────────

export type ShiftSessionStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'CANCELLED'

export interface ShiftTemplate {
  id: string
  shift_name: string
  start_time: string
  end_time: string
  is_night_shift: boolean
  sequence_no: number
  status: ProductStatus
}

export interface ShiftSession {
  id: string
  shift_template_id: string
  shift_template?: ShiftTemplate
  business_date: string
  status: ShiftSessionStatus
  opened_at?: string
  closed_at?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface PumperAssignment {
  pumper_id: string
  pump_id: string
  nozzle_id: string
}

export interface MeterReading {
  id: string
  shift_session_id: string
  pump_id: string
  nozzle_id: string
  opening_reading: number
  closing_reading?: number
  is_rollover: boolean
  meter_capacity: number
  dispensed_litres?: number
}

export interface CashSubmission {
  id: string
  shift_session_id: string
  pumper_id: string
  actual_cash: number
  expected_cash?: number
  shortfall?: number
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface AttendanceRecord {
  id: string
  shift_session_id: string
  staff_id: string
  staff?: Staff
  clock_in_at?: string
  clock_out_at?: string
}

// ─── Pumps ────────────────────────────────────────────────────────────────────

export interface Nozzle {
  id: string
  pump_id: string
  nozzle_code: string
  nozzle_name: string
  product_id: string
  product?: Product
  meter_capacity: number
  status: ProductStatus
}

export interface Pump {
  id: string
  pump_code: string
  pump_name: string
  status: ProductStatus
  nozzles?: Nozzle[]
}

// Backward-compat
export type PumpNozzle = Nozzle

// ─── Inventory ────────────────────────────────────────────────────────────────

export interface StockBalance {
  id: string
  product_id: string
  product?: Product
  quantity_on_hand: number
  updated_at: string
}

export interface StockMovement {
  id: string
  product_id: string
  product?: Product
  movement_type: string
  quantity_in: number
  quantity_out: number
  balance_after: number
  reference_type?: string
  reference_id?: string
  created_at: string
}

export interface FuelTank {
  id: string
  tank_code: string
  fuel_product_id: string
  fuel_product?: Product
  capacity_litres: number
}

// ─── Bowser Receipts ──────────────────────────────────────────────────────────

export type BowserReceiptStatus = 'DRAFT' | 'APPROVED'

export interface BowserReceiptLine {
  id: string
  tank_id: string
  product_id: string
  product?: Product
  received_litres: number
  unit_cost: number
}

export interface BowserReceipt {
  id: string
  receipt_no: string
  supplier_name?: string
  vehicle_no?: string
  driver_name?: string
  received_date: string
  status: BowserReceiptStatus
  lines?: BowserReceiptLine[]
  created_at: string
}

// ─── Stock Orders ─────────────────────────────────────────────────────────────

export type StockOrderStatus = 'DRAFT' | 'APPROVED'
export type PaymentType = 'CASH' | 'CHEQUE' | 'TRANSFER'

export interface StockOrderItem {
  product_id: string
  ordered_quantity: number
  unit_cost: number
}

export interface SupplierPayment {
  id: string
  payment_type: PaymentType
  amount: number
  payment_date: string
  reference_no?: string
}

export interface StockOrder {
  id: string
  order_no: string
  supplier_name: string
  order_date: string
  expected_delivery_date?: string
  status: StockOrderStatus
  items?: StockOrderItem[]
  payments?: SupplierPayment[]
  created_at: string
}

// ─── Cash & Daily Balancing ───────────────────────────────────────────────────

export type DailyBalanceStatus = 'PENDING' | 'CLOSED'

export interface CashSummary {
  shift_session_id: string
  total_expected: number
  total_collected: number
  shortfall: number
  surplus: number
  submissions?: CashSubmission[]
}

export interface DailyBalancing {
  id: string
  business_date: string
  opening_cash?: number
  total_revenue?: number
  bank_deposit?: number
  closing_cash?: number
  status: DailyBalanceStatus
  created_at: string
}

// Backward-compat
export type DailyCashBalance = DailyBalancing

// ─── Credits & Dues ───────────────────────────────────────────────────────────

export type CreditCustomerStatus = 'ACTIVE' | 'INACTIVE'
export type CreditSaleStatus = 'PENDING' | 'PARTIAL' | 'SETTLED'

export interface CreditCustomer {
  id: string
  customer_name: string
  phone?: string
  address?: string
  credit_limit?: number
  status: CreditCustomerStatus
}

export interface CreditSale {
  id: string
  customer_id: string
  customer?: CreditCustomer
  product_id: string
  product?: Product
  quantity: number
  unit_price: number
  total_amount: number
  shift_session_id?: string
  due_date?: string
  status: CreditSaleStatus
  created_at: string
}

export interface DueCollection {
  id: string
  customer_id: string
  credit_sale_id: string
  amount_collected: number
  collection_date: string
  payment_method: PaymentType
  created_at: string
}

// ─── Cheques ──────────────────────────────────────────────────────────────────

export type ChequeStatus =
  | 'RECEIVED'
  | 'DEPOSITED'
  | 'CLEARED'
  | 'RETURNED'
  | 'CANCELLED'

export interface Cheque {
  id: string
  cheque_no: string
  bank_name: string
  branch_name?: string
  customer_id?: string
  cheque_date?: string
  amount: number
  received_date: string
  status: ChequeStatus
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

export type PayrollRunStatus = 'DRAFT' | 'FINALIZED'
export type DeductionStatus = 'PENDING' | 'APPROVED'

export interface PayrollRun {
  id: string
  period_start: string
  period_end: string
  status: PayrollRunStatus
  created_at: string
}

export interface SalaryDeduction {
  id: string
  staff_id: string
  staff?: Staff
  amount: number
  reason: string
  status: DeductionStatus
  payroll_run_id?: string
  created_at: string
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface DashboardReport {
  today_sales: number
  active_shift_count: number
  fuel_stock_summary: Array<{ product_code: string; product_name: string; category: string; quantity_on_hand: string }>
  cash_shortfall_count: number
  pending_approvals: number
  credit_outstanding: number
  cheques_pending: number
  // Legacy fields — not returned by backend; kept for components that degrade gracefully
  today_revenue?: number
  fuel_dispensed_today?: number
  cash_shortfalls_today?: number
  pending_bowser_receipts?: number
  low_stock_alerts?: number
  revenue_last_7_days?: Array<{ date: string; revenue: number }>
  fuel_sales_by_product?: Array<{ product_name: string; litres: number }>
}

export interface ShiftSummaryRow {
  id: string
  business_date: string
  shift_name: string
  status: string
  expected_cash: number
  actual_cash: number
  shortfall: number
  excess: number
}

export interface StockReportRow {
  product_name: string
  opening_stock: number
  received: number
  dispensed: number
  closing_stock: number
  variance: number
}

export interface ProfitLossReport {
  period: { date_from?: string; date_to?: string }
  revenue: number
  supplier_payments: number
  approved_deductions: number
  gross_profit_estimate: number
  net_profit_estimate: number
  credit_outstanding: number
}

// Backward-compat
export type DashboardData = DashboardReport

// ─── Audit ────────────────────────────────────────────────────────────────────

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'

export interface AuditLog {
  id: string
  entity_type: string
  entity_id: string
  action: AuditAction
  changed_fields?: Record<string, { from: unknown; to: unknown }>
  actor_user_id: string
  actor_name?: string
  created_at: string
}

// Backward-compat alias used by audit.ts
export type EntityChangeLog = AuditLog

// ─── Shift Corrections ────────────────────────────────────────────────────────

export type CorrectionType = 'METER_READING' | 'CASH' | 'ASSIGNMENT' | 'OTHER'
export type CorrectionStatus = 'PENDING' | 'APPROVED' | 'APPLIED'

export interface ShiftCorrection {
  id: string
  shift_session_id: string
  correction_type: CorrectionType
  field_name: string
  old_value: unknown
  new_value: unknown
  reason: string
  status: CorrectionStatus
  applied_by?: string
  created_at: string
}

// Backward-compat
export type CorrectionRequest = ShiftCorrection

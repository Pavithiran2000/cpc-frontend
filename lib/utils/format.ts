import { format, parseISO, isValid } from 'date-fns'

// ─── Internal helpers ────────────────────────────────────────────────────────

function toDate(value: string | Date): Date | null {
  if (value instanceof Date) return isValid(value) ? value : null
  try {
    const d = parseISO(value)
    return isValid(d) ? d : null
  } catch {
    return null
  }
}

// ─── Currency ────────────────────────────────────────────────────────────────

/**
 * Format a number as Sri Lankan Rupees.
 * Uses IBM Plex Mono / .number class on the consuming element.
 *
 * @example formatCurrency(12450)     → "LKR 12,450.00"
 * @example formatCurrency(0)         → "LKR 0.00"
 * @example formatCurrency(null)      → "—"
 */
export function formatCurrency(
  amount: number | null | undefined,
): string {
  if (amount == null) return '—'
  return `LKR ${amount.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

// ─── Volume ──────────────────────────────────────────────────────────────────

/**
 * Format a litre value with 3 decimal places.
 *
 * @example formatLitres(1234.567)    → "1,234.567 L"
 * @example formatLitres(0)           → "0.000 L"
 * @example formatLitres(null)        → "—"
 */
export function formatLitres(
  litres: number | null | undefined,
): string {
  if (litres == null) return '—'
  return `${litres.toLocaleString('en-LK', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} L`
}

/**
 * Format a generic quantity with configurable decimal places.
 *
 * @example formatQuantity(1234.56)   → "1,234.56"
 * @example formatQuantity(100, 0)    → "100"
 */
export function formatQuantity(
  value: number | null | undefined,
  decimals = 2,
): string {
  if (value == null) return '—'
  return value.toLocaleString('en-LK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

// ─── Dates ───────────────────────────────────────────────────────────────────

/**
 * Format an ISO date string or Date object as a readable date.
 *
 * @example formatDate('2025-01-15')  → "15 Jan 2025"
 * @example formatDate(new Date())    → "20 May 2026"
 * @example formatDate(null)          → "—"
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = toDate(value)
  if (!d) return typeof value === 'string' ? value : '—'
  return format(d, 'd MMM yyyy')
}

/**
 * Format an ISO datetime string as a readable date-time.
 *
 * @example formatDateTime('2025-01-15T08:30:00Z') → "15 Jan 2025 08:30 AM"
 * @example formatDateTime(null)                   → "—"
 */
export function formatDateTime(
  value: string | Date | null | undefined,
): string {
  if (!value) return '—'
  const d = toDate(value)
  if (!d) return typeof value === 'string' ? value : '—'
  return format(d, 'd MMM yyyy hh:mm aa').replace('am', 'AM').replace('pm', 'PM')
}

// ─── Time ────────────────────────────────────────────────────────────────────

/**
 * Convert a 24-hour HH:MM string to 12-hour display.
 * Accepts both plain "HH:MM" and full ISO datetime strings.
 *
 * @example formatShiftTime('08:00')               → "08:00 AM"
 * @example formatShiftTime('13:30')               → "01:30 PM"
 * @example formatShiftTime('21:00')               → "09:00 PM"
 * @example formatShiftTime('2025-01-15T13:30:00') → "01:30 PM"
 * @example formatShiftTime(null)                  → "—"
 */
export function formatShiftTime(value: string | null | undefined): string {
  if (!value) return '—'

  // Plain HH:MM
  const plainMatch = value.match(/^(\d{2}):(\d{2})$/)
  if (plainMatch) {
    const [, hh, mm] = plainMatch
    const hours = parseInt(hh, 10)
    const period = hours >= 12 ? 'PM' : 'AM'
    const display = hours % 12 === 0 ? 12 : hours % 12
    return `${String(display).padStart(2, '0')}:${mm} ${period}`
  }

  // Fall back: parse as ISO datetime and extract time part
  const d = toDate(value)
  if (!d) return value
  return format(d, 'hh:mm aa').replace('am', 'AM').replace('pm', 'PM')
}

// ─── Percentage ──────────────────────────────────────────────────────────────

/**
 * Format a decimal as a percentage string.
 *
 * @example formatPercent(12.5)   → "12.5%"
 * @example formatPercent(0)      → "0.0%"
 * @example formatPercent(null)   → "—"
 */
export function formatPercent(
  value: number | null | undefined,
  decimals = 1,
): string {
  if (value == null) return '—'
  return `${value.toFixed(decimals)}%`
}

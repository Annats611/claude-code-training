import { merchantById } from "@/data/merchants"
import { Payment } from "@/data/types"
import { formatMoney } from "./money"

/**
 * CSV export for the payments table. Ops chooses the column set and the
 * scope from the export dialog; this file validates the column choice
 * against an allowlist and renders only what was requested, in that order.
 */

export const EXPORT_COLUMNS = [
  "id",
  "created_at",
  "merchant",
  "description",
  "status",
  "method",
  "card_brand",
  "last4",
  "amount",
  "currency",
] as const

export type ExportColumn = (typeof EXPORT_COLUMNS)[number]

/** Card last-four is opt-in: it ships only when ops explicitly selects it. */
export const DEFAULT_EXPORT_COLUMNS: readonly ExportColumn[] =
  EXPORT_COLUMNS.filter((column) => column !== "last4")

function isExportColumn(value: string): value is ExportColumn {
  return (EXPORT_COLUMNS as readonly string[]).includes(value)
}

/**
 * Validates client-supplied column names against the allowlist, keeping the
 * requested order and dropping anything unrecognized or repeated.
 *
 * Returns `null` when `raw` is absent, so the caller can fall back to
 * `DEFAULT_EXPORT_COLUMNS`. Returns `[]` when a selection was made but
 * nothing in it survived validation — including an explicit empty
 * selection — so the caller can reject the request rather than exporting
 * every column or an empty file.
 */
export function parseExportColumns(raw: string | null): ExportColumn[] | null {
  if (raw === null) return null
  const requested = raw
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)

  const columns: ExportColumn[] = []
  for (const name of requested) {
    if (isExportColumn(name) && !columns.includes(name)) columns.push(name)
  }
  return columns
}

function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function cell(payment: Payment, column: ExportColumn): string {
  switch (column) {
    case "id":
      return payment.id
    case "created_at":
      return payment.createdAt
    case "merchant":
      return merchantById(payment.merchantId)?.name ?? payment.merchantId
    case "description":
      return payment.description
    case "status":
      return payment.status
    case "method":
      return payment.method
    case "card_brand":
      return payment.cardBrand ?? ""
    case "last4":
      return payment.last4 ?? ""
    case "amount":
      return formatMoney(payment.amount, payment.currency)
    case "currency":
      return payment.currency
  }
}

export function toCsv(
  payments: Payment[],
  columns: readonly ExportColumn[] = EXPORT_COLUMNS,
): string {
  const header = columns.join(",")
  const rows = payments.map((payment) =>
    columns.map((column) => escapeCell(cell(payment, column))).join(","),
  )
  return [header, ...rows].join("\n")
}

/** `scope` names what the file contains, e.g. "disputed" or "all". */
export function exportFilename(scope: string, date = new Date()): string {
  return `payments-${scope}-${date.toISOString().slice(0, 10)}.csv`
}

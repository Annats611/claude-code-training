import { filterPayments, parseFilters, sortPayments } from "@/data/queries"
import {
  DEFAULT_EXPORT_COLUMNS,
  exportFilename,
  parseExportColumns,
  toCsv,
} from "@/lib/csv"
import { NextRequest, NextResponse } from "next/server"

const SCOPES = ["filter", "all"] as const
type ExportScope = (typeof SCOPES)[number]

function parseScope(raw: string | null): ExportScope {
  return raw === "all" ? "all" : "filter"
}

/** Names what the file contains: the active status filter, "filtered", or "all". */
function scopeLabel(scope: ExportScope, status: string | undefined): string {
  if (scope === "all") return "all"
  return status && status !== "all" ? status : "filtered"
}

/**
 * Exports the payments table as CSV.
 *
 * Columns and scope are both chosen by ops in the export dialog and arrive
 * as query params, so both are validated against an allowlist here rather
 * than trusted. Row data always goes through the one query builder behind
 * GET /api/payments.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const filters = parseFilters(params)
  const scope = parseScope(params.get("scope"))
  const columns = parseExportColumns(params.get("columns")) ?? DEFAULT_EXPORT_COLUMNS

  if (columns.length === 0) {
    return NextResponse.json(
      { error: "Select at least one column to export." },
      { status: 400 },
    )
  }

  const rows = sortPayments(
    filterPayments(scope === "all" ? {} : filters),
    filters.sort,
    filters.direction,
  )

  return new Response(toCsv(rows, columns), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${exportFilename(
        scopeLabel(scope, filters.status),
      )}"`,
    },
  })
}

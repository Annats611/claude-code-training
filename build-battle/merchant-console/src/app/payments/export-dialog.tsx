"use client"

import { Button } from "@/components/Button"
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/Drawer"
import { DEFAULT_EXPORT_COLUMNS, EXPORT_COLUMNS, ExportColumn } from "@/lib/csv"
import { Download } from "lucide-react"
import { useState } from "react"

const COLUMN_LABELS: Record<ExportColumn, string> = {
  id: "Payment ID",
  created_at: "Date",
  merchant: "Merchant",
  description: "Description",
  status: "Status",
  method: "Method",
  card_brand: "Card brand",
  last4: "Card last four",
  amount: "Amount",
  currency: "Currency",
}

type Scope = "filter" | "all"

/**
 * Lets ops choose export columns and scope before downloading. Row counts
 * come from GET /api/payments, the one query builder, so this never counts
 * rows itself.
 */
export function ExportDialog({
  query,
  currentTotal,
}: {
  query: string
  currentTotal: number
}) {
  const [selected, setSelected] = useState<Set<ExportColumn>>(
    new Set(DEFAULT_EXPORT_COLUMNS),
  )
  const [scope, setScope] = useState<Scope>("filter")
  const [allTotal, setAllTotal] = useState<number | null>(null)

  const loadAllTotal = () => {
    if (allTotal !== null) return
    fetch("/api/payments?page=1")
      .then((response) => response.json())
      .then((data) => setAllTotal(data.total ?? 0))
      .catch(() => setAllTotal(0))
  }

  const toggleColumn = (column: ExportColumn) => {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(column)) next.delete(column)
      else next.add(column)
      return next
    })
  }

  const rowCount = scope === "all" ? allTotal : currentTotal
  const canDownload = selected.size > 0

  const exportParams = new URLSearchParams(query)
  exportParams.set("scope", scope)
  exportParams.set(
    "columns",
    EXPORT_COLUMNS.filter((column) => selected.has(column)).join(","),
  )
  const downloadHref = `/api/payments/export?${exportParams.toString()}`

  return (
    <Drawer onOpenChange={(open) => open && loadAllTotal()}>
      <DrawerTrigger asChild>
        <Button variant="secondary" className="w-full gap-2 py-1.5 sm:w-fit">
          <Download
            className="-ml-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-600"
            aria-hidden="true"
          />
          Export
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Export payments</DrawerTitle>
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-6">
          <fieldset>
            <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Scope
            </legend>
            <div className="mt-2 flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="export-scope"
                  checked={scope === "filter"}
                  onChange={() => setScope("filter")}
                />
                Current filter ({currentTotal.toLocaleString()} rows)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  name="export-scope"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                />
                All payments (
                {allTotal === null ? "…" : allTotal.toLocaleString()} rows)
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Columns
            </legend>
            <div className="mt-2 flex flex-col gap-2">
              {EXPORT_COLUMNS.map((column) => (
                <label
                  key={column}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(column)}
                    onChange={() => toggleColumn(column)}
                  />
                  {COLUMN_LABELS[column]}
                </label>
              ))}
            </div>
          </fieldset>

          <p className="text-sm text-gray-500" aria-live="polite">
            {rowCount === null
              ? "Loading row count…"
              : `${rowCount.toLocaleString()} rows will be exported.`}
          </p>
        </DrawerBody>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DrawerClose>
          <Button variant="primary" asChild={canDownload} disabled={!canDownload}>
            {canDownload ? (
              <a href={downloadHref} download>
                Download
              </a>
            ) : (
              <span>Download</span>
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

import * as React from "react"
import { startOfMonth, subDays, addMonths, subMonths } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, X, Check, ChevronsLeft, ChevronsRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ThaiDatePickerProps {
  value?: string
  defaultValue?: string
  onChange?: (date: string) => void
  /** ชื่อช่องในฟอร์ม ส่งค่าเป็น YYYY-MM-DD */
  name?: string
  required?: boolean
  /** วันที่เร็วสุดที่เลือกได้ เป็น YYYY-MM-DD */
  min?: string
  /** วันที่ช้าสุดที่เลือกได้ เป็น YYYY-MM-DD */
  max?: string
  placeholder?: string
  className?: string
  showQuickSelect?: boolean
  /** ป้ายกำกับเหนือค่าวันที่ เช่น "วันที่เริ่ม" */
  label?: string
  /** เลือกวันแล้วปิดทันที (ค่าเริ่มต้น true) */
  closeOnSelect?: boolean
}

export const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
]

export const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
]

export const THAI_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"] as const
export const THAI_WEEKDAYS_FULL = [
  "วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"
] as const

export const toBuddhistYear = (year: number): number => year + 543

export const formatThaiDate = (date: Date | undefined): string => {
  if (!date || isNaN(date.getTime())) return ""
  return `${date.getDate()} ${THAI_MONTHS_SHORT[date.getMonth()]} ${toBuddhistYear(date.getFullYear())}`
}

/** รูปแบบเต็ม: 10 กรกฎาคม 2569 */
export const formatThaiDateLong = (date: Date | undefined): string => {
  if (!date || isNaN(date.getTime())) return ""
  return `${date.getDate()} ${THAI_MONTHS_FULL[date.getMonth()]} ${toBuddhistYear(date.getFullYear())}`
}

/** รูปแบบเดือน-ปี: ก.ค. 2569 */
export const formatThaiMonthYear = (date: Date | undefined): string => {
  if (!date || isNaN(date.getTime())) return ""
  return `${THAI_MONTHS_SHORT[date.getMonth()]} ${toBuddhistYear(date.getFullYear())}`
}

export function formatThaiDateFromIso(value?: string): string {
  if (!value) return ""
  return formatThaiDateLong(parseIsoDate(value))
}

/** ช่วงวันที่ไทย: 1 มกราคม 2569 – 31 มกราคม 2569 */
export function formatThaiDateRangeFromIso(start?: string | null, end?: string | null): string {
  const startLabel = start ? formatThaiDateFromIso(start) : ""
  const endLabel = end ? formatThaiDateFromIso(end) : ""
  if (startLabel && endLabel) {
    return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`
  }
  return startLabel || endLabel || ""
}

export function formatThaiMonthYearFromIso(value?: string): string {
  if (!value) return ""
  return formatThaiMonthYear(parseIsoDate(value))
}

export function formatIndicatorPeriod(value?: string, frequency?: string): string {
  if (!value) return ""
  if (frequency === "Yearly") {
    const year = Number(value.slice(0, 4))
    if (!Number.isNaN(year) && year > 0) {
      return `ปี ${year + 543}`
    }
  }
  return formatThaiMonthYearFromIso(value)
}

export function parseIsoDate(value?: string | null): Date | undefined {
  if (!value) return undefined
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return isNaN(date.getTime()) ? undefined : date
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const QUICK_OPTIONS = [
  { key: "today", label: "วันนี้", resolve: () => new Date() },
  { key: "yesterday", label: "เมื่อวาน", resolve: () => subDays(new Date(), 1) },
  { key: "month-start", label: "ต้นเดือนนี้", resolve: () => startOfMonth(new Date()) },
] as const

const CALENDAR_START_MONTH = new Date(1970, 0)
const CALENDAR_END_MONTH = new Date(2100, 11)

const calendarFormatters = {
  formatCaption: (date: Date) =>
    `${THAI_MONTHS_FULL[date.getMonth()]} พ.ศ. ${toBuddhistYear(date.getFullYear())}`,
  formatWeekdayName: (date: Date) => THAI_WEEKDAYS[date.getDay()],
  formatMonthDropdown: (date: Date) => THAI_MONTHS_FULL[date.getMonth()],
  formatYearDropdown: (date: Date) => `พ.ศ. ${toBuddhistYear(date.getFullYear())}`,
}

export function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

export function isWithinRange(date: Date, minDate?: Date, maxDate?: Date): boolean {
  const day = startOfDay(date)
  if (minDate && day < startOfDay(minDate)) return false
  if (maxDate && day > startOfDay(maxDate)) return false
  return true
}

export function ThaiDatePicker({
  value,
  defaultValue = "",
  onChange,
  name,
  required = false,
  min,
  max,
  placeholder = "เลือกวันที่ (พ.ศ.)",
  className,
  showQuickSelect = true,
  label = "วันที่",
  closeOnSelect = true,
}: ThaiDatePickerProps) {
  const isControlled = value !== undefined
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const currentValue = isControlled ? (value ?? "") : uncontrolled
  const minDate = React.useMemo(() => (min ? parseIsoDate(min) : undefined), [min])
  const maxDate = React.useMemo(() => (max ? parseIsoDate(max) : undefined), [max])
  const [open, setOpen] = React.useState(false)
  const dateValue = React.useMemo(
    () => (currentValue ? parseIsoDate(currentValue) : undefined),
    [currentValue],
  )
  const [month, setMonth] = React.useState<Date>(() => dateValue ?? new Date())
  const [pendingDate, setPendingDate] = React.useState<Date | undefined>(dateValue)
  const [viewMode, setViewMode] = React.useState<'days' | 'months' | 'years'>('days')
  const [yearDecadeBase, setYearDecadeBase] = React.useState<number>(() => {
    const y = (dateValue ?? new Date()).getFullYear()
    return Math.floor(y / 12) * 12
  })

  React.useEffect(() => {
    setPendingDate(dateValue)
    if (dateValue) {
      setMonth(dateValue)
      setYearDecadeBase(Math.floor(dateValue.getFullYear() / 12) * 12)
    }
  }, [currentValue, dateValue])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setPendingDate(dateValue)
      const base = dateValue ?? new Date()
      setMonth(base)
      setYearDecadeBase(Math.floor(base.getFullYear() / 12) * 12)
      setViewMode('days')
    }
  }

  const commit = (next: string) => {
    if (!isControlled) setUncontrolled(next)
    onChange?.(next)
  }

  const applyDate = (date: Date | undefined, close = true) => {
    if (date) {
      if (!isWithinRange(date, minDate, maxDate)) return
      commit(toIsoDate(date))
      setMonth(date)
      setPendingDate(date)
    } else {
      commit("")
      setPendingDate(undefined)
    }
    if (close) setOpen(false)
  }

  const confirmSelection = () => {
    if (pendingDate) {
      applyDate(pendingDate)
      return
    }
    setOpen(false)
  }

  const isSameDay = (a?: Date, b?: Date) =>
    !!a &&
    !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  const isActiveQuick = (resolve: () => Date) => isSameDay(dateValue, resolve())
  const quickOptions = QUICK_OPTIONS.filter((opt) => isWithinRange(opt.resolve(), minDate, maxDate))
  const disabledDays = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ]

  const buddhistYear = toBuddhistYear(month.getFullYear())

  // 12-year window for year grid
  const decadeYears = React.useMemo(() => {
    const yrs = []
    for (let i = 0; i < 12; i++) {
      yrs.push(yearDecadeBase + i)
    }
    return yrs
  }, [yearDecadeBase])

  return (
    <>
      {name ? (
        <input
          className="sr-only"
          name={name}
          value={currentValue}
          required={required}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          onChange={() => undefined}
        />
      ) : null}
      <Popover modal open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-required={required}
            className={cn(
              "group flex h-10 w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3",
              "text-left shadow-2xs transition-all duration-200",
              "hover:border-emerald-400 hover:bg-emerald-50/30 hover:shadow-xs",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40",
              !value && "text-slate-400",
              className,
            )}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-2xs transition group-hover:scale-105">
              <CalendarIcon className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              {label && (
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-emerald-700/80 leading-none mb-0.5">
                  {label}
                </span>
              )}
              <span className={cn("block truncate text-xs leading-snug", value ? "font-semibold text-slate-800" : "text-slate-400")}>
                {dateValue ? formatThaiDateLong(dateValue) : placeholder}
              </span>
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-slate-400 transition-transform duration-200",
                open && "rotate-180 text-emerald-600",
              )}
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="z-[100] w-[330px] overflow-hidden rounded-2xl border border-emerald-100/90 bg-white p-0 shadow-2xl shadow-emerald-950/15"
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          {/* Header Banner */}
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 px-4 py-3.5 text-white">
            <div className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full bg-white/10 blur-xl" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-emerald-100">
                {label || "เลือกวันที่"} · พุทธศักราช (พ.ศ.)
              </span>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white tracking-wide">
                พ.ศ. {buddhistYear}
              </span>
            </div>
            <p className="mt-1 text-lg font-bold leading-tight tracking-tight">
              {pendingDate ? formatThaiDateLong(pendingDate) : "กรุณาคลิกเลือกวันที่"}
            </p>
            {pendingDate && (
              <p className="mt-0.5 text-xs text-emerald-100 font-medium">
                {THAI_WEEKDAYS_FULL[pendingDate.getDay()]}
              </p>
            )}
          </div>

          {/* Month & Year Navigation Bar with View Switchers */}
          <div className="flex items-center justify-between gap-1 border-b border-slate-100 px-3 py-2 bg-slate-50/70">
            {viewMode === 'days' && (
              <>
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 shadow-2xs"
                  onClick={() => setMonth((m) => subMonths(m, 1))}
                  aria-label="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 hover:bg-emerald-100/60 hover:text-emerald-800 transition flex items-center gap-1"
                  >
                    <span>{THAI_MONTHS_FULL[month.getMonth()]}</span>
                    <ChevronDown className="size-3 text-slate-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setYearDecadeBase(Math.floor(month.getFullYear() / 12) * 12)
                      setViewMode(viewMode === 'years' ? 'days' : 'years')
                    }}
                    className="px-2 py-1 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-100/60 hover:text-emerald-900 transition flex items-center gap-1"
                  >
                    <span>พ.ศ. {buddhistYear}</span>
                    <ChevronDown className="size-3 text-emerald-500" />
                  </button>
                </div>
                <button
                  type="button"
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 shadow-2xs"
                  onClick={() => setMonth((m) => addMonths(m, 1))}
                  aria-label="เดือนถัดไป"
                >
                  <ChevronRight className="size-4" />
                </button>
              </>
            )}

            {viewMode === 'months' && (
              <div className="flex items-center justify-between w-full px-1">
                <span className="text-xs font-bold text-slate-700">เลือกเดือน (ปี พ.ศ. {buddhistYear})</span>
                <button
                  type="button"
                  onClick={() => setViewMode('days')}
                  className="text-xs text-emerald-700 font-semibold hover:underline"
                >
                  ย้อนกลับ
                </button>
              </div>
            )}

            {viewMode === 'years' && (
              <div className="flex items-center justify-between w-full">
                <button
                  type="button"
                  onClick={() => setYearDecadeBase((b) => b - 12)}
                  className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50"
                >
                  <ChevronsLeft className="size-4" />
                </button>
                <span className="text-xs font-bold text-slate-700">
                  พ.ศ. {toBuddhistYear(decadeYears[0])} – {toBuddhistYear(decadeYears[decadeYears.length - 1])}
                </span>
                <button
                  type="button"
                  onClick={() => setYearDecadeBase((b) => b + 12)}
                  className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50"
                >
                  <ChevronsRight className="size-4" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Select Buttons (Days View) */}
          {viewMode === 'days' && showQuickSelect && quickOptions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 bg-slate-50/50 px-3 py-2">
              {quickOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => applyDate(opt.resolve())}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                    isActiveQuick(opt.resolve)
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "border border-slate-200/90 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-800",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* View Modes */}
          {viewMode === 'days' && (
            <div className="bg-white px-2 pb-1 pt-1">
              <Calendar
                mode="single"
                selected={pendingDate}
                onSelect={(date) => {
                  if (!date) return
                  setPendingDate(date)
                  setMonth(date)
                  if (closeOnSelect) {
                    applyDate(date)
                  }
                }}
                month={month}
                onMonthChange={setMonth}
                disabled={disabledDays.length > 0 ? disabledDays : undefined}
                startMonth={minDate ? new Date(minDate.getFullYear(), minDate.getMonth()) : CALENDAR_START_MONTH}
                endMonth={maxDate ? new Date(maxDate.getFullYear(), maxDate.getMonth()) : CALENDAR_END_MONTH}
                formatters={calendarFormatters}
                className="rounded-xl [--cell-size:2.35rem]"
                classNames={{
                  button_previous: "hidden",
                  button_next: "hidden",
                  nav: "hidden",
                  month_caption: "hidden",
                  caption_label: "sr-only",
                  weekdays: "flex border-b border-slate-100 pb-1 mb-1",
                  weekday: cn(
                    "text-center w-10 font-bold text-[0.72rem]",
                    "[&:nth-child(1)]:text-rose-500", // Sunday
                    "[&:nth-child(7)]:text-indigo-500", // Saturday
                    "[&:nth-child(2)]:text-slate-600",
                    "[&:nth-child(3)]:text-slate-600",
                    "[&:nth-child(4)]:text-slate-600",
                    "[&:nth-child(5)]:text-slate-600",
                    "[&:nth-child(6)]:text-slate-600",
                  ),
                }}
              />
            </div>
          )}

          {viewMode === 'months' && (
            <div className="grid grid-cols-3 gap-2 p-3 bg-white">
              {THAI_MONTHS_SHORT.map((mShort, idx) => {
                const isSelected = month.getMonth() === idx
                return (
                  <button
                    key={mShort}
                    type="button"
                    onClick={() => {
                      setMonth(new Date(month.getFullYear(), idx, 1))
                      setViewMode('days')
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center h-12 rounded-xl transition-all border",
                      isSelected
                        ? "bg-emerald-600 text-white font-bold border-emerald-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border-slate-200/80 font-medium"
                    )}
                  >
                    <span className="text-xs font-bold">{mShort}</span>
                    <span className="text-[10px] opacity-75">{THAI_MONTHS_FULL[idx]}</span>
                  </button>
                )
              })}
            </div>
          )}

          {viewMode === 'years' && (
            <div className="grid grid-cols-3 gap-2 p-3 bg-white">
              {decadeYears.map((ceYear) => {
                const beYear = toBuddhistYear(ceYear)
                const isSelected = month.getFullYear() === ceYear
                return (
                  <button
                    key={ceYear}
                    type="button"
                    onClick={() => {
                      setMonth(new Date(ceYear, month.getMonth(), 1))
                      setViewMode('days')
                    }}
                    className={cn(
                      "flex items-center justify-center h-11 rounded-xl transition-all border text-xs",
                      isSelected
                        ? "bg-emerald-600 text-white font-bold border-emerald-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border-slate-200/80 font-semibold"
                    )}
                  >
                    พ.ศ. {beYear}
                  </button>
                )
              })}
            </div>
          )}

          {/* Footer Controls */}
          {!closeOnSelect && (
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-3 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 rounded-lg text-slate-500 hover:text-rose-600 text-xs"
                onClick={() => applyDate(undefined)}
                disabled={!currentValue && !pendingDate}
              >
                <X className="size-3.5" />
                ล้าง
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1 rounded-lg bg-emerald-600 px-4 hover:bg-emerald-700 text-white text-xs font-semibold"
                onClick={confirmSelection}
                disabled={!pendingDate}
              >
                <Check className="size-3.5" />
                ตกลง
              </Button>
            </div>
          )}

          {closeOnSelect && (
            <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 bg-slate-50/60">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 rounded-lg text-slate-500 hover:text-rose-600 text-xs px-2"
                onClick={() => applyDate(undefined)}
                disabled={!currentValue}
              >
                <X className="size-3.5" />
                ล้างวันที่
              </Button>
              <span className="text-[11px] text-slate-400 font-medium">คลิกเลือกวัน · แสดงผลเป็น พ.ศ.</span>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </>
  )
}

import * as React from "react"
import { startOfMonth, subDays, addMonths, subMonths } from "date-fns"
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ThaiDatePickerProps {
  value?: string
  onChange: (date: string) => void
  placeholder?: string
  className?: string
  showQuickSelect?: boolean
  /** ป้ายกำกับเหนือค่าวันที่ เช่น "วันที่เริ่ม" */
  label?: string
  /** เลือกวันแล้วปิดทันที (ค่าเริ่มต้น true) */
  closeOnSelect?: boolean
}

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
]

const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
]

const THAI_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"] as const

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

function parseIsoDate(value: string): Date | undefined {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return isNaN(date.getTime()) ? undefined : date
}

function toIsoDate(date: Date): string {
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

const CALENDAR_START_MONTH = new Date(2000, 0)
const CALENDAR_END_MONTH = new Date(2100, 11)

const calendarFormatters = {
  formatCaption: (date: Date) =>
    `${THAI_MONTHS_FULL[date.getMonth()]} พ.ศ. ${toBuddhistYear(date.getFullYear())}`,
  formatWeekdayName: (date: Date) => THAI_WEEKDAYS[date.getDay()],
  formatMonthDropdown: (date: Date) => THAI_MONTHS_FULL[date.getMonth()],
  formatYearDropdown: (date: Date) => `พ.ศ. ${toBuddhistYear(date.getFullYear())}`,
}

export function ThaiDatePicker({
  value,
  onChange,
  placeholder = "เลือกวันที่",
  className,
  showQuickSelect = true,
  label = "วันที่",
  closeOnSelect = true,
}: ThaiDatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const dateValue = React.useMemo(
    () => (value ? parseIsoDate(value) : undefined),
    [value],
  )
  const [month, setMonth] = React.useState<Date>(() => dateValue ?? new Date())
  const [pendingDate, setPendingDate] = React.useState<Date | undefined>(dateValue)

  React.useEffect(() => {
    setPendingDate(dateValue)
    if (dateValue) {
      setMonth(dateValue)
    }
  }, [value, dateValue])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setPendingDate(dateValue)
      setMonth(dateValue ?? new Date())
    }
  }

  const applyDate = (date: Date | undefined, close = true) => {
    if (date) {
      onChange(toIsoDate(date))
      setMonth(date)
      setPendingDate(date)
    } else {
      onChange("")
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

  return (
    <Popover modal open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex h-11 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3",
            "text-left shadow-sm transition-all duration-200",
            "hover:border-emerald-300 hover:bg-emerald-50/40 hover:shadow-md",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60",
            !value && "text-slate-400",
            className,
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-900/15 transition group-hover:scale-105">
            <CalendarIcon className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700/80">
              {label}
            </span>
            <span className={cn("block truncate text-sm leading-snug", value && "font-semibold text-slate-800")}>
              {dateValue ? formatThaiDateLong(dateValue) : placeholder}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-slate-400 transition-transform duration-200",
              open && "rotate-180 text-emerald-600",
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="z-[100] w-[320px] overflow-hidden rounded-3xl border border-emerald-100/80 bg-white p-0 shadow-2xl shadow-emerald-900/10"
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 px-4 py-4 text-white">
          <div className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-10 left-8 size-24 rounded-full bg-cyan-300/20 blur-2xl" />
          <p className="relative text-[11px] font-medium text-emerald-50/90">{label} · พ.ศ.</p>
          <p className="relative mt-1 text-xl font-bold leading-tight tracking-tight">
            {pendingDate ? formatThaiDateLong(pendingDate) : "เลือกวันที่"}
          </p>
          {pendingDate && (
            <p className="relative mt-1 text-xs text-emerald-50/85">
              {THAI_WEEKDAYS[pendingDate.getDay()] === "อา" ? "วันอาทิตย์" :
                THAI_WEEKDAYS[pendingDate.getDay()] === "จ" ? "วันจันทร์" :
                THAI_WEEKDAYS[pendingDate.getDay()] === "อ" ? "วันอังคาร" :
                THAI_WEEKDAYS[pendingDate.getDay()] === "พ" ? "วันพุธ" :
                THAI_WEEKDAYS[pendingDate.getDay()] === "พฤ" ? "วันพฤหัสบดี" :
                THAI_WEEKDAYS[pendingDate.getDay()] === "ศ" ? "วันศุกร์" : "วันเสาร์"}
              {" · "}พ.ศ. {toBuddhistYear(pendingDate.getFullYear())}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            aria-label="เดือนก่อนหน้า"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1 px-1">
            <div className="text-center text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              พ.ศ. {toBuddhistYear(month.getFullYear())}
            </div>
          </div>
          <button
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label="เดือนถัดไป"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {showQuickSelect && (
          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 bg-slate-50/70 px-3 py-2.5">
            {QUICK_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => applyDate(opt.resolve())}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  isActiveQuick(opt.resolve)
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-900/15"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

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
            captionLayout="dropdown"
            startMonth={CALENDAR_START_MONTH}
            endMonth={CALENDAR_END_MONTH}
            formatters={calendarFormatters}
            className="rounded-2xl [--cell-size:2.35rem]"
            classNames={{
              button_previous: "hidden",
              button_next: "hidden",
              nav: "hidden",
              month_caption: "flex justify-center pt-1 relative items-center mb-2",
              caption_label: "sr-only",
              dropdowns: "flex items-center justify-center gap-2 w-full",
            }}
          />
        </div>

        {!closeOnSelect && (
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-3 py-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 rounded-xl text-slate-500 hover:text-rose-600"
              onClick={() => applyDate(undefined)}
              disabled={!value && !pendingDate}
            >
              <X className="size-3.5" />
              ล้าง
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1 rounded-xl bg-emerald-600 px-4 hover:bg-emerald-700"
              onClick={confirmSelection}
              disabled={!pendingDate}
            >
              <Check className="size-3.5" />
              ตกลง
            </Button>
          </div>
        )}

        {closeOnSelect && (
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 rounded-xl text-slate-500 hover:text-rose-600"
              onClick={() => applyDate(undefined)}
              disabled={!value}
            >
              <X className="size-3.5" />
              ล้างวันที่
            </Button>
            <span className="text-[11px] text-slate-400">คลิกวันเพื่อเลือก · แสดงเป็น พ.ศ.</span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

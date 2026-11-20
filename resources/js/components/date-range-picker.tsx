import * as React from "react"
import {
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
  addMonths,
} from "date-fns"
import {
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Check,
  RotateCcw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  toBuddhistYear,
  formatThaiDateLong,
  toIsoDate,
  parseIsoDate,
  THAI_MONTHS_SHORT,
  THAI_MONTHS_FULL,
  THAI_WEEKDAYS,
} from "@/components/ui/thai-date-picker"

export interface DateRangePreset {
  key: string
  label: string
  getRange: () => { start: Date; end: Date }
}

export interface ThaiDateRangePickerProps {
  startDate?: string
  endDate?: string
  preset?: string
  onChange: (startDate: string, endDate: string, presetKey?: string) => void
  placeholder?: string
  label?: string
  className?: string
  compact?: boolean
  showPresets?: boolean
  align?: "start" | "end" | "center"
}

// ฟังก์ชันสร้างช่วงวันตามปีงบประมาณไทย (1 ต.ค. ถึง 30 ก.ย.)
function getFiscalYearRange(beYear: number): { start: Date; end: Date } {
  const ceYear = beYear - 543
  return {
    start: new Date(ceYear - 1, 9, 1), // 1 ต.ค. ปีก่อน
    end: new Date(ceYear, 8, 30),      // 30 ก.ย. ปีนั้น
  }
}

export const DEFAULT_RANGE_PRESETS: DateRangePreset[] = [
  {
    key: "today",
    label: "วันนี้",
    getRange: () => {
      const now = new Date()
      return { start: now, end: now }
    },
  },
  {
    key: "yesterday",
    label: "เมื่อวาน",
    getRange: () => {
      const y = subDays(new Date(), 1)
      return { start: y, end: y }
    },
  },
  {
    key: "last_7_days",
    label: "7 วันล่าสุด",
    getRange: () => ({
      start: subDays(new Date(), 6),
      end: new Date(),
    }),
  },
  {
    key: "this_month",
    label: "เดือนนี้",
    getRange: () => {
      const now = new Date()
      return { start: startOfMonth(now), end: endOfMonth(now) }
    },
  },
  {
    key: "last_month",
    label: "เดือนที่แล้ว",
    getRange: () => {
      const prev = subMonths(new Date(), 1)
      return { start: startOfMonth(prev), end: endOfMonth(prev) }
    },
  },
  {
    key: "last_3_months",
    label: "ย้อนหลัง 3 เดือน",
    getRange: () => {
      const now = new Date()
      return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) }
    },
  },
  {
    key: "last_6_months",
    label: "ย้อนหลัง 6 เดือน",
    getRange: () => {
      const now = new Date()
      return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) }
    },
  },
  {
    key: "fiscal_2570",
    label: "ปีงบ 2570",
    getRange: () => getFiscalYearRange(2570),
  },
  {
    key: "fiscal_2569",
    label: "ปีงบ 2569",
    getRange: () => getFiscalYearRange(2569),
  },
  {
    key: "fiscal_2568",
    label: "ปีงบ 2568",
    getRange: () => getFiscalYearRange(2568),
  },
]

export function ThaiDateRangePicker({
  startDate,
  endDate,
  preset,
  onChange,
  placeholder = "เลือกช่วงวันที่ (พ.ศ.)",
  label,
  className,
  compact = false,
  showPresets = true,
  align = "start",
}: ThaiDateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedPreset, setSelectedPreset] = React.useState<string | undefined>(preset)

  const parsedStart = React.useMemo(() => parseIsoDate(startDate), [startDate])
  const parsedEnd = React.useMemo(() => parseIsoDate(endDate), [endDate])

  // ช่วงวันที่ที่กำลังเลือกในปฏิทิน
  const [range, setRange] = React.useState<{ from: Date | undefined; to: Date | undefined }>({
    from: parsedStart,
    to: parsedEnd,
  })

  const [month, setMonth] = React.useState<Date>(() => parsedStart ?? new Date())
  const [viewMode, setViewMode] = React.useState<"days" | "months" | "years">("days")
  const [yearDecadeBase, setYearDecadeBase] = React.useState<number>(() => {
    const y = (parsedStart ?? new Date()).getFullYear()
    return Math.floor(y / 12) * 12
  })

  // Sync เมื่อ props ภายนอกเปลี่ยน
  React.useEffect(() => {
    setRange({ from: parsedStart, to: parsedEnd })
    setSelectedPreset(preset)
    if (parsedStart) {
      setMonth(parsedStart)
    }
  }, [startDate, endDate, preset, parsedStart, parsedEnd])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setRange({ from: parsedStart, to: parsedEnd })
      setSelectedPreset(preset)
      const base = parsedStart ?? new Date()
      setMonth(base)
      setYearDecadeBase(Math.floor(base.getFullYear() / 12) * 12)
      setViewMode("days")
    }
  }

  const applyRange = (from?: Date, to?: Date, presetKey = "custom") => {
    if (from && to) {
      const s = toIsoDate(from)
      const e = toIsoDate(to)
      onChange(s, e, presetKey)
      setSelectedPreset(presetKey)
      setOpen(false)
    } else if (from && !to) {
      const s = toIsoDate(from)
      onChange(s, s, presetKey)
      setSelectedPreset(presetKey)
      setOpen(false)
    } else {
      onChange("", "", undefined)
      setSelectedPreset(undefined)
      setOpen(false)
    }
  }

  const handleSelectPreset = (p: DateRangePreset) => {
    const { start, end } = p.getRange()
    setRange({ from: start, to: end })
    setMonth(start)
    applyRange(start, end, p.key)
  }

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setRange({ from: undefined, to: undefined })
    setSelectedPreset(undefined)
    onChange("", "", undefined)
    setOpen(false)
  }

  // คำนวณฉลากแสดงผลบนปุ่ม
  const displayText = React.useMemo(() => {
    if (!parsedStart && !parsedEnd) return null

    if (parsedStart && parsedEnd) {
      const startStr = `${parsedStart.getDate()} ${THAI_MONTHS_SHORT[parsedStart.getMonth()]} ${toBuddhistYear(parsedStart.getFullYear())}`
      const endStr = `${parsedEnd.getDate()} ${THAI_MONTHS_SHORT[parsedEnd.getMonth()]} ${toBuddhistYear(parsedEnd.getFullYear())}`
      if (startStr === endStr) return startStr
      return `${startStr} – ${endStr}`
    }

    if (parsedStart) {
      return `ตั้งแต่ ${formatThaiDateLong(parsedStart)}`
    }
    if (parsedEnd) {
      return `ถึง ${formatThaiDateLong(parsedEnd)}`
    }
    return null
  }, [parsedStart, parsedEnd])

  const activePresetLabel = React.useMemo(() => {
    if (!selectedPreset || selectedPreset === "custom") return null
    return DEFAULT_RANGE_PRESETS.find((p) => p.key === selectedPreset)?.label
  }, [selectedPreset])

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
    <Popover modal open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left shadow-2xs transition-all duration-200",
            "hover:border-emerald-400 hover:bg-emerald-50/20 hover:shadow-xs",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40",
            compact ? "h-9 text-xs" : "h-10 text-xs",
            className
          )}
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-600/90 text-white shadow-2xs group-hover:scale-105 transition-transform">
            <CalendarRange className="size-3.5" />
          </span>

          <span className="flex-1 min-w-0">
            {label && (
              <span className="block text-[10px] font-semibold text-emerald-700/80 leading-none mb-0.5">
                {label}
              </span>
            )}
            <span className="flex items-center gap-1.5 truncate">
              {displayText ? (
                <>
                  <span className="font-semibold text-slate-800 truncate">{displayText}</span>
                  {activePresetLabel && (
                    <span className="shrink-0 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      {activePresetLabel}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-slate-400">{placeholder}</span>
              )}
            </span>
          </span>

          {displayText ? (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="size-5 shrink-0 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-600 transition"
              title="ล้างช่วงวันที่"
            >
              <X className="size-3.5" />
            </span>
          ) : (
            <ChevronDown
              className={cn(
                "size-3.5 shrink-0 text-slate-400 transition-transform duration-200",
                open && "rotate-180 text-emerald-600"
              )}
            />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="z-[100] w-auto max-w-[580px] overflow-hidden rounded-2xl border border-emerald-100/90 bg-white p-0 shadow-2xl shadow-emerald-950/20"
        align={align}
        sideOffset={6}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {/* Banner Top Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 px-4 py-3 text-white">
          <div className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full bg-white/10 blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-emerald-100">
              เลือกช่วงวันที่ (พุทธศักราช พ.ศ.)
            </span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white tracking-wide">
              พ.ศ. {buddhistYear}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm font-bold tracking-tight">
              {range.from ? formatThaiDateLong(range.from) : "วันเริ่มต้น"}
            </span>
            <span className="text-xs text-emerald-200">ถึง</span>
            <span className="text-sm font-bold tracking-tight">
              {range.to ? formatThaiDateLong(range.to) : (range.from ? "คลิกวันสิ้นสุด" : "วันสิ้นสุด")}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row">
          {/* Presets Sidebar */}
          {showPresets && (
            <div className="w-full sm:w-44 border-b sm:border-b-0 sm:border-r border-slate-100 bg-slate-50/70 p-2.5 space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                ช่วงเวลายอดนิยม
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-1">
                {DEFAULT_RANGE_PRESETS.map((p) => {
                  const isSelected = selectedPreset === p.key
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between",
                        isSelected
                          ? "bg-emerald-600 text-white font-bold shadow-2xs"
                          : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
                      )}
                    >
                      <span>{p.label}</span>
                      {isSelected && <Check className="size-3 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Calendar Area */}
          <div className="flex-1 p-2 sm:p-3">
            {/* Month & Year Navigation Bar */}
            <div className="flex items-center justify-between gap-1 border-b border-slate-100 pb-2 mb-2">
              {viewMode === "days" && (
                <>
                  <button
                    type="button"
                    className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 shadow-2xs"
                    onClick={() => setMonth((m) => subMonths(m, 1))}
                    aria-label="เดือนก่อนหน้า"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewMode(viewMode === "months" ? "days" : "months")}
                      className="px-2 py-1 rounded-lg text-xs font-bold text-slate-800 hover:bg-emerald-100/60 hover:text-emerald-800 transition flex items-center gap-1"
                    >
                      <span>{THAI_MONTHS_FULL[month.getMonth()]}</span>
                      <ChevronDown className="size-3 text-slate-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setYearDecadeBase(Math.floor(month.getFullYear() / 12) * 12)
                        setViewMode(viewMode === "years" ? "days" : "years")
                      }}
                      className="px-2 py-1 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-100/60 hover:text-emerald-900 transition flex items-center gap-1"
                    >
                      <span>พ.ศ. {buddhistYear}</span>
                      <ChevronDown className="size-3 text-emerald-500" />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="inline-flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 shadow-2xs"
                    onClick={() => setMonth((m) => addMonths(m, 1))}
                    aria-label="เดือนถัดไป"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </>
              )}

              {viewMode === "months" && (
                <div className="flex items-center justify-between w-full px-1">
                  <span className="text-xs font-bold text-slate-700">เลือกเดือน (ปี พ.ศ. {buddhistYear})</span>
                  <button
                    type="button"
                    onClick={() => setViewMode("days")}
                    className="text-xs text-emerald-700 font-semibold hover:underline"
                  >
                    ย้อนกลับ
                  </button>
                </div>
              )}

              {viewMode === "years" && (
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

            {/* Days Calendar */}
            {viewMode === "days" && (
              <Calendar
                mode="range"
                selected={{
                  from: range.from,
                  to: range.to,
                }}
                onSelect={(selectedRange) => {
                  setSelectedPreset("custom")
                  setRange({
                    from: selectedRange?.from,
                    to: selectedRange?.to,
                  })
                }}
                month={month}
                onMonthChange={setMonth}
                className="rounded-xl p-0 [--cell-size:2.2rem]"
                classNames={{
                  button_previous: "hidden",
                  button_next: "hidden",
                  nav: "hidden",
                  month_caption: "hidden",
                  caption_label: "sr-only",
                  weekdays: "flex border-b border-slate-100 pb-1 mb-1",
                  weekday: cn(
                    "text-center w-[2.2rem] font-bold text-[0.7rem]",
                    "[&:nth-child(1)]:text-rose-500", // Sunday
                    "[&:nth-child(7)]:text-indigo-500", // Saturday
                    "[&:nth-child(2)]:text-slate-600",
                    "[&:nth-child(3)]:text-slate-600",
                    "[&:nth-child(4)]:text-slate-600",
                    "[&:nth-child(5)]:text-slate-600",
                    "[&:nth-child(6)]:text-slate-600"
                  ),
                }}
              />
            )}

            {/* Month Grid */}
            {viewMode === "months" && (
              <div className="grid grid-cols-3 gap-2 py-2">
                {THAI_MONTHS_SHORT.map((mShort, idx) => {
                  const isSelected = month.getMonth() === idx
                  return (
                    <button
                      key={mShort}
                      type="button"
                      onClick={() => {
                        setMonth(new Date(month.getFullYear(), idx, 1))
                        setViewMode("days")
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center h-11 rounded-xl transition-all border text-xs",
                        isSelected
                          ? "bg-emerald-600 text-white font-bold border-emerald-600 shadow-sm"
                          : "bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border-slate-200/80 font-semibold"
                      )}
                    >
                      <span>{mShort}</span>
                      <span className="text-[9px] opacity-75">{THAI_MONTHS_FULL[idx]}</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Year Grid */}
            {viewMode === "years" && (
              <div className="grid grid-cols-3 gap-2 py-2">
                {decadeYears.map((ceYear) => {
                  const beYear = toBuddhistYear(ceYear)
                  const isSelected = month.getFullYear() === ceYear
                  return (
                    <button
                      key={ceYear}
                      type="button"
                      onClick={() => {
                        setMonth(new Date(ceYear, month.getMonth(), 1))
                        setViewMode("days")
                      }}
                      className={cn(
                        "flex items-center justify-center h-10 rounded-xl transition-all border text-xs",
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

            {/* Bottom Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8 gap-1 rounded-lg text-slate-500 hover:text-rose-600 text-xs px-2"
              >
                <RotateCcw className="size-3" />
                ล้างค่า
              </Button>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="h-8 rounded-lg text-xs font-medium"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => applyRange(range.from, range.to, selectedPreset || "custom")}
                  disabled={!range.from}
                  className="h-8 gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 shadow-2xs"
                >
                  <Check className="size-3.5" />
                  ตกลง
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

import * as React from "react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ThaiDatePickerProps {
  value?: string // YYYY-MM-DD format
  onChange: (date: string) => void
  placeholder?: string
  className?: string
}

// แปลงปี ค.ศ. เป็น พ.ศ.
const formatThaiDate = (date: Date | undefined): string => {
  if (!date) return ""
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear() + 543 // แปลงเป็น พ.ศ.
  
  const thaiMonths = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ]
  
  return `${day} ${thaiMonths[month]} ${year}`
}

export function ThaiDatePicker({ 
  value, 
  onChange, 
  placeholder = "เลือกวันที่",
  className 
}: ThaiDatePickerProps) {
  const [open, setOpen] = React.useState(false)
  
  // แปลง string YYYY-MM-DD เป็น Date object
  const dateValue = value ? new Date(value + "T00:00:00") : undefined
  
  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // แปลงเป็น YYYY-MM-DD format
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      onChange(`${year}-${month}-${day}`)
    } else {
      onChange('')
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[180px] justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue ? formatThaiDate(dateValue) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          locale={th}
          initialFocus
          formatters={{
            formatCaption: (date) => {
              const thaiMonths = [
                "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
                "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
              ]
              const year = date.getFullYear() + 543
              return `${thaiMonths[date.getMonth()]} ${year}`
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

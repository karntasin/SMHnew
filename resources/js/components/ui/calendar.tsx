import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { th } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={th}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "space-y-3",
        month_caption: "flex justify-center pt-1 relative items-center gap-1 min-h-10 mb-1",
        caption_label: "sr-only",
        dropdowns: "flex items-center justify-center gap-2 w-full px-8",
        dropdown_root: "relative inline-flex items-center rounded-xl border border-input bg-background shadow-sm hover:border-primary/40 transition-colors",
        dropdown: cn(
          "appearance-none rounded-xl border-0 bg-transparent",
          "px-3 py-2 text-sm font-semibold text-foreground min-w-[5.5rem]",
          "focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
        ),
        months_dropdown: "rounded-md",
        years_dropdown: "rounded-md",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "absolute left-0 top-0 size-9 rounded-xl bg-background p-0 opacity-90 hover:opacity-100 hover:bg-primary/5"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "absolute right-0 top-0 size-9 rounded-xl bg-background p-0 opacity-90 hover:opacity-100 hover:bg-primary/5"
        ),
        month_grid: "w-full border-collapse mt-2",
        weekdays: "flex",
        weekday: "text-muted-foreground w-10 font-semibold text-[0.7rem] uppercase",
        week: "flex w-full mt-0.5",
        day: cn(
          "relative p-0 text-center text-sm",
          "focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-primary/5 [&:has([aria-selected])]:rounded-lg"
        ),
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-10 p-0 font-medium rounded-xl transition-all",
          "hover:bg-primary/15 hover:text-primary hover:scale-105",
          "aria-selected:opacity-100"
        ),
        today: "rounded-xl bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-300/70 dark:bg-emerald-900/40 dark:text-emerald-100",
        selected: cn(
          "rounded-xl bg-emerald-600 text-white font-bold",
          "hover:bg-emerald-600 hover:text-white",
          "focus:bg-emerald-600 focus:text-white",
          "shadow-md ring-2 ring-emerald-300/40 scale-105"
        ),
        outside: "text-muted-foreground/40 aria-selected:bg-primary/5",
        disabled: "text-muted-foreground opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...chevronProps }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight
          return <Icon className={cn("size-4", className)} {...chevronProps} />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }

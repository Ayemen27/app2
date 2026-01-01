import * as React from "react"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Controller, Control, FieldValues, Path } from "react-hook-form"

export interface DatePickerFieldProps {
  label?: string
  value?: Date | string | null
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
  error?: string
  id?: string
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = "اختر التاريخ",
  disabled = false,
  className,
  required = false,
  error,
  id,
}: DatePickerFieldProps) {
  const [open, setOpen] = React.useState(false)
  const [tempDate, setTempDate] = React.useState<Date | undefined>(undefined)

  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    if (value instanceof Date) return value
    if (typeof value === "string") {
      const parsed = new Date(value)
      return isNaN(parsed.getTime()) ? undefined : parsed
    }
    return undefined
  }, [value])

  React.useEffect(() => {
    if (open) {
      setTempDate(dateValue || new Date())
    }
  }, [open, dateValue])

  const handleApply = () => {
    onChange?.(tempDate)
    setOpen(false)
  }

  const handleClear = () => {
    onChange?.(undefined)
    setOpen(false)
  }

  const formattedDate = dateValue
    ? format(dateValue, "dd MMMM yyyy", { locale: ar })
    : null

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label htmlFor={id} className="text-right font-medium">
          {label}
          {required && <span className="text-destructive mr-1">*</span>}
        </Label>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-right font-normal h-10",
              !dateValue && "text-muted-foreground",
              error && "border-destructive"
            )}
          >
            <CalendarIcon className="ml-2 h-4 w-4" />
            {formattedDate || placeholder}
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[85%] max-w-[280px] p-0 overflow-hidden border-none gap-0 rounded-2xl shadow-2xl fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <DialogHeader className="bg-teal-700 p-4 text-white text-right">
            <div className="text-[10px] opacity-80 mb-0.5">
              {tempDate ? format(tempDate, "yyyy") : format(new Date(), "yyyy")}
            </div>
            <div className="text-lg font-bold">
              {tempDate ? format(tempDate, "eeee، d MMMM", { locale: ar }) : "لم يتم التحديد"}
            </div>
          </DialogHeader>
          <div className="p-0 flex justify-center bg-white min-h-[260px]">
            <Calendar
              mode="single"
              selected={tempDate}
              onSelect={setTempDate}
              initialFocus
              captionLayout="dropdown-buttons"
              fromYear={2020}
              toYear={2035}
              className="rounded-md border-none w-full scale-[0.8] origin-top"
              classNames={{
                caption_dropdowns: "flex justify-start gap-1 px-1",
                chevron: "fill-teal-700",
                day_selected: "bg-teal-700 text-white hover:bg-teal-800 focus:bg-teal-700 rounded-full",
                day_today: "text-teal-700 font-bold",
              }}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-white border-t border-gray-50">
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-teal-700 hover:bg-teal-50 font-medium h-8 text-xs">
              Cancel
            </Button>
            <div className="flex gap-1">
              <Button variant="ghost" onClick={handleClear} className="text-teal-700 hover:bg-teal-50 font-medium h-8 text-xs">
                محو
              </Button>
              <Button variant="ghost" onClick={handleApply} className="text-teal-700 hover:bg-teal-50 font-medium h-8 text-xs">
                تعيين
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {error && (
        <p className="text-sm text-destructive text-right">{error}</p>
      )}
    </div>
  )
}

export interface DateRangePickerFieldProps {
  label?: string
  startDate?: Date | string | null
  endDate?: Date | string | null
  onStartDateChange?: (date: Date | undefined) => void
  onEndDateChange?: (date: Date | undefined) => void
  startPlaceholder?: string
  endPlaceholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
  error?: string
}

export function DateRangePickerField({
  label,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  startPlaceholder = "من تاريخ",
  endPlaceholder = "إلى تاريخ",
  disabled = false,
  className,
  required = false,
  error,
}: DateRangePickerFieldProps) {
  const [startOpen, setStartOpen] = React.useState(false)
  const [endOpen, setEndOpen] = React.useState(false)

  const parseDateValue = (value: Date | string | null | undefined): Date | undefined => {
    if (!value) return undefined
    if (value instanceof Date) return value
    if (typeof value === "string") {
      const parsed = new Date(value)
      return isNaN(parsed.getTime()) ? undefined : parsed
    }
    return undefined
  }

  const startDateValue = React.useMemo(() => parseDateValue(startDate), [startDate])
  const endDateValue = React.useMemo(() => parseDateValue(endDate), [endDate])

  const handleStartSelect = (date: Date | undefined) => {
    onStartDateChange?.(date)
    setStartOpen(false)
  }

  const handleEndSelect = (date: Date | undefined) => {
    onEndDateChange?.(date)
    setEndOpen(false)
  }

  const formatDateDisplay = (date: Date | undefined): string | null => {
    return date ? format(date, "dd MMMM yyyy", { locale: ar }) : null
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label className="text-right font-medium">
          {label}
          {required && <span className="text-destructive mr-1">*</span>}
        </Label>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Popover open={startOpen} onOpenChange={setStartOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-start text-right font-normal",
                !startDateValue && "text-muted-foreground",
                error && "border-destructive"
              )}
            >
              <CalendarIcon className="ml-2 h-4 w-4" />
              <span className="truncate">{formatDateDisplay(startDateValue) || startPlaceholder}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDateValue}
              onSelect={handleStartSelect}
              disabled={(date) => endDateValue ? date > endDateValue : false}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover open={endOpen} onOpenChange={setEndOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full justify-start text-right font-normal",
                !endDateValue && "text-muted-foreground",
                error && "border-destructive"
              )}
            >
              <CalendarIcon className="ml-2 h-4 w-4" />
              <span className="truncate">{formatDateDisplay(endDateValue) || endPlaceholder}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDateValue}
              onSelect={handleEndSelect}
              disabled={(date) => startDateValue ? date < startDateValue : false}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      {error && (
        <p className="text-sm text-destructive text-right">{error}</p>
      )}
    </div>
  )
}

export interface FormDatePickerFieldProps<T extends FieldValues> {
  name: Path<T>
  control: Control<T>
  label?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
  rules?: object
}

export function FormDatePickerField<T extends FieldValues>({
  name,
  control,
  label,
  placeholder = "اختر التاريخ",
  disabled = false,
  className,
  required = false,
  rules,
}: FormDatePickerFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <DatePickerField
          label={label}
          value={field.value}
          onChange={(date) => {
            field.onChange(date ? format(date, "yyyy-MM-dd") : "")
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
          required={required}
          error={fieldState.error?.message}
          id={name}
        />
      )}
    />
  )
}

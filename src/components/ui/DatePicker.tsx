/**
 * DatePicker — wraps react-datepicker with a fully custom header (styled month/year
 * dropdowns, no native OS <select> chrome) and a themed trigger input, matching the
 * rest of the form system's neumorphic pressed-field look (Input.tsx's shadow-neu-pressed).
 */
import { forwardRef, memo, useCallback, useMemo } from "react";
import DatePickerLib, { type ReactDatePickerCustomHeaderProps } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar, X, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_OPTIONS = MONTHS.map((m, i) => ({ value: i, label: m }));

function buildYearRange(selected: Date | null, minDate?: Date, maxDate?: Date): number[] {
  const base = selected ? selected.getFullYear() : new Date().getFullYear();
  const start = minDate ? minDate.getFullYear() : base - 10;
  const end = maxDate ? maxDate.getFullYear() : base + 5;
  const years: number[] = [];
  for (let y = end; y >= start; y--) years.push(y);
  return years;
}

interface StyledSelectOption {
  value: number;
  label: string;
}

interface StyledSelectProps {
  value: number;
  onChange: (value: number) => void;
  options: StyledSelectOption[];
  className?: string;
}

const StyledSelect = memo(function StyledSelect({ value, onChange, options, className = "" }: StyledSelectProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => onChange(Number(e.target.value)),
    [onChange]
  );

  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={handleChange}
        className="appearance-none w-full pl-3 pr-7 py-1.5 text-sm font-semibold text-gray-800 bg-surface-100 border-none rounded-lg shadow-neu-raised-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer transition-shadow active:shadow-neu-pressed-sm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
    </div>
  );
});

const CustomHeader = memo(function CustomHeader({
  date,
  changeMonth,
  changeYear,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
  minDate,
  maxDate,
}: ReactDatePickerCustomHeaderProps & { minDate?: Date; maxDate?: Date }) {
  const yearOptions = useMemo(() => {
    const years = buildYearRange(date, minDate, maxDate);
    return years.map((y) => ({ value: y, label: String(y) }));
  }, [date, minDate, maxDate]);

  return (
    <div className="flex items-center gap-1.5 px-2 pb-2 pt-1">
      <button
        type="button"
        onClick={decreaseMonth}
        disabled={prevMonthButtonDisabled}
        className="p-1 rounded-md hover:shadow-neu-pressed-sm text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-shadow shrink-0 cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <StyledSelect value={date.getMonth()} onChange={changeMonth} options={MONTH_OPTIONS} className="flex-1" />
      <StyledSelect value={date.getFullYear()} onChange={changeYear} options={yearOptions} className="w-24" />

      <button
        type="button"
        onClick={increaseMonth}
        disabled={nextMonthButtonDisabled}
        className="p-1 rounded-md hover:shadow-neu-pressed-sm text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-shadow shrink-0 cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
});

interface CustomInputProps {
  value?: string;
  onClick?: () => void;
  onClear: () => void;
  hasError: boolean;
}

const CustomInput = memo(
  forwardRef<HTMLDivElement, CustomInputProps>(function CustomInput({ value, onClick, onClear, hasError }, ref) {
    const handleClear = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onClear();
      },
      [onClear]
    );

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-shadow bg-surface-100 border-none shadow-neu-pressed ${
          hasError ? "ring-2 ring-danger-500/30" : ""
        }`}
      >
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
        <span className={`flex-1 text-sm ${value ? "text-gray-700" : "text-gray-400"}`}>
          {value || "Select date"}
        </span>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded hover:bg-surface-200 text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  })
);

interface DatePickerProps {
  label?: string;
  /** ISO date string ("yyyy-MM-dd") — the wire format used elsewhere in the app. */
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  error?: string;
}

function DatePicker({ label, value, onChange, minDate, maxDate, error }: DatePickerProps) {
  const selected = useMemo(() => (value ? new Date(value) : null), [value]);
  const minDateObj = useMemo(() => (minDate ? new Date(minDate) : undefined), [minDate]);
  const maxDateObj = useMemo(() => (maxDate ? new Date(maxDate) : undefined), [maxDate]);

  const handleChange = useCallback(
    (date: Date | null) => {
      if (!date) {
        onChange("");
        return;
      }
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      onChange(`${y}-${m}-${d}`);
    },
    [onChange]
  );

  const handleClear = useCallback(() => onChange(""), [onChange]);

  const renderCustomHeader = useCallback(
    (props: ReactDatePickerCustomHeaderProps) => <CustomHeader {...props} minDate={minDateObj} maxDate={maxDateObj} />,
    [minDateObj, maxDateObj]
  );

  const customInput = useMemo(
    () => <CustomInput hasError={!!error} onClear={handleClear} />,
    [error, handleClear]
  );

  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-gray-600">{label}</label>}
      <DatePickerLib
        selected={selected}
        onChange={handleChange}
        minDate={minDateObj}
        maxDate={maxDateObj}
        dateFormat="dd MMM yyyy"
        placeholderText="Select date"
        isClearable={false}
        showPopperArrow={false}
        popperPlacement="bottom-start"
        wrapperClassName="!block"
        renderCustomHeader={renderCustomHeader}
        customInput={customInput}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default memo(DatePicker);

import { CalendarDays } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type DateFieldMode = "date" | "datetime-local";

type DateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  mode?: DateFieldMode;
  required?: boolean;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  id?: string;
};

function pad(value: string) {
  return value.padStart(2, "0");
}

function isValidDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function valueToBrazilian(value: string, mode: DateFieldMode) {
  if (!value) {
    return "";
  }

  const [datePart, timePart = ""] = value.split("T");
  const [year, month, day] = datePart.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return mode === "datetime-local" && timePart ? `${day}/${month}/${year} ${timePart.slice(0, 5)}` : `${day}/${month}/${year}`;
}

function brazilianToValue(text: string, mode: DateFieldMode) {
  const digits = text.replace(/\D/g, "");
  if (digits.length < 8) {
    return null;
  }

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));

  if (!isValidDate(year, month, day)) {
    return null;
  }

  const dateValue = `${year}-${pad(String(month))}-${pad(String(day))}`;

  if (mode === "date") {
    return dateValue;
  }

  const hour = digits.length >= 10 ? Number(digits.slice(8, 10)) : 0;
  const minute = digits.length >= 12 ? Number(digits.slice(10, 12)) : 0;

  if (hour > 23 || minute > 59) {
    return null;
  }

  return `${dateValue}T${pad(String(hour))}:${pad(String(minute))}`;
}

export function DateField({
  value,
  onChange,
  mode = "date",
  required,
  className = "",
  inputClassName = "",
  placeholder,
  min,
  max,
  id
}: DateFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const pickerRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState(() => valueToBrazilian(value, mode));

  useEffect(() => {
    setDisplayValue(valueToBrazilian(value, mode));
  }, [mode, value]);

  function openPicker() {
    const input = pickerRef.current;
    if (!input) {
      return;
    }

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  }

  function commitDisplayValue(nextText: string) {
    const parsed = brazilianToValue(nextText, mode);
    if (parsed) {
      onChange(parsed);
      setDisplayValue(valueToBrazilian(parsed, mode));
      return;
    }

    if (!nextText.trim()) {
      onChange("");
    }
  }

  return (
    <div className={`fl-date-field relative ${className}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 grid size-5 -translate-y-1/2 place-items-center text-red-600">
        <CalendarDays size={18} />
      </span>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        className={`fl-date-field-input w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-12 text-sm font-semibold text-slate-900 outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-500/10 ${inputClassName}`}
        value={displayValue}
        onChange={(event) => {
          const nextText = event.target.value;
          setDisplayValue(nextText);
          commitDisplayValue(nextText);
        }}
        onBlur={() => setDisplayValue(valueToBrazilian(value, mode))}
        placeholder={placeholder ?? (mode === "datetime-local" ? "dd/mm/aaaa hh:mm" : "dd/mm/aaaa")}
        required={required}
      />
      <button
        type="button"
        className="fl-date-field-button absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md border border-slate-200 bg-slate-50 p-0 text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
        onClick={openPicker}
        aria-label="Abrir calendário"
      >
        <CalendarDays size={16} />
      </button>
      <input
        ref={pickerRef}
        type={mode}
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}

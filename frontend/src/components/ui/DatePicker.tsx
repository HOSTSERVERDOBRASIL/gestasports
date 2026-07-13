import { useId } from "react";
import { DateField } from "./DateField";

type DatePickerProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  error?: string;
  required?: boolean;
  className?: string;
};

export function DatePicker({ label, value, onChange, min, max, error, required, className = "" }: DatePickerProps) {
  const fieldId = useId();

  return (
    <div className={`fl-date-picker w-full ${className}`}>
      {label ? (
        <label htmlFor={fieldId} className="mb-1 block text-xs font-black text-slate-700">
          {label}
        </label>
      ) : null}
      <DateField
        id={fieldId}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        required={required}
        inputClassName={error ? "border-red-400 focus:border-red-400 focus:ring-red-500/10" : ""}
      />
      {error ? <p className="mt-1 text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}

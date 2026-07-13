import { useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> & {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
};

export function Select({ label, options, value, onChange, error, placeholder, id, className = "", disabled, ...rest }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="fl-select-field w-full">
      {label ? (
        <label htmlFor={selectId} className="mb-1 block text-xs font-black text-slate-700">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <select
          id={selectId}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error) || undefined}
          className={`w-full appearance-none rounded-lg border bg-white py-2 pl-3 pr-9 text-sm font-semibold text-slate-900 outline-none transition focus:ring-4 ${
            error ? "border-red-400 focus:border-red-400 focus:ring-red-500/10" : "border-slate-200 focus:border-red-400 focus:ring-red-500/10"
          } disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${className}`}
          {...rest}
        >
          {placeholder ? (
            <option value="" disabled={value !== ""}>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
      </div>
      {error ? <p className="mt-1 text-xs font-semibold text-red-600">{error}</p> : null}
    </div>
  );
}

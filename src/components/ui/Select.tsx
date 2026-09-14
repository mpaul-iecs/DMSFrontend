import ReactSelect, { type GroupBase, type MultiValue, type SelectInstance, type SingleValue } from "react-select";
import { buildSelectStyles } from "./selectStyles";
import { NoLoadingIndicator, SelectDropdownIndicator } from "./SelectIndicators";

/** Plain static dropdown — options are already in hand. For API-backed options, use AsyncSelect. */
interface SelectProps<Option, IsMulti extends boolean = false> {
  label?: string;
  error?: string;
  options: readonly Option[];
  value: IsMulti extends true ? MultiValue<Option> | null : SingleValue<Option>;
  onChange: (value: IsMulti extends true ? MultiValue<Option> : SingleValue<Option>) => void;
  isMulti?: IsMulti;
  isSearchable?: boolean;
  isClearable?: boolean;
  isDisabled?: boolean;
  placeholder?: string;
  className?: string;
  selectRef?: React.Ref<SelectInstance<Option, IsMulti, GroupBase<Option>>>;
}

export default function Select<Option, IsMulti extends boolean = false>({
  label,
  error,
  options,
  value,
  onChange,
  isMulti = false as IsMulti,
  isSearchable = true,
  isClearable = true,
  isDisabled = false,
  placeholder = "Select…",
  className = "",
  selectRef,
}: SelectProps<Option, IsMulti>) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <ReactSelect<Option, IsMulti>
        ref={selectRef}
        options={options}
        value={value}
        onChange={onChange}
        isMulti={isMulti}
        isSearchable={isSearchable}
        isClearable={isClearable}
        isDisabled={isDisabled}
        placeholder={placeholder}
        styles={buildSelectStyles<Option, IsMulti>(!!error)}
        components={{ LoadingIndicator: NoLoadingIndicator, DropdownIndicator: SelectDropdownIndicator }}
        noOptionsMessage={() => "No options"}
        classNamePrefix="ams"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

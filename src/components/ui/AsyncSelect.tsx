import ReactAsyncSelect from "react-select/async";
import type { GroupBase, MultiValue, SelectInstance, SingleValue } from "react-select";
import { buildSelectStyles } from "./selectStyles";
import { NoLoadingIndicator, SelectDropdownIndicator } from "./SelectIndicators";

/** Dropdown backed by an API — pass `loadOptions` (e.g. wrapping a debounced service call). */
interface AsyncSelectProps<Option, IsMulti extends boolean = false> {
  label?: string;
  error?: string;
  loadOptions: (inputValue: string) => Promise<readonly Option[]>;
  value: IsMulti extends true ? MultiValue<Option> | null : SingleValue<Option>;
  onChange: (value: IsMulti extends true ? MultiValue<Option> : SingleValue<Option>) => void;
  isMulti?: IsMulti;
  isSearchable?: boolean;
  isClearable?: boolean;
  isDisabled?: boolean;
  placeholder?: string;
  defaultOptions?: boolean | readonly Option[];
  cacheOptions?: boolean;
  className?: string;
  selectRef?: React.Ref<SelectInstance<Option, IsMulti, GroupBase<Option>>>;
}

export default function AsyncSelect<Option, IsMulti extends boolean = false>({
  label,
  error,
  loadOptions,
  value,
  onChange,
  isMulti = false as IsMulti,
  isSearchable = true,
  isClearable = true,
  isDisabled = false,
  placeholder = "Select…",
  defaultOptions = true,
  cacheOptions = true,
  className = "",
  selectRef,
}: AsyncSelectProps<Option, IsMulti>) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <ReactAsyncSelect<Option, IsMulti>
        ref={selectRef}
        loadOptions={loadOptions}
        defaultOptions={defaultOptions}
        cacheOptions={cacheOptions}
        value={value}
        onChange={onChange}
        isMulti={isMulti}
        isSearchable={isSearchable}
        isClearable={isClearable}
        isDisabled={isDisabled}
        placeholder={placeholder}
        styles={buildSelectStyles<Option, IsMulti>(!!error)}
        components={{ LoadingIndicator: NoLoadingIndicator, DropdownIndicator: SelectDropdownIndicator }}
        loadingMessage={() => "Loading…"}
        noOptionsMessage={({ inputValue }) => (inputValue ? `No results for "${inputValue}"` : "No options")}
        classNamePrefix="ams"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

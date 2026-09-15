import { memo, useMemo } from "react";
import ReactSelect, { type GroupBase, type MultiValue, type SelectInstance, type SingleValue } from "react-select";
import { buildSelectStyles } from "./selectStyles";
import { NoLoadingIndicator, SelectDropdownIndicator } from "./SelectIndicators";
import { IBMPlexSans400, IBMPlexSans600 } from "./Text";

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

const noOptionsMessage = () => "No options";
const selectComponents = { LoadingIndicator: NoLoadingIndicator, DropdownIndicator: SelectDropdownIndicator };

function SelectInner<Option, IsMulti extends boolean = false>({
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
  const styles = useMemo(() => buildSelectStyles<Option, IsMulti>(!!error), [error]);

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <IBMPlexSans600 as="label" className="block text-sm text-gray-700">
          {label}
        </IBMPlexSans600>
      )}
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
        styles={styles}
        components={selectComponents}
        noOptionsMessage={noOptionsMessage}
        classNamePrefix="ams"
      />
      {error && (
        <p className="text-xs text-red-500">
          <IBMPlexSans400>{error}</IBMPlexSans400>
        </p>
      )}
    </div>
  );
}

const Select = memo(SelectInner) as typeof SelectInner;

export default Select;

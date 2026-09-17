import { memo, useMemo } from "react";
import { AsyncPaginate } from "react-select-async-paginate";
import type { GroupBase, MultiValue, SelectInstance, SingleValue } from "react-select";
import type { LoadOptions } from "react-select-async-paginate";
import { buildSelectStyles } from "./selectStyles";
import { NoLoadingIndicator, SelectDropdownIndicator } from "./SelectIndicators";
import { IBMPlexSans400, IBMPlexSans600 } from "./Text";

/**
 * Dropdown backed by a paginated API — "load more on scroll" version of AsyncSelect.tsx,
 * for reference-data lists too large to fetch in one page (e.g. Departments). Pass
 * `loadPageOptions` in react-select-async-paginate's own shape:
 * (search, loadedOptions, additional) => Promise<{ options, hasMore, additional }>.
 * Reuse this for any future menu/dropdown that needs page-on-scroll instead of a single
 * fetch-everything call.
 */
interface AsyncPaginateSelectProps<Option, Additional, IsMulti extends boolean = false> {
  label?: string;
  error?: string;
  loadPageOptions: LoadOptions<Option, GroupBase<Option>, Additional>;
  additional?: Additional;
  value: IsMulti extends true ? MultiValue<Option> | null : SingleValue<Option>;
  onChange: (value: IsMulti extends true ? MultiValue<Option> : SingleValue<Option>) => void;
  isMulti?: IsMulti;
  isSearchable?: boolean;
  isClearable?: boolean;
  isDisabled?: boolean;
  placeholder?: string;
  debounceTimeout?: number;
  className?: string;
  selectRef?: React.Ref<SelectInstance<Option, IsMulti, GroupBase<Option>>>;
}

const loadingMessage = () => "Loading…";
const noOptionsMessage = ({ inputValue }: { inputValue: string }) =>
  inputValue ? `No results for "${inputValue}"` : "No options";
const selectComponents = { LoadingIndicator: NoLoadingIndicator, DropdownIndicator: SelectDropdownIndicator };

function AsyncPaginateSelectInner<Option, Additional, IsMulti extends boolean = false>({
  label,
  error,
  loadPageOptions,
  additional,
  value,
  onChange,
  isMulti = false as IsMulti,
  isSearchable = true,
  isClearable = true,
  isDisabled = false,
  placeholder = "Select…",
  debounceTimeout = 350,
  className = "",
  selectRef,
}: AsyncPaginateSelectProps<Option, Additional, IsMulti>) {
  const styles = useMemo(() => buildSelectStyles<Option, IsMulti>(!!error), [error]);

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <IBMPlexSans600 as="label" className="block text-sm text-gray-700">
          {label}
        </IBMPlexSans600>
      )}
      <AsyncPaginate<Option, GroupBase<Option>, Additional, IsMulti>
        selectRef={selectRef}
        loadOptions={loadPageOptions}
        additional={additional}
        debounceTimeout={debounceTimeout}
        value={value}
        onChange={onChange}
        isMulti={isMulti}
        isSearchable={isSearchable}
        isClearable={isClearable}
        isDisabled={isDisabled}
        placeholder={placeholder}
        styles={styles}
        components={selectComponents}
        loadingMessage={loadingMessage}
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

const AsyncPaginateSelect = memo(AsyncPaginateSelectInner) as typeof AsyncPaginateSelectInner;

export default AsyncPaginateSelect;

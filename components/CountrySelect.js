"use client";
import Select from "react-select";
import countries from "@/lib/countries-ar-en";
import 'flag-icons/css/flag-icons.min.css';

// Custom Option for dropdown list
const CustomOption = (props) => (
  <div
    {...props.innerProps}
    ref={props.innerRef}
    className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${props.isFocused ? 'bg-emerald-50' : ''}`}
    dir="rtl"
    style={{ fontWeight: props.isSelected ? "bold" : "normal" }}
  >
    <span
      className={`fi fi-${props.data.value.toLowerCase()}`}
      style={{
        width: 16,
        height: 12,
        borderRadius: 3,
        display: 'inline-block',
        flexShrink: 0,
        marginLeft: 4
      }}
    />
    <span style={{ color: "#222", fontSize: "0.93rem", fontWeight: "bold", whiteSpace: "nowrap" }}>
      {props.data.label}
    </span>
  </div>
);

// Custom Single Value for selected item in input
const CustomSingleValue = (props) => (
  <div
    className="flex items-center gap-1"
    dir="rtl"
    style={{
      maxWidth: "100%",
      minWidth: 0,
      overflow: "hidden"
    }}
  >
    <span
      className={`fi fi-${props.data.value.toLowerCase()}`}
      style={{
        width: 16,
        height: 12,
        borderRadius: 3,
        display: 'inline-block',
        flexShrink: 0,
        marginLeft: 3
      }}
    />
    <span
      style={{
        color: "#222",
        fontSize: "0.93rem",
        fontWeight: "bold",
        textOverflow: "ellipsis",
        overflow: "hidden",
        whiteSpace: "nowrap",
        direction: "rtl",
        minWidth: 0,
        maxWidth: "100%",
        flex: 1,
        display: "block"
      }}
    >
      {props.data.label}
    </span>
  </div>
);

function CountrySelect({
  label = "الدولة",
  name = "country",
  value,
  onChange,
  required,
  placeholder = "اختر الدولة",
  isSearchable = true,
  ...rest
}) {
  return (
    <div className="flex flex-col gap-1 w-full max-w-xl">
      <label className="font-semibold text-gray-800 leading-5 mb-1">
        {label}
        {required && <span className="text-rose-600 font-bold ml-1">*</span>}
      </label>
      <Select
        options={countries}
        value={countries.find(c => c.value === value) || null}
        onChange={opt => onChange && onChange({ name, value: opt?.value })}
        placeholder={placeholder}
        isSearchable={isSearchable}
        components={{
          Option: CustomOption,
          SingleValue: CustomSingleValue,
        }}
        classNamePrefix="country-select"
        name={name}
        required={required}
        maxMenuHeight={260}
        styles={{
          control: (base, state) => ({
            ...base,
            borderRadius: "14px",
            borderColor: state.isFocused ? "#10b981" : "#d1d5db",
            boxShadow: state.isFocused ? "0 0 0 2px #6ee7b7" : "none",
            minHeight: 42,
            height: 42,
            fontWeight: "bold",
            fontSize: "0.93rem",
            direction: "rtl",
            paddingRight: 10,
            background: "#f9fafb",
            transition: "border 0.2s, box-shadow 0.2s",
            maxWidth: "100%",
            overflow: "hidden",
          }),
          menu: (base) => ({
            ...base,
            borderRadius: "12px",
            boxShadow: "0 8px 24px 0 rgba(16,185,129,0.10)",
            direction: "rtl",
            zIndex: 15,
          }),
          placeholder: (base) => ({
            ...base,
            color: "#7c7c7c",
            fontWeight: "bold",
            direction: "rtl",
            fontSize: "0.93rem",
          }),
          option: (base, state) => ({
            ...base,
            color: state.isDisabled ? "#aaa" : "#222",
            fontWeight: state.isSelected ? "bold" : "normal",
            backgroundColor: state.isSelected
              ? "#d1fae5"
              : state.isFocused
              ? "#f0fdfa"
              : "#fff",
            direction: "rtl",
            fontSize: "0.93rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5em",
          }),
          singleValue: (base) => ({
            ...base,
            color: "#222",
            fontWeight: "bold",
            direction: "rtl",
            display: "flex",
            alignItems: "center",
            gap: "0.3em",
            maxWidth: "100%",
            minWidth: 0,
            overflow: "hidden",
            fontSize: "0.93rem"
          }),
          input: (base) => ({
            ...base,
            color: "#222",
            direction: "rtl",
            fontSize: "0.93rem",
            margin: 0,
            padding: 0,
            minWidth: 0
          }),
          indicatorsContainer: (base) => ({
            ...base,
            flexDirection: "row-reverse",
          }),
          dropdownIndicator: (base) => ({
            ...base,
            color: "#10b981",
            paddingLeft: 10,
            paddingRight: 6,
          }),
          valueContainer: (base) => ({
            ...base,
            direction: "rtl",
            paddingRight: 8,
            maxWidth: "100%",
            minWidth: 0,
            overflow: "hidden",
            display: "flex",
            alignItems: "center"
          }),
        }}
        {...rest}
      />
    </div>
  );
}

export default CountrySelect;
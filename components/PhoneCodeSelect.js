"use client";
import Select from "react-select";
import PHONE_CODES from "@/lib/phone-codes";
import 'flag-icons/css/flag-icons.min.css';

// Custom Option for dropdown list
const CustomOption = (props) => (
  <div
    {...props.innerProps}
    ref={props.innerRef}
    className={`flex items-center gap-1 px-2 py-2 cursor-pointer ${props.isFocused ? 'bg-emerald-50' : ''}`}
    dir="rtl"
    style={{ fontWeight: props.isSelected ? "bold" : "normal" }}
  >
    <span
      className={`fi fi-${props.data.flag}`}
      style={{
        width: 16,
        height: 12,
        borderRadius: 2,
        display: 'inline-block',
        flexShrink: 0,
        marginLeft: 3,
      }}
    />
    <span style={{ color: "#222", fontSize: "0.91rem", fontWeight: "bold", whiteSpace: "nowrap" }}>
      {props.data.code} - {props.data.labelAr || props.data.label}
    </span>
  </div>
);

const CustomSingleValue = (props) => (
  <div className="flex items-center gap-1" dir="rtl" style={{maxWidth:"100%",overflow:"hidden"}}>
    <span className={`fi fi-${props.data.flag}`} style={{
      width: 16,
      height: 12,
      borderRadius: 2,
      display: 'inline-block',
      flexShrink: 0,
      marginLeft: 3
    }}/>
    <span style={{
      color: "#222",
      fontSize: "0.91rem",
      fontWeight: "bold",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      flex: 1,
      minWidth: 0,
      maxWidth: "100%"
    }}>
      {props.data.code} - {props.data.labelAr || props.data.label}
    </span>
  </div>
);

function PhoneCodeSelect({
  value,           // يمكن أن يكون string (مثل "+971") أو object من الخيارات
  onChange,
  required = false,
  name = "phoneCode",
  ...rest
}) {
  // دائماً اجعل القيمة المختارة عبارة عن object من قائمة PHONE_CODES
  const selectedOption =
    typeof value === "string"
      ? PHONE_CODES.find(c => c.code === value) || null
      : value || null;

  return (
    <Select
      name={name}
      options={PHONE_CODES}
      value={selectedOption}
      onChange={opt => onChange && onChange({ name, value: opt?.code })}
      required={required}
      placeholder="اختر كود الدولة"
      isSearchable
      classNamePrefix="phone-code-select"
      components={{
        Option: CustomOption,
        SingleValue: CustomSingleValue,
      }}
      styles={{
        control: (base, state) => ({
          ...base,
          borderRadius: "14px",
          borderColor: state.isFocused ? "#10b981" : "#d1d5db",
          background: "#f9fafb",
          fontWeight: "bold",
          fontSize: "0.91rem",
          minHeight: 44,
          height: 44,
          direction: "rtl",
          paddingRight: 10,
          maxWidth: "100%",
          boxShadow: state.isFocused ? "0 0 0 2px #6ee7b7" : "none",
          display: "flex",
          alignItems: "center",
        }),
        valueContainer: (base) => ({
          ...base,
          direction: "rtl",
          alignItems: "center",
          height: 44,
          padding: 0,
          maxWidth: "100%",
          minWidth: 0,
          overflow: "hidden",
          display: "flex",
        }),
        input: (base) => ({
          ...base,
          color: "#222",
          direction: "rtl",
          fontSize: "0.91rem",
          margin: 0,
          padding: 0,
        }),
        singleValue: (base) => ({
          ...base,
          color: "#222",
          fontWeight: "bold",
          direction: "rtl",
          display: "flex",
          alignItems: "center",
          gap: "0.2em",
          maxWidth: "100%",
          minWidth: 0,
          overflow: "hidden"
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
          fontSize: "0.91rem",
          display: "flex",
          alignItems: "center",
          gap: "0.2em",
        }),
        indicatorsContainer: (base) => ({
          ...base,
          alignItems: "center",
          height: 44,
          padding: 0,
          display: "flex",
        }),
        dropdownIndicator: (base) => ({
          ...base,
          color: "#777",
          padding: 0,
          margin: 0,
          display: "flex",
          alignItems: "center",
          height: 44,
        }),
        menu: (base) => ({
          ...base,
          zIndex: 99,
        }),
        placeholder: (base) => ({
          ...base,
          color: "#7c7c7c",
          fontWeight: "bold",
          direction: "rtl",
          fontSize: "0.91rem",
        }),
      }}
      {...rest}
    />
  );
}

export default PhoneCodeSelect;
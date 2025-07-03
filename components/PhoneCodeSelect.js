"use client";
import Select from "react-select";
import 'flag-icons/css/flag-icons.min.css';
import { PHONE_CODES } from "@/lib/phone-codes";

const customOption = (props) => (
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

const customSingleValue = (props) => (
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

export default function PhoneCodeSelect({ value, onChange, required = false, name = "phoneCode", ...rest }) {
  return (
    <Select
      name={name}
      options={PHONE_CODES}
      value={PHONE_CODES.find(c => c.code === value) || null}
      onChange={opt => onChange({ target: { name, value: opt?.code } })}
      required={required}
      placeholder="اختر كود الدولة"
      isSearchable
      classNamePrefix="country-select"
      components={{
        Option: customOption,
        SingleValue: customSingleValue,
      }}
      styles={{
        control: (base) => ({
          ...base,
          borderRadius: "14px",
          borderColor: "#d1d5db",
          background: "#f9fafb",
          fontWeight: "bold",
          fontSize: "0.91rem",
          minHeight: 44,
          height: 44,
          direction: "rtl",
          paddingRight: 10,
          maxWidth: "100%",
          boxShadow: "none",
          display: "flex",
          alignItems: "center", // مهم جداً لوسطية السهم وباقي العناصر
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
          display: "flex", // مهم!
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
          height: 44, // اجبار السهم أن يكون في وسط الحقل
        }),
        menu: (base) => ({
          ...base,
          zIndex: 99,
        }),
      }}
      {...rest}
    />
  );
}
import React, { useRef } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import PropTypes from "prop-types";

/**
 * PasswordField - احترافي ومتاح لإعادة الاستخدام، يدعم سهولة الوصول (accessibility)
 *
 * Props:
 * - label: نص عنوان الحقل (مطلوب)
 * - name: اسم الحقل (مطلوب)
 * - value: قيمة الحقل (مطلوب)
 * - show: إظهار الباسورد أم لا (مطلوب)
 * - onChange: دالة تغيير القيمة (مطلوب)
 * - toggleShow: دالة تبديل الإظهار/الإخفاء (مطلوب)
 * - placeholder: نص افتراضي للحقل (اختياري)
 * - lang: لغة الحقل ("ar" أو "en") (اختياري لتحسين الاتجاه)
 * - error: رسالة خطأ لعرضها أسفل الحقل (اختياري)
 * - required: هل الحقل مطلوب أم لا (اختياري)
 * - disabled: تعطيل الحقل (اختياري)
 */

const PasswordField = React.memo(function PasswordField({
  label,
  name,
  value,
  show,
  onChange,
  toggleShow,
  placeholder = "",
  lang = "en",
  error = "",
  required = false,
  disabled = false,
  ...rest
}) {
  const inputRef = useRef();

  const handleToggleShow = () => {
    toggleShow();
    setTimeout(() => {
      inputRef.current?.focus();
      if (inputRef.current?.setSelectionRange) {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }, 0);
  };

  return (
    <div className="flex flex-col gap-1 relative">
      <label
        htmlFor={name}
        className="font-semibold text-gray-800 leading-5"
        aria-label={label}
      >
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={name}
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="new-password"
          required={required}
          disabled={disabled}
          aria-required={required}
          aria-invalid={!!error}
          aria-label={label}
          dir={lang === "ar" ? "rtl" : "ltr"}
          className={`rounded-xl bg-gray-50 border px-3 py-2 pr-10 shadow-sm font-medium transition-all outline-none placeholder:text-gray-400
            ${error ? "border-red-400 focus:border-red-500 focus:ring-red-300" : "border-gray-300 focus:border-emerald-500 focus:ring-emerald-300"}
            ${disabled ? "opacity-60 cursor-not-allowed" : "text-gray-900"}
          `}
          {...rest}
        />
        <button
          type="button"
          onClick={handleToggleShow}
          className="absolute top-1/2 left-2 transform -translate-y-1/2 text-emerald-400"
          tabIndex={0}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          style={{ cursor: disabled ? "not-allowed" : "pointer" }}
          disabled={disabled}
        >
          {show ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
      {error && (
        <span className="text-xs text-red-600 font-medium mt-1" role="alert">
          {error}
        </span>
      )}
    </div>
  );
});

PasswordField.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  show: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  toggleShow: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  lang: PropTypes.string,
  error: PropTypes.string,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
};

export default PasswordField;
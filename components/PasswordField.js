import React, { useRef } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import PropTypes from "prop-types";

// دالة تحقق قوة الباسورد
function getPasswordErrors(password) {
  const errors = [];
  if (typeof password !== "string" || password.length < 8)
    errors.push("كلمة المرور يجب ألا تقل عن 8 أحرف.");
  if (!/[A-Z]/.test(password))
    errors.push("يجب أن تحتوي على حرف كبير واحد على الأقل.");
  if (!/\d/.test(password))
    errors.push("يجب أن تحتوي على رقم واحد على الأقل.");
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password))
    errors.push("يجب أن تحتوي على رمز خاص واحد على الأقل.");
  return errors;
}

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
  passwordConfirm = "",     // كلمة المرور التأكيدية
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

  // تحقق من مطابقة كلمة المرور والتأكيد
  const matchError = passwordConfirm !== undefined && passwordConfirm !== "" && passwordConfirm !== value
    ? "كلمة المرور وتأكيد كلمة المرور غير متطابقين."
    : "";

  // تحقق من قوة الباسورد
  const passwordErrors = getPasswordErrors(value);

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
          aria-invalid={!!error || !!matchError || passwordErrors.length > 0}
          aria-label={label}
          dir={lang === "ar" ? "rtl" : "ltr"}
          className={`rounded-xl bg-gray-50 border px-3 py-2 pr-10 shadow-sm font-medium transition-all outline-none placeholder:text-gray-400
            ${(error || matchError || passwordErrors.length > 0) ? "border-red-400 focus:border-red-500 focus:ring-red-300" : "border-gray-300 focus:border-emerald-500 focus:ring-emerald-300"}
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
      {/* رسائل الخطأ */}
      {error && (
        <span className="text-xs text-red-600 font-medium mt-1" role="alert">
          {error}
        </span>
      )}
      {matchError && (
        <span className="text-xs text-red-600 font-medium mt-1" role="alert">
          {matchError}
        </span>
      )}
      {passwordErrors.length > 0 && (
        <ul className="text-xs text-red-600 font-medium mt-1" role="alert">
          {passwordErrors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}
      {/* تعليمات أمان */}
      <div className="text-xs text-gray-500 mt-1">
        يجب أن تحتوي كلمة المرور على: حرف كبير، رقم، رمز خاص، وألا تقل عن 8 أحرف.
      </div>
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
  passwordConfirm: PropTypes.string, // أضف هذا
};

export default PasswordField;
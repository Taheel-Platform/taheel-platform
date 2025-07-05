"use client";
import { Suspense } from "react";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FaLock, FaUser, FaEye, FaEyeSlash, FaWhatsapp } from "react-icons/fa";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase.client";
import { GlobalLoader } from "@/components/GlobalLoader";


const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

// Force dynamic rendering to prevent static export issues
export const dynamic = 'force-dynamic';


const LANGUAGES = {
  ar: {
    login: "تسجيل الدخول",
    welcome: "مرحباً بك !",
    platform: "منصة",
    clientOrEmail: "رقم العميل أو البريد الإلكتروني",
    password: "كلمة المرور",
    remember: "تذكرني",
    forgot: "نسيت كلمة المرور؟",
    submit: "تسجيل الدخول",
    newUser: "مستخدم جديد؟ أنشئ حساب",
    recaptchaCheck: "يرجى التحقق من reCAPTCHA",
    recaptchaFail: "فشل التحقق من reCAPTCHA، حاول مرة أخرى.",
    wrongClient: "رقم العميل غير صحيح أو لا يوجد حساب بهذا الرقم.",
    emailVerify: "يجب تفعيل بريدك الإلكتروني أولاً. تحقق من بريدك واضغط على رابط التفعيل.",
    notFound: "لم يتم العثور على بيانات المستخدم!",
    phoneVerify: "يجب تفعيل رقم الجوال أولاً.",
    wrongLogin: "بيانات الدخول غير صحيحة أو هناك مشكلة في الاتصال!",
    verified: "✔ تم التحقق",
    recaptcha: "Google reCAPTCHA",
    rights: "© 2025 تأهيل. جميع الحقوق محفوظة",
    success: "تم تسجيل الدخول بنجاح!",
    resend: "إعادة إرسال رابط التفعيل",
    sending: "يتم الإرسال...",
    resendSuccess: "تم إرسال رابط التفعيل إلى بريدك الإلكتروني!",
    resendError: "حدث خطأ أثناء إرسال رابط التفعيل.",
  },
  en: {
    login: "Login",
    welcome: "Welcome!",
    platform: "TAHEEL Platform",
    clientOrEmail: "Client Number or Email",
    password: "Password",
    remember: "Remember me",
    forgot: "Forgot password?",
    submit: "Login",
    newUser: "New user? Create account",
    recaptchaCheck: "Please verify reCAPTCHA",
    recaptchaFail: "reCAPTCHA verification failed, try again.",
    wrongClient: "Client number is incorrect or does not exist.",
    emailVerify: "Please verify your email address first.",
    notFound: "User data not found!",
    phoneVerify: "You must verify your phone number first.",
    wrongLogin: "Incorrect login credentials or connection problem!",
    verified: "✔ Verified",
    recaptcha: "Google reCAPTCHA",
    rights: "© 2025 Taheel. All rights reserved",
    success: "Login successful!",
    resend: "Resend Activation Link",
    sending: "Sending...",
    resendSuccess: "Activation link sent to your email!",
    resendError: "Error sending activation link.",
  }
};

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lang, setLang] = useState(searchParams.get("lang") === "en" ? "en" : "ar");
  const t = LANGUAGES[lang];

  const [loginId, setLoginId] = useState(""); // إيميل أو رقم عميل
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [recaptchaOk, setRecaptchaOk] = useState(false);

  // لحالات التفعيل
  const [unverifiedUser, setUnverifiedUser] = useState(null);
  const [sendingVerify, setSendingVerify] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");

  // لحفظ صفحة العودة
  const prev = searchParams.get("prev");

  // تحميل مكتبة reCAPTCHA v3 مرة واحدة فقط
  useEffect(() => {
    if (typeof window !== "undefined" && !window.grecaptcha) {
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  function isEmail(val) {
    return val.includes("@");
  }

  // تحقق reCAPTCHA v3 backend
  async function verifyRecaptcha(token) {
    try {
      const res = await fetch("/api/recaptcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      return data.success && (typeof data.score !== "number" || data.score > 0.5);
    } catch {
      return false;
    }
  }

  // تسجيل الدخول والتوجيه حسب الدور وبشكل مضمون
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    setUnverifiedUser(null);
    setVerifyMsg("");

    // reCAPTCHA v3
    let recaptchaToken = "";
    if (typeof window !== "undefined" && window.grecaptcha) {
      try {
        await new Promise((resolve) => window.grecaptcha.ready(resolve));
        recaptchaToken = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: "login" });
        if (!recaptchaToken) {
          setLoading(false);
          setRecaptchaOk(false);
          setErrorMsg(t.recaptchaCheck);
          return;
        }
      } catch (err) {
        setLoading(false);
        setRecaptchaOk(false);
        setErrorMsg(t.recaptchaCheck);
        return;
      }
    } else {
      setLoading(false);
      setRecaptchaOk(false);
      setErrorMsg(t.recaptchaCheck);
      return;
    }

    // تحقق من Google reCAPTCHA في الـ backend
    const recaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!recaptchaValid) {
      setLoading(false);
      setRecaptchaOk(false);
      setErrorMsg(t.recaptchaFail);
      return;
    }
    setRecaptchaOk(true);

    try {
      let emailToUse = loginId;
      if (!isEmail(loginId)) {
        // بحث عن العميل بالرقم في Firestore
        const q = query(collection(firestore, "users"), where("customerId", "==", loginId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          emailToUse = querySnapshot.docs[0].data().email;
        } else {
          setLoading(false);
          setErrorMsg(t.wrongClient);
          return;
        }
      }
      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
      const user = userCredential.user;
      if (!user.emailVerified) {
        setLoading(false);
        setErrorMsg(t.emailVerify);
        setUnverifiedUser(user); // خزّن المستخدم غير المفعل
        return;
      }
      const docRef = doc(firestore, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        setLoading(false);
        setErrorMsg(t.notFound);
        return;
      }
      const data = docSnap.data();
      if (data.phoneVerified === false) {
        setLoading(false);
        setErrorMsg(t.phoneVerify);
        return;
      }
      const role = data.role || data.type || "client";

      // أضف هنا حفظ الـ userId واسم المستخدم في localStorage
      window.localStorage.setItem("userId", user.uid);
      window.localStorage.setItem("userName", data.name || "موظف");

      // التوجيه حسب الدور
      let dashboardPath = "/dashboard/client";
      if (role === "admin" || role === "superadmin") dashboardPath = "/dashboard/admin";
      else if (role === "employee") dashboardPath = "/dashboard/employee";
      else if (role === "manager") dashboardPath = "/dashboard/manager";

      // إذا فيه prev صالح (وليس /login أو / أو الصفحة الحالية)، وجه له. غير ذلك وجه للوحة الدور
      if (
        prev &&
        prev !== "/login" &&
        prev !== "/" &&
        prev !== window.location.pathname
      ) {
        router.replace(prev);
      } else {
        router.replace(dashboardPath);
      }
    } catch (e) {
      setErrorMsg(t.wrongLogin);
    }
    setLoading(false);
  };

  const handleLang = (lng) => {
    setLang(lng);
    const params = new URLSearchParams(searchParams);
    params.set("lang", lng);
    router.replace(`?${params.toString()}`);
  };

  // إعادة إرسال رابط التفعيل
  const handleResendActivation = async () => {
    if (!unverifiedUser) return;
    setSendingVerify(true);
    setVerifyMsg("");
    try {
      // Lazy import for tree-shaking (حتى لا تُضاف كل مكتبة auth في الباندل)
      const mod = await import("firebase/auth");
      await mod.sendEmailVerification(unverifiedUser);
      setVerifyMsg(t.resendSuccess);
    } catch {
      setVerifyMsg(t.resendError);
    }
    setSendingVerify(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-gradient-to-br from-[#0b131e] via-[#22304a] to-[#1d4d40] font-sans relative overflow-x-hidden"
      dir={lang === "ar" ? "rtl" : "ltr"}
      lang={lang}
    >
      {/* خلفية زخرفية */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-28 -left-20 w-[350px] h-[350px] bg-emerald-400 opacity-20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-0 right-0 w-[220px] h-[220px] bg-gradient-to-br from-emerald-900 to-emerald-400 opacity-30 rounded-full blur-2xl" />
        <svg className="absolute bottom-0 left-0 w-full h-24 md:h-32 opacity-30" viewBox="0 0 500 80" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 80 Q250 0 500 80V100H0V80Z" fill="#10b981" />
        </svg>
      </div>
      {/* زر تبديل اللغة */}
      <div className="absolute left-4 top-4 z-20 flex gap-2">
        <button
          className={`px-3 py-1 rounded-md text-xs font-bold shadow ${lang === "ar" ? "bg-emerald-500 text-white" : "bg-white text-emerald-700"} transition`}
          onClick={() => handleLang("ar")}
          tabIndex={0}
        >
          العربية
        </button>
        <button
          className={`px-3 py-1 rounded-md text-xs font-bold shadow ${lang === "en" ? "bg-emerald-500 text-white" : "bg-white text-emerald-700"} transition`}
          onClick={() => handleLang("en")}
          tabIndex={0}
        >
          English
        </button>
      </div>
      {/* الهيدر والشعار */}
      <header className="flex flex-col items-center justify-center py-10 z-10 relative">
        <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center rounded-full bg-white shadow-lg ring-4 ring-emerald-400 mb-6">
          <Image
            src="/logo-transparent-large.png"
            alt={lang === "ar" ? "شعار تأهيل" : "Taheel Logo"}
            width={110}
            height={110}
            className="object-contain"
            priority
          />
        </div>
        <h1 className="heading-global text-3xl sm:text-4xl mb-2 drop-shadow-lg text-center">
          {lang === "ar" ? (
            <>
              منصة <span className="text-emerald-400">تأهيل</span> - {t.login}
            </>
          ) : (
            <>
              {t.platform} <span className="text-emerald-400">- {t.login}</span>
            </>
          )}
        </h1>
        <p className="text-gray-200 text-lg mb-4 font-medium">{t.welcome}</p>
      </header>

      {/* نموذج تسجيل الدخول */}
      <main className="w-full max-w-md mx-auto card-global p-10 space-y-7 mt-2 z-10 relative">
        {errorMsg && (
          <div className="bg-red-900/80 text-red-200 p-3 rounded text-center mb-2 animate-shake">
            {errorMsg}
            {unverifiedUser && (
              <div className="mt-3 flex flex-col items-center gap-1">
                <button
                  type="button"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow"
                  disabled={sendingVerify}
                  onClick={handleResendActivation}
                >
                  {sendingVerify ? t.sending : t.resend}
                </button>
                {verifyMsg && (
                  <span className="text-xs text-emerald-200 mt-2">{verifyMsg}</span>
                )}
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleLogin} autoComplete="on" className="space-y-5">
          {/* رقم العميل أو البريد الإلكتروني */}
          <div className="relative">
            <input
              type="text"
              required
              autoFocus
              autoComplete="username"
              value={loginId}
              onChange={e => setLoginId(e.target.value)}
              placeholder={t.clientOrEmail}
              className="w-full py-3 px-4 pr-12 rounded-xl bg-[#1e2e41] text-emerald-200 placeholder-gray-400 border border-emerald-700 focus:ring-2 focus:ring-emerald-400 outline-none transition font-semibold text-lg shadow"
              dir={lang === "ar" ? "rtl" : "ltr"}
            />
            <FaUser className="absolute top-1/2 right-4 -translate-y-1/2 text-emerald-400" size={20} />
          </div>
          {/* كلمة المرور */}
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t.password}
              className="w-full py-3 px-4 pr-12 rounded-xl bg-[#1e2e41] text-emerald-200 placeholder-gray-400 border border-emerald-700 focus:ring-2 focus:ring-emerald-400 outline-none transition font-semibold text-lg shadow"
              dir={lang === "ar" ? "rtl" : "ltr"}
            />
            <FaLock className="absolute top-1/2 right-4 -translate-y-1/2 text-emerald-400" size={20} />
            <button
              type="button"
              className="absolute top-1/2 left-4 -translate-y-1/2 text-emerald-200 hover:text-emerald-400 transition"
              onClick={() => setShowPass(s => !s)}
              tabIndex={-1}
              aria-label={showPass ? (lang === "ar" ? "إخفاء كلمة المرور" : "Hide password") : (lang === "ar" ? "عرض كلمة المرور" : "Show password")}
            >
              {showPass ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
            </button>
          </div>
          {/* زر واتساب فوق الريكابتشا */}
          <div className="flex justify-end w-full mb-2">
            <a
              href="https://wa.me/971555555555"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg p-3 text-xl transition-all"
              title="تواصل عبر واتساب"
              style={{ zIndex: 10 }}
            >
              <FaWhatsapp />
            </a>
          </div>
          {/* الريكابتشا Google reCAPTCHA v3 (مخفي - تنفيذي فقط) */}
          <div className="my-2 flex justify-center">
            <div className="w-full flex justify-center">
              {recaptchaOk ? (
                <span className="text-green-400 text-xs flex items-center gap-1">
                  <span>{t.verified}</span>
                </span>
              ) : (
                <span className="text-gray-400 text-xs flex items-center gap-1">
                  {t.recaptcha} v3
                </span>
              )}
            </div>
          </div>
          {/* تذكرني ونسيت كلمة المرور */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-emerald-100 cursor-pointer select-none font-medium">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="accent-emerald-500 scale-110"
              />
              {t.remember}
            </label>
            <button
              type="button"
              className="text-emerald-400 hover:underline text-sm"
              onClick={() => router.push(`/forgot-password?lang=${lang}`)}
            >
              {t.forgot}
            </button>
          </div>
          {/* زر الدخول */}
          <button
            type="submit"
            disabled={loading}
            className="btn-global w-full py-3 rounded-2xl text-xl shadow-xl mt-2 flex items-center justify-center gap-2
              focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
            style={{ cursor: loading ? "wait" : "pointer" }}
          >
            {loading ? (
              <span className="animate-spin h-6 w-6 border-2 border-emerald-900 border-t-transparent rounded-full inline-block"></span>
            ) : (
              t.submit
            )}
          </button>
        </form>
        {/* مستخدم جديد */}
        <div className="flex flex-col items-center mt-3 gap-2">
          <button
            className="w-full py-2 rounded-xl bg-[#253745] hover:bg-[#11212D] text-emerald-200 font-semibold border border-emerald-800 flex items-center justify-center gap-3 shadow transition text-base"
            onClick={() => router.push(`/register?lang=${lang}`)}
          >
            {t.newUser}
          </button>
        </div>
      </main>
      {loading && <GlobalLoader />}
      <div className="h-10 z-0" />

      {/* الفوتر */}
      <footer className="w-full flex flex-col items-center justify-center mt-8 mb-6 z-10 relative">
        <Image
          src="/logo-transparent-large.png"
          alt={lang === "ar" ? "شعار تأهيل" : "Taheel Logo"}
          width={50}
          height={50}
          className="rounded-full bg-white ring-2 ring-emerald-400 shadow mb-4"
        />
        <div className="text-sm text-gray-400 text-center font-bold">
          {t.rights}
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

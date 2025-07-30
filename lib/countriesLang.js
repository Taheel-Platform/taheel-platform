const countriesLang = [
  // الدول العربية
  { code: "AE", name: "الإمارات", lang: "ar", flag: "🇦🇪" },
  { code: "SA", name: "السعودية", lang: "ar", flag: "🇸🇦" },
  { code: "EG", name: "مصر", lang: "ar", flag: "🇪🇬" },
  { code: "JO", name: "الأردن", lang: "ar", flag: "🇯🇴" },
  { code: "KW", name: "الكويت", lang: "ar", flag: "🇰🇼" },
  { code: "QA", name: "قطر", lang: "ar", flag: "🇶🇦" },
  { code: "OM", name: "عمان", lang: "ar", flag: "🇴🇲" },
  { code: "BH", name: "البحرين", lang: "ar", flag: "🇧🇭" },
  { code: "DZ", name: "الجزائر", lang: "ar", flag: "🇩🇿" },
  { code: "MA", name: "المغرب", lang: "ar", flag: "🇲🇦" },
  { code: "TN", name: "تونس", lang: "ar", flag: "🇹🇳" },
  { code: "LB", name: "لبنان", lang: "ar", flag: "🇱🇧" },
  { code: "SY", name: "سوريا", lang: "ar", flag: "🇸🇾" },
  { code: "IQ", name: "العراق", lang: "ar", flag: "🇮🇶" },
  { code: "PS", name: "فلسطين", lang: "ar", flag: "🇵🇸" },
  { code: "SD", name: "السودان", lang: "ar", flag: "🇸🇩" },
  { code: "YE", name: "اليمن", lang: "ar", flag: "🇾🇪" },
  { code: "LY", name: "ليبيا", lang: "ar", flag: "🇱🇾" },
  { code: "MR", name: "موريتانيا", lang: "ar", flag: "🇲🇷" },
  { code: "DJ", name: "جيبوتي", lang: "ar", flag: "🇩🇯" },
  { code: "SO", name: "الصومال", lang: "ar", flag: "🇸🇴" },

  // دول أوروبا
  { code: "FR", name: "France", lang: "fr", flag: "🇫🇷" },
  { code: "DE", name: "Germany", lang: "de", flag: "🇩🇪" },
  { code: "ES", name: "Spain", lang: "es", flag: "🇪🇸" },
  { code: "IT", name: "Italy", lang: "it", flag: "🇮🇹" },
  { code: "GB", name: "United Kingdom", lang: "en", flag: "🇬🇧" },
  { code: "RU", name: "Russia", lang: "ru", flag: "🇷🇺" },
  { code: "UA", name: "Ukraine", lang: "uk", flag: "🇺🇦" },
  { code: "SE", name: "Sweden", lang: "sv", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", lang: "de", flag: "🇨🇭" },
  { code: "NL", name: "Netherlands", lang: "nl", flag: "🇳🇱" },
  { code: "BE", name: "Belgium", lang: "fr", flag: "🇧🇪" },
  { code: "PL", name: "Poland", lang: "pl", flag: "🇵🇱" },
  { code: "RO", name: "Romania", lang: "ro", flag: "🇷🇴" },
  { code: "PT", name: "Portugal", lang: "pt", flag: "🇵🇹" },
  { code: "GR", name: "Greece", lang: "el", flag: "🇬🇷" },
  { code: "NO", name: "Norway", lang: "no", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", lang: "da", flag: "🇩🇰" },
  { code: "FI", name: "Finland", lang: "fi", flag: "🇫🇮" },
  { code: "IE", name: "Ireland", lang: "en", flag: "🇮🇪" },

  // أمريكا الشمالية
  { code: "US", name: "United States", lang: "en", flag: "🇺🇸" },
  { code: "CA", name: "Canada", lang: "en", flag: "🇨🇦" },
  { code: "MX", name: "Mexico", lang: "es", flag: "🇲🇽" },

  // أمريكا الجنوبية
  { code: "BR", name: "Brazil", lang: "pt", flag: "🇧🇷" },
  { code: "AR", name: "Argentina", lang: "es", flag: "🇦🇷" },
  { code: "CO", name: "Colombia", lang: "es", flag: "🇨🇴" },
  { code: "CL", name: "Chile", lang: "es", flag: "🇨🇱" },
  { code: "PE", name: "Peru", lang: "es", flag: "🇵🇪" },
  { code: "VE", name: "Venezuela", lang: "es", flag: "🇻🇪" },

  // آسيا
  { code: "CN", name: "China", lang: "zh", flag: "🇨🇳" },
  { code: "JP", name: "Japan", lang: "ja", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", lang: "ko", flag: "🇰🇷" },
  { code: "IN", name: "India", lang: "en", flag: "🇮🇳" },
  { code: "TR", name: "Turkey", lang: "tr", flag: "🇹🇷" },
  { code: "TH", name: "Thailand", lang: "th", flag: "🇹🇭" },
  { code: "ID", name: "Indonesia", lang: "id", flag: "🇮🇩" },
  { code: "PH", name: "Philippines", lang: "en", flag: "🇵🇭" },
  { code: "SG", name: "Singapore", lang: "en", flag: "🇸🇬" },
  { code: "MY", name: "Malaysia", lang: "ms", flag: "🇲🇾" },

  // أفريقيا
  { code: "ZA", name: "South Africa", lang: "en", flag: "🇿🇦" },
  { code: "NG", name: "Nigeria", lang: "en", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", lang: "en", flag: "🇰🇪" },
  { code: "GH", name: "Ghana", lang: "en", flag: "🇬🇭" },
  { code: "SD", name: "السودان", lang: "ar", flag: "🇸🇩" },
  { code: "TZ", name: "Tanzania", lang: "en", flag: "🇹🇿" },
  { code: "UG", name: "Uganda", lang: "en", flag: "🇺🇬" },
  { code: "MA", name: "المغرب", lang: "ar", flag: "🇲🇦" },

  // دول أخرى مشهورة
  { code: "RU", name: "Russia", lang: "ru", flag: "🇷🇺" },
  { code: "UA", name: "Ukraine", lang: "uk", flag: "🇺🇦" },
  { code: "IR", name: "Iran", lang: "fa", flag: "🇮🇷" },
  { code: "PK", name: "Pakistan", lang: "ur", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", lang: "bn", flag: "🇧🇩" },
  { code: "VN", name: "Vietnam", lang: "vi", flag: "🇻🇳" },
  { code: "PL", name: "Poland", lang: "pl", flag: "🇵🇱" },
  { code: "CZ", name: "Czechia", lang: "cs", flag: "🇨🇿" },

  // دول صغيرة أو جزر (مثال)
  { code: "IS", name: "Iceland", lang: "is", flag: "🇮🇸" },
  { code: "NZ", name: "New Zealand", lang: "en", flag: "🇳🇿" },
  { code: "FI", name: "Finland", lang: "fi", flag: "🇫🇮" },
  { code: "NO", name: "Norway", lang: "no", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", lang: "da", flag: "🇩🇰" },
  { code: "GR", name: "Greece", lang: "el", flag: "🇬🇷" },
];

// يمكنك إضافة أي دولة أو تعديل اسمها أو رمزها أو اللغة حسب احتياجك

export default countriesLang;
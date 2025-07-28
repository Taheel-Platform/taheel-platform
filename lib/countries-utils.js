import countriesData from "./countries-ar-en";

// قائمة الأكواد للدول العربية (عدّل كما تحب)
const arabicCountries = [
  "EG","SA","AE","SD","DZ","MA","QA","KW","OM","LY","YE","JO","IQ","SY","LB","PS","TN","BH","MR","SO","DJ","KM","YE"
];
// قائمة الأكواد للدول الفرنسية (عدّل كما تحب)
const frenchCountries = [
  "FR","TN","DZ","MA","CI","CM","SN","ML","NE","BF","TG","GN","CD","BJ","CF","CG","GA","TD","MC","LU","HT","MG","ML","RE","RW","SC","SN","TG","VU","WF"
];

const countriesObject = {};
const countriesLang = {};

countriesData.forEach(item => {
  const code = item.value.toUpperCase();
  countriesObject[code] = item.label;
  if (arabicCountries.includes(code)) {
    countriesLang[code] = "ar";
  } else if (frenchCountries.includes(code)) {
    countriesLang[code] = "fr";
  } else {
    countriesLang[code] = "en";
  }
});

export { countriesObject, countriesLang };
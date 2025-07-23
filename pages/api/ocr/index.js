import { promises as fs } from "fs";
import formidable from "formidable";
import vision from "@google-cloud/vision";

export const config = {
  api: { bodyParser: false },
};

// إعداد بيانات الخدمة بشكل آمن
let credentials;
try {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.error("GOOGLE_SERVICE_ACCOUNT_KEY is undefined. تحقق من ملف البيئة .env");
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is undefined. تحقق من ملف البيئة .env");
  }
  console.log("GOOGLE_SERVICE_ACCOUNT_KEY موجود، جاري التحويل إلى JSON...");
  const rawCreds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  console.log("تمت قراءة GOOGLE_SERVICE_ACCOUNT_KEY كـ JSON.");

  if (rawCreds.private_key && rawCreds.private_key.includes("\\n")) {
    rawCreds.private_key = rawCreds.private_key.replace(/\\n/g, '\n');
    console.log("private_key تم تحويل \\n إلى أسطر حقيقة.");
  }
  credentials = rawCreds;
  console.log("بيانات الخدمة جاهزة للـ Vision API.");
} catch (err) {
  console.error("Google Service Account Key Error:", err);
  throw new Error("خطأ في قراءة GOOGLE_SERVICE_ACCOUNT_KEY من ملف البيئة. تأكد من وجوده وصيغته الصحيحة.");
}

const client = new vision.ImageAnnotatorClient({ credentials });

export default async function handler(req, res) {
  console.log("تم استدعاء /api/ocr بالميثود:", req.method);

  if (req.method !== "POST") {
    console.error("ميثود غير مدعوم:", req.method);
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const form = formidable({ keepExtensions: true });

  try {
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error("Formidable error:", err);
          reject(err);
        } else {
          console.log("Form fields:", fields);
          console.log("Form files:", files);
          resolve([fields, files]);
        }
      });
    });

    const fileRaw = files?.file;
    const file = Array.isArray(fileRaw) ? fileRaw[0] : fileRaw;
    const docTypeRaw = fields?.docType;
    const docType = Array.isArray(docTypeRaw) ? docTypeRaw[0] : docTypeRaw;

    if (!file?.filepath || typeof docType !== "string" || !docType.trim()) {
      console.error("الملف أو نوع المستند غير موجود", { file, docType });
      return res.status(400).json({ success: false, message: "الملف أو نوع المستند غير موجود" });
    }

    // تحقق من نوع وصيغة الصورة بشكل آمن
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    const fileMimetype = typeof file?.mimetype === "string" ? file.mimetype : "";
    if (!allowedTypes.includes(fileMimetype)) {
      console.error("نوع الصورة غير مدعوم:", fileMimetype);
      return res.status(400).json({
        success: false,
        message: "❌ فقط صور JPG أو PNG مدعومة.",
      });
    }

    // قراءة الملف من النظام
    let fileBuffer;
    try {
      fileBuffer = await fs.readFile(file.filepath);
      console.log("تمت قراءة ملف الصورة من النظام.");
    } catch (readErr) {
      console.error("تعذر قراءة الملف من النظام:", readErr);
      return res.status(400).json({
        success: false,
        message: "تعذر قراءة الملف، أعد رفعه.",
      });
    }

    // تحقق أن الملف غير فارغ
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
      console.error("الصورة غير صالحة أو فارغة.");
      return res.status(400).json({
        success: false,
        message: "الصورة غير صالحة أو فارغة، أعد رفع الملف.",
      });
    }

    // -------- Google Vision API OCR --------
    let result;
    try {
      console.log("إرسال الصورة إلى Google Vision API...");
      [result] = await client.textDetection({ image: { content: fileBuffer } });
      console.log("تم استلام نتيجة OCR من Google Vision.");
    } catch (visionErr) {
      console.error("Google Vision OCR Error:", visionErr);
      return res.status(500).json({
        success: false,
        message: "خطأ في خدمة OCR من Google Vision",
        error: visionErr?.message || "Unknown Vision API error",
      });
    }

    const detections = Array.isArray(result?.textAnnotations) ? result.textAnnotations : [];
    const text = (detections[0]?.description && typeof detections[0].description === "string") ? detections[0].description : "";

    // -------- END GOOGLE VISION --------

    const cleanedText = (typeof text === "string" ? text : "").trim();
    const upperText = cleanedText ? cleanedText.toUpperCase() : "";

    console.log("النص المستخرج من المستند:", cleanedText);

    if (cleanedText.length < 15) {
      console.error("النص المستخرج قصير جدًا:", cleanedText);
      return res.status(200).json({
        success: false,
        text: cleanedText,
        message: `فشل الفحص. المستند غير واضح أو لا يحتوي على نص قابل للتحليل.`,
      });
    }

    let isValid = false;
    let extractedData = {};

    // تحقق من نوع المستند وأمان فحص النص
    if (docType === "eidFront" || docType === "ownerIdFront") {
      const indicators = [
        typeof upperText === "string" && upperText.includes("NATIONALITY"),
        typeof upperText === "string" && upperText.includes("ISSUING DATE"),
        typeof upperText === "string" && upperText.includes("EXPIRY DATE")
      ];
      isValid = indicators.filter(Boolean).length >= 2;
    } else if (docType === "eidBack" || docType === "ownerIdBack") {
      isValid =
        typeof upperText === "string" &&
        upperText.includes("OCCUPATION") &&
        upperText.includes("EMPLOYER");
    } else if (docType === "passport") {
      const mrzMatch = typeof upperText === "string" ? upperText.match(/P<([A-Z]{3})([A-Z<]+)<<([A-Z<]+)[\s\S]+?([A-Z0-9]{6,})[A-Z]{3}/) : null;
      if (mrzMatch) {
        isValid = true;
        const countryCode = mrzMatch[1];
        const surname = mrzMatch[2]?.replace(/</g, " ").trim();
        const givenNames = mrzMatch[3]?.replace(/</g, " ").trim();
        const passportNumber = mrzMatch[4];

        extractedData = {
          passportNumber,
          countryCode,
          fullName: `${surname} ${givenNames}`.replace(/\s+/g, " ").trim()
        };
      }
    } else if (docType === "license") {
      const licenseIndicators = [
        typeof upperText === "string" && (upperText.includes("LICENSE") || upperText.includes("رخصة")),
        typeof upperText === "string" && (upperText.includes("TRADE") || upperText.includes("تجاري")),
        typeof upperText === "string" && (upperText.includes("COMMERCIAL") || upperText.includes("اقتصادية")),
        typeof upperText === "string" && (upperText.includes("ECONOMIC") || upperText.includes("الاقتصادية")),
        typeof upperText === "string" && (upperText.includes("DEPARTMENT") || upperText.includes("دائرة")),
        typeof upperText === "string" && (upperText.includes("LICENSE NO") || upperText.includes("رقم الرخصة")),
        typeof upperText === "string" && (upperText.includes("EXPIRY DATE") || upperText.includes("تاريخ الانتهاء") || upperText.includes("تاريخ الإنتهاء")),
        typeof upperText === "string" && (upperText.includes("ISSUE DATE") || upperText.includes("تاريخ الاصدار") || upperText.includes("تاريخ الإصدار")),
        typeof upperText === "string" && (upperText.includes("TRADE NAME") || upperText.includes("الاسم التجاري") || upperText.includes("اسم النشاط"))
      ];

      isValid = licenseIndicators.filter(Boolean).length >= 3;

      const licenseNumberMatch = typeof upperText === "string" ? upperText.match(/(?:LICENSE\s*NO|رخصة\s*رقم|رقم\s*الرخصة)[:\s\-]*([A-Z0-9\-]+)/) : null;
      const issueDateMatch = typeof upperText === "string" ? upperText.match(/(?:ISSUE\s*DATE|تاريخ\s*الإصدار|تاريخ\s*الاصدار)[:\s\-]*([\d\/\-]+)/) : null;
      const expiryDateMatch = typeof upperText === "string" ? upperText.match(/(?:EXPIR[YI]\s*DATE|تاريخ\s*الانتهاء|تاريخ\s*الإنتهاء)[:\s\-]*([\d\/\-]+)/) : null;
      const tradeNameMatch = typeof upperText === "string" ? upperText.match(/(?:TRADE\s*NAME|الاسم\s*التجاري|اسم\s*النشاط|اسم\s*الشركة)[:\s\-]*([A-Z\s\u0600-\u06FF]+)/) : null;

      extractedData = {
        licenseNumber: licenseNumberMatch?.[1] || null,
        issueDate: issueDateMatch?.[1] || null,
        expiryDate: expiryDateMatch?.[1] || null,
        tradeName: tradeNameMatch?.[1]?.trim() || null,
      };
    }

    console.log("نتيجة التحقق من المستند:", { isValid, extractedData });

    if (!isValid) {
      console.error(`فشل الفحص. لم يتم العثور على محتوى مناسب في مستند (${docType})`);
      return res.status(200).json({
        success: false,
        text: cleanedText,
        message: `فشل الفحص. لم يتم العثور على محتوى مناسب في مستند (${docType})`,
      });
    }

    return res.status(200).json({
      success: true,
      text: cleanedText,
      extracted: extractedData,
      message: "تم التحقق من المستند بنجاح",
    });

  } catch (error) {
    console.error("OCR Error:", error);
    return res.status(500).json({
      success: false,
      message: "OCR Server Error",
      error: error?.message || "Unknown error",
    });
  }
}
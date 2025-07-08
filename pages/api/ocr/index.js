import { promises as fs } from "fs";
import formidable from "formidable";
import vision from "@google-cloud/vision";

export const config = {
  api: { bodyParser: false },
};

// إعداد عميل Google Vision باستخدام متغير البيئة
const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const form = formidable({ keepExtensions: true });

  try {
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const fileRaw = files.file;
    const file = Array.isArray(fileRaw) ? fileRaw[0] : fileRaw;

    const docTypeRaw = fields.docType;
    const docType = Array.isArray(docTypeRaw) ? docTypeRaw[0] : docTypeRaw;

    if (!file?.filepath || !docType) {
      return res.status(400).json({ success: false, message: "الملف أو نوع المستند غير موجود" });
    }

    // ✅ السماح فقط بالصور للرخصة التجارية
    if (docType === "license" && !file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "❌ يجب رفع الرخصة التجارية بصيغة صورة فقط (JPG, PNG...).",
      });
    }

    const fileBuffer = await fs.readFile(file.filepath);

    // -------- Google Vision API OCR --------
    const [result] = await client.textDetection({ image: { content: fileBuffer } });
    const detections = result.textAnnotations;
    const text = detections[0]?.description || "";
    // -------- END GOOGLE VISION --------

    const cleanedText = text?.trim() || "";
    const upperText = cleanedText.toUpperCase();

    if (cleanedText.length < 15) {
      return res.status(200).json({
        success: false,
        text: cleanedText,
        message: `فشل الفحص. المستند غير واضح أو لا يحتوي على نص قابل للتحليل.`,
      });
    }

    let isValid = false;
    let extractedData = {};

    if (docType === "eidFront" || docType === "ownerIdFront") {
      const indicators = [
        upperText.includes("NATIONALITY"),
        upperText.includes("ISSUING DATE"),
        upperText.includes("EXPIRY DATE")
      ];
      isValid = indicators.filter(Boolean).length >= 2;

    } else if (docType === "eidBack" || docType === "ownerIdBack") {
      isValid =
        upperText.includes("OCCUPATION") &&
        upperText.includes("EMPLOYER");

    } else if (docType === "passport") {
      const mrzMatch = upperText.match(/P<([A-Z]{3})([A-Z<]+)<<([A-Z<]+)[\s\S]+?([A-Z0-9]{6,})[A-Z]{3}/);
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
        upperText.includes("LICENSE") || upperText.includes("رخصة"),
        upperText.includes("TRADE") || upperText.includes("تجاري"),
        upperText.includes("COMMERCIAL") || upperText.includes("اقتصادية"),
        upperText.includes("ECONOMIC") || upperText.includes("الاقتصادية"),
        upperText.includes("DEPARTMENT") || upperText.includes("دائرة"),
        upperText.includes("LICENSE NO") || upperText.includes("رقم الرخصة"),
        upperText.includes("EXPIRY DATE") || upperText.includes("تاريخ الانتهاء") || upperText.includes("تاريخ الإنتهاء"),
        upperText.includes("ISSUE DATE") || upperText.includes("تاريخ الاصدار") || upperText.includes("تاريخ الإصدار"),
        upperText.includes("TRADE NAME") || upperText.includes("الاسم التجاري") || upperText.includes("اسم النشاط")
      ];

      isValid = licenseIndicators.filter(Boolean).length >= 3;

      const licenseNumberMatch = upperText.match(/(?:LICENSE\s*NO|رخصة\s*رقم|رقم\s*الرخصة)[:\s\-]*([A-Z0-9\-]+)/);
      const issueDateMatch = upperText.match(/(?:ISSUE\s*DATE|تاريخ\s*الإصدار|تاريخ\s*الاصدار)[:\s\-]*([\d\/\-]+)/);
      const expiryDateMatch = upperText.match(/(?:EXPIR[YI]\s*DATE|تاريخ\s*الانتهاء|تاريخ\s*الإنتهاء)[:\s\-]*([\d\/\-]+)/);
      const tradeNameMatch = upperText.match(/(?:TRADE\s*NAME|الاسم\s*التجاري|اسم\s*النشاط|اسم\s*الشركة)[:\s\-]*([A-Z\s\u0600-\u06FF]+)/);

      extractedData = {
        licenseNumber: licenseNumberMatch?.[1] || null,
        issueDate: issueDateMatch?.[1] || null,
        expiryDate: expiryDateMatch?.[1] || null,
        tradeName: tradeNameMatch?.[1]?.trim() || null,
      };
    }

    if (!isValid) {
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
      error: error.message,
    });
  }
}
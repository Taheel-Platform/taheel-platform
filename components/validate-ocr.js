"use client";
export const dynamic = "force-dynamic";
import { Suspense } from "react";
import formidable from 'formidable-serverless';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

const OCR_API_KEY = "K82258740888957"; // مفتاحك هنا

async function ocrHandler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ success: false, message: "Upload error" });

    const file = files.document || files.eidFront || files.eidBack || Object.values(files)[0];
    if (!file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const data = fs.readFileSync(file.path);

    const formData = new FormData();
    formData.append('file', data, file.name);
    formData.append('OCREngine', '2'); // أو 1، جرب الأفضل
    formData.append('language', 'ara'); // أو en حسب نوع المستند

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: OCR_API_KEY,
      },
      body: formData,
    });

    const ocr = await response.json();

    // استخرج النص من النتيجة
    const parsedText = ocr?.ParsedResults?.[0]?.ParsedText || "";

    res.status(200).json({
      success: !!parsedText,
      text: parsedText,
      message: parsedText ? "تم استخراج البيانات." : "لم يتم العثور على نص في المستند.",
    });
  });
}

function AttendanceSection(props) {
  return (
    <Suspense fallback={null}>
      <AttendanceSectionInner {...props} />
    </Suspense>
  );
}

export { ocrHandler as default, AttendanceSection };
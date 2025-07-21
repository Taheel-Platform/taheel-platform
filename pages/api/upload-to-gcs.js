import { Storage } from "@google-cloud/storage";
import { adminRtdb } from "@/lib/firebase.admin";
import { promises as fs } from "fs";
import formidable from "formidable";
import path from "path";

export const config = {
  api: { bodyParser: false },
};

const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_KEY 
  ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
  : null;

if (serviceAccount && typeof serviceAccount.private_key === "string") {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

const storage = serviceAccount ? new Storage({
  projectId: "taheel-platform-v2",
  credentials: {
    client_email: serviceAccount.client_email,
    private_key: serviceAccount.private_key,
  },
}) : null;
const bucket = storage ? storage.bucket("taheel-platform") : null;

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: true, keepExtensions: true });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!storage || !bucket) {
    res.status(500).json({ error: "Storage configuration not available" });
    return;
  }

  try {
    const { fields, files } = await parseForm(req);

    const userId = typeof fields?.userId === "string"
      ? fields.userId
      : typeof fields?.sessionId === "string"
      ? fields.sessionId
      : "default";
    const serviceId = typeof fields?.serviceId === "string" ? fields.serviceId : "general";
    const serviceName = typeof fields?.serviceName === "string" ? fields.serviceName : "";

    let uploadedFiles = files?.file;
    if (!uploadedFiles) {
      res.status(400).json({ error: "لا يوجد ملفات" });
      return;
    }
    if (!Array.isArray(uploadedFiles)) uploadedFiles = [uploadedFiles];

    const uploadedInfo = [];

    for (const uploadedFile of uploadedFiles) {
      const mimetype = typeof uploadedFile?.mimetype === "string" ? uploadedFile.mimetype : "";
      const originalFilename = typeof uploadedFile?.originalFilename === "string" ? uploadedFile.originalFilename : "file.pdf";
      const ext = path.extname(originalFilename) || ".pdf";
      const safeName = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9_\-\.]/g, "_");
      const gcsFileName = `uploads/${userId}/${serviceId}/${Date.now()}_${safeName}${ext}`;

      // تحقق من نوع الملف وصيغته
      if (!["application/pdf", "image/jpeg", "image/png"].includes(mimetype)) {
        res.status(400).json({ error: `الملف ${originalFilename} نوعه غير مدعوم (PDF أو صورة فقط).` });
        return;
      }
      if (typeof uploadedFile.size !== "number" || uploadedFile.size > 10 * 1024 * 1024) {
        res.status(400).json({ error: `الملف ${originalFilename} كبير جدًا (الحد الأقصى 10MB)` });
        return;
      }

      // قراءة الملف بأمان
      let fileBuffer;
      try {
        fileBuffer = await fs.readFile(uploadedFile.filepath);
      } catch (readErr) {
        res.status(400).json({ error: `تعذر قراءة الملف: ${originalFilename}` });
        return;
      }

      // رفع إلى Google Cloud Storage
      const blob = bucket.file(gcsFileName);
      try {
        await blob.save(fileBuffer, {
          contentType: mimetype,
          resumable: false,
        });
      } catch (saveErr) {
        res.status(500).json({ error: `تعذر رفع الملف إلى التخزين السحابي: ${originalFilename}` });
        return;
      }

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`;
      const uniqueId = Date.now().toString() + "_" + Math.floor(Math.random() * 100000);

      // حفظ بيانات الملف في قاعدة البيانات
      try {
        await adminRtdb.ref(`serviceUploads/${userId}/${uniqueId}`).set({
          url: publicUrl,
          uploadedAt: new Date().toISOString(),
          originalName: originalFilename,
          mimeType: mimetype,
          size: uploadedFile.size,
          userId,
          serviceId,
          serviceName,
        });
      } catch (dbErr) {
        // في حالة الخطأ في قاعدة البيانات، لا توقف رفع الملف، فقط أبلغ المستخدم!
        console.error("Database error:", dbErr);
      }

      uploadedInfo.push({
        url: publicUrl,
        fileName: originalFilename,
        mimeType: mimetype,
        size: uploadedFile.size,
      });
    }

    if (uploadedInfo.length === 1) {
      res.status(200).json({ url: uploadedInfo[0].url });
      return;
    }
    res.status(200).json({ files: uploadedInfo });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error?.message || "حدث خطأ أثناء رفع الملفات" });
  }
}
import { Storage } from "@google-cloud/storage";
import { adminRtdb } from "@/lib/firebase.admin";
import { promises as fs } from "fs";
import formidable from "formidable";
import path from "path";

export const config = {
  api: { bodyParser: false },
};

// قراءة بيانات الخدمة من متغير البيئة
const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_KEY 
  ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
  : null;

// التعديل المهم هنا:
if (serviceAccount && serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

const storage = serviceAccount ? new Storage({
  projectId: "taheel-platform-v2",
  credentials: {
    client_email: serviceAccount.client_email,
    private_key: serviceAccount.private_key,
  },
}) : null;
const bucket = storage.bucket("taheel-platform");

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

  if (!storage) {
    res.status(500).json({ error: "Storage configuration not available" });
    return;
  }

  try {
    const { fields, files } = await parseForm(req);

    const userId = fields?.userId || fields?.sessionId || "default";
    const serviceId = fields?.serviceId || "general";
    const serviceName = fields?.serviceName || "";

    let uploadedFiles = files?.file;
    if (!uploadedFiles) {
      res.status(400).json({ error: "لا يوجد ملفات" });
      return;
    }
    if (!Array.isArray(uploadedFiles)) uploadedFiles = [uploadedFiles];

    const uploadedInfo = [];

    for (const uploadedFile of uploadedFiles) {
      if (!["application/pdf", "image/jpeg", "image/png"].includes(uploadedFile.mimetype)) {
        res.status(400).json({ error: `الملف ${uploadedFile.originalFilename} نوعه غير مدعوم (PDF أو صورة فقط).` });
        return;
      }
      if (uploadedFile.size > 10 * 1024 * 1024) {
        res.status(400).json({ error: `الملف ${uploadedFile.originalFilename} كبير جدًا (الحد الأقصى 10MB)` });
        return;
      }

      const ext = path.extname(uploadedFile.originalFilename) || ".pdf";
      const safeName = path.basename(uploadedFile.originalFilename, ext).replace(/[^a-zA-Z0-9_\-\.]/g, "_");
      const gcsFileName = `uploads/${userId}/${serviceId}/${Date.now()}_${safeName}${ext}`;
      const fileBuffer = await fs.readFile(uploadedFile.filepath);

      const blob = bucket.file(gcsFileName);
      await blob.save(fileBuffer, {
        contentType: uploadedFile.mimetype,
        resumable: false,
      });

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`;
      const uniqueId = Date.now().toString() + "_" + Math.floor(Math.random() * 100000);

      await adminRtdb.ref(`serviceUploads/${userId}/${uniqueId}`).set({
        url: publicUrl,
        uploadedAt: new Date().toISOString(),
        originalName: uploadedFile.originalFilename,
        mimeType: uploadedFile.mimetype,
        size: uploadedFile.size,
        userId,
        serviceId,
        serviceName,
      });

      uploadedInfo.push({
        url: publicUrl,
        fileName: uploadedFile.originalFilename,
        mimeType: uploadedFile.mimetype,
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
    res.status(500).json({ error: error.message || "حدث خطأ أثناء رفع الملفات" });
  }
}
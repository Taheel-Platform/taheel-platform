import formidable from "formidable";
import { Storage } from "@google-cloud/storage";
import fs from "fs";

export const config = { api: { bodyParser: false } };

const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
const storage = new Storage({
  projectId: credentials.project_id,
  credentials,
});
const bucketName = process.env.GCLOUD_STORAGE_BUCKET;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  try {
    const form = formidable({ maxFileSize: 5 * 1024 * 1024, multiples: true }); // يدعم رفع عدة ملفات
    const { fields, files } = await new Promise((resolve, reject) =>
      form.parse(req, (err, fields, files) => err ? reject(err) : resolve({ fields, files }))
    );

    // يدعم رفع ملف أو عدة ملفات
    const uploadedFiles = Array.isArray(files.file) ? files.file : [files.file];

    const results = [];
    for (const file of uploadedFiles) {
      const sessionId = Array.isArray(fields.sessionId) ? fields.sessionId[0] : fields.sessionId;
      const docType = Array.isArray(fields.docType) ? fields.docType[0] : fields.docType;
      const ext = file?.originalFilename?.split('.').pop() || "bin";
      const uniqueName = `${sessionId || "no-session"}_${docType || "document"}_${Date.now()}.${ext}`;

      const bucket = storage.bucket(bucketName);
      const blob = bucket.file(uniqueName);
      const filePath = file?.filepath || file?.path;

      if (!filePath) {
        res.status(400).json({ error: "File path not found" });
        return;
      }

      await new Promise((resolve, reject) => {
        const writeStream = blob.createWriteStream({ contentType: file.mimetype, resumable: false });
        const readStream = fs.createReadStream(filePath);
        readStream.on("error", reject);
        writeStream.on("error", reject);
        writeStream.on("finish", resolve);
        readStream.pipe(writeStream);
      });

      fs.unlink(filePath, () => {});

      const publicUrl = `https://storage.googleapis.com/${bucketName}/${uniqueName}`;
      results.push({
        name: file.originalFilename,
        url: publicUrl,
        type: file.mimetype,
        size: file.size,
      });
    }

    res.status(200).json({ success: true, files: results });
  } catch (error) {
    res.status(500).json({ error: "Failed to upload file", details: error.message });
  }
}
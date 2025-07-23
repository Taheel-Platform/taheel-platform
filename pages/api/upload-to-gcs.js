import formidable from "formidable";
import { Storage } from "@google-cloud/storage";
import fs from "fs";
import path from "path";

export const config = { api: { bodyParser: false } };

// استخدم القراءة من ملف service-account.json
const credentials = JSON.parse(fs.readFileSync(path.join(process.cwd(), "service-account.json"), "utf8"));
const storage = new Storage({
  projectId: credentials.project_id,
  credentials,
});
const bucketName = process.env.GCLOUD_STORAGE_BUCKET;


export default async function handler(req, res) {
  console.log("==== رفع ملف جديد ====");
  console.log("طريقة الطلب:", req.method);

  if (req.method !== "POST") {
    console.log("ميثود غير مدعوم");
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  try {
    console.log("بدء قراءة البيانات من فورم");
    const form = formidable({ maxFileSize: 5 * 1024 * 1024, multiples: false });
    const { fields, files } = await new Promise((resolve, reject) =>
      form.parse(req, (err, fields, files) => err ? reject(err) : resolve({ fields, files }))
    );
    console.log("fields:", fields);
    console.log("files:", files);

    const fileArr = files.file;
    const file = Array.isArray(fileArr) ? fileArr[0] : fileArr;
    console.log("ملف واحد للرفع:", file);

    const sessionId = Array.isArray(fields.sessionId) ? fields.sessionId[0] : fields.sessionId;
    const docType = Array.isArray(fields.docType) ? fields.docType[0] : fields.docType;
    console.log("sessionId:", sessionId);
    console.log("docType:", docType);

    const ext = file?.originalFilename?.split('.').pop() || "bin";
    console.log("امتداد الملف:", ext);

    const uniqueName = `${sessionId || "no-session"}_${docType || "document"}_${Date.now()}.${ext}`;
    console.log("اسم الملف النهائي:", uniqueName);

    console.log("اسم الباكت:", bucketName);
    const bucket = storage.bucket(bucketName);

    const blob = bucket.file(uniqueName);
    const filePath = file?.filepath || file?.path;
    console.log("مسار الملف في النظام:", filePath);

    if (!filePath) {
      console.log("لا يوجد مسار للملف للرفع!");
      res.status(400).json({ error: "File path not found" });
      return;
    }

    await new Promise((resolve, reject) => {
      const writeStream = blob.createWriteStream({ contentType: file.mimetype, resumable: false });
      const readStream = fs.createReadStream(filePath);
      readStream.on("error", (err) => {
        console.log("خطأ أثناء قراءة الملف:", err);
        reject(err);
      });
      writeStream.on("error", (err) => {
        console.log("خطأ أثناء الكتابة للباكت:", err);
        reject(err);
      });
      writeStream.on("finish", () => {
        console.log("تم رفع الملف للباكت بنجاح!");
        resolve();
      });
      readStream.pipe(writeStream);
    });

   

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${uniqueName}`;
    console.log("رابط الملف:", publicUrl);

    res.status(200).json({ success: true, url: publicUrl });
  } catch (error) {
    console.log("خطأ أثناء رفع الملف للباكت:", error);
    res.status(500).json({ error: "Failed to upload file", details: error.message });
  }
}
import { doc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "./firebase.client";

export async function saveDocumentData(userId, documentObj) {
  const userRef = doc(db, "users", userId);
  // أنشئ الوثيقة إذا لم تكن موجودة (لن يؤثر على الموجود)
  await setDoc(userRef, {}, { merge: true });
  await updateDoc(userRef, {
    documents: arrayUnion(documentObj)
  });
}
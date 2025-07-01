import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAc5sBZqi9yaSBD639lcDT6umonDbHbn4A",
  authDomain: "taheel-platform-v2.firebaseapp.com",
  databaseURL: "https://taheel-platform-v2-default-rtdb.firebaseio.com",
  projectId: "taheel-platform-v2",
  storageBucket: "taheel-platform-v2.appspot.com",
  messagingSenderId: "446753203509",
  appId: "1:446753203509:web:ec4d716482260a46fd187c"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const firestore = getFirestore(app);
const rtdb = getDatabase(app);
const storage = getStorage(app);

export { app, auth, firestore, rtdb, storage };
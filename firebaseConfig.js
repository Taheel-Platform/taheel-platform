const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyAc5sBZqi9yaSBD639lcDT6umonDbHbn4A",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "taheel-platform-v2.firebaseapp.com",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://taheel-platform-v2-default-rtdb.firebaseio.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "taheel-platform-v2",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "taheel-platform-v2.appspot.com", 
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "446753203509",
  appId: process.env.FIREBASE_APP_ID || "1:446753203509:web:ec4d716482260a46fd187c"
};
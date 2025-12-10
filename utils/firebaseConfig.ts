// firebaseConfig.ts
import { getApps, initializeApp } from "firebase/app";
import {
  doc,
  getDoc,
  getFirestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD_olYPaEJtCmcBO25aNPGKbDtqAe3JI3k",
  authDomain: "comment-picker-bebc8.firebaseapp.com",
  projectId: "comment-picker-bebc8",
  storageBucket: "comment-picker-bebc8.firebasestorage.app",
  messagingSenderId: "478577646572",
  appId: "1:478577646572:web:366cc297cc99e3b894fec9",
  measurementId: "G-TR7W5HQNCP"
};

// const firebaseConfig = {
//   apiKey: "AIzaSyCSI9FUv1NTmS__n8jSDod5Xz-4ejRp7Kc",
//   authDomain: "epic---comment-picker.firebaseapp.com",
//   projectId: "epic---comment-picker",
//   storageBucket: "epic---comment-picker.firebasestorage.app",
//   messagingSenderId: "861371177960",
//   appId: "1:861371177960:web:e6dc9cec2fcf0c8e3da25d",
//   measurementId: "G-RLG6Z8H444"
// };

// 🔥 Initialize Firebase Only Once
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
}

const db = getFirestore(app);

// ------------------------------
// ⭐ FETCH APP CONFIG FROM FIRESTORE
// ------------------------------
export async function fetchAppConfig() {
  try {
    const ref = doc(db, "configs", "app_config"); 
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const data = snap.data();
      console.log("🔥 Firestore Config Loaded:", data);
      return data;
    } else {
      console.log("⚠️ No config document found!");
      return null;
    }
  } catch (error) {
    console.log("❌ Firestore Config Fetch Failed:", error);
    return null;
  }
}

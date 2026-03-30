import { initializeApp } from "firebase/app";
import { initializeFirestore, browserLocalPersistence, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC510_aTDnyuiTFdQzhsTjvyib7mlTx-9Y",
  authDomain: "pandapostlis.firebaseapp.com",
  databaseURL: "https://pandapostlis-default-rtdb.firebaseio.com",
  projectId: "pandapostlis",
  storageBucket: "pandapostlis.firebasestorage.app",
  messagingSenderId: "52552102901",
  appId: "1:52552102901:web:ef103473eebe6cebc366bc",
  measurementId: "G-R4LEBQR2L5",
};

const app = initializeApp(firebaseConfig);

// Используем настройки для повышения стабильности потоков данных
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // Принудительно используем long polling для обхода ошибок в потоках
});
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };

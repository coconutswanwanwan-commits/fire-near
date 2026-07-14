// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyDhruyri0FzL1StSE3HduiirQbesndjgMs",
  authDomain: "syoubouhiyari.firebaseapp.com",
  projectId: "syoubouhiyari",
  storageBucket: "syoubouhiyari.firebasestorage.app",
  messagingSenderId: "681503936522",
  appId: "1:681503936522:web:6571dc9383d2c0590bcff3",
  measurementId: "G-VX0766Q76W"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);

// Firestore
const db = getFirestore(app);

// 他のファイルから使えるようにする
export { db };

import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const form = document.getElementById("reportForm");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      await addDoc(collection(db, "reports"), {
        date: document.getElementById("date").value,
        department: document.getElementById("department").value,
        category: document.getElementById("category").value,
        place: document.getElementById("place").value,
        level: document.getElementById("level").value,
        title: document.getElementById("title").value,
        situation: document.getElementById("situation").value,
        cause: document.getElementById("cause").value,
        countermeasure: document.getElementById("countermeasure").value,
        lesson: document.getElementById("lesson").value,
        tags: document.getElementById("tags").value,
        createdAt: serverTimestamp()
      });

      alert("✅ 投稿を保存しました。");

      form.reset();

    } catch (error) {

      console.error(error);

      alert("❌ 保存に失敗しました。\n\n" + error.message);

    }
  });
}

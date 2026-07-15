import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  orderBy
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
// 一覧表示
const reportList = document.getElementById("reportList");

if (reportList) {
  try {
    const q = query(
      collection(db, "reports"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    reportList.innerHTML = "";

    if (snapshot.empty) {
      reportList.innerHTML = "<p>まだ投稿がありません。</p>";
    } else {
      snapshot.forEach((doc) => {
        const data = doc.data();

        reportList.innerHTML += `
          <div class="news">
            <h3>${data.title}</h3>
            <p><strong>所属：</strong>${data.department}</p>
            <p><strong>業務区分：</strong>${data.category}</p>
            <p><strong>レベル：</strong>${data.level}</p>
            <p><strong>発生日：</strong>${data.date}</p>
          </div>
        `;
      });
    }

  } catch (error) {
    console.error(error);
    reportList.innerHTML = "<p>一覧の読み込みに失敗しました。</p>";
  }
}

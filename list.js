import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const reportList = document.getElementById("reportList");

async function loadReports() {
  try {
    const q = query(
      collection(db, "reports"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    reportList.innerHTML = "";

    if (snapshot.empty) {
      reportList.innerHTML = "<p>まだ投稿がありません。</p>";
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();

      reportList.innerHTML += `
        <div class="news">
          <h3>
  <a href="detail.html?id=${doc.id}">
    ${data.title}
  </a>
</h3>
          <p><strong>所属：</strong>${data.department}</p>
          <p><strong>業務区分：</strong>${data.category}</p>
          <p><strong>レベル：</strong>${data.level}</p>
          <p><strong>発生日：</strong>${data.date}</p>
        </div>
      `;
    });

  } catch (error) {
    console.error(error);
    reportList.innerHTML = "<p>一覧の読み込みに失敗しました。</p>";
  }
}

loadReports();

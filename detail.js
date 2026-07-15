import { db } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// URLからidを取得
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

const detail = document.getElementById("detail");

async function loadDetail() {

  if (!id) {
    detail.innerHTML = "<p>事例が見つかりません。</p>";
    return;
  }

  try {

    const docRef = doc(db, "reports", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      detail.innerHTML = "<p>データが存在しません。</p>";
      return;
    }

    const data = docSnap.data();

    detail.innerHTML = `
      <h2>${data.title}</h2>

      <p><strong>所属：</strong>${data.department}</p>
      <p><strong>業務区分：</strong>${data.category}</p>
      <p><strong>レベル：</strong>${data.level}</p>
      <p><strong>発生日：</strong>${data.date}</p>
      <p><strong>場所：</strong>${data.place}</p>

      <hr>

      <h3>発生状況</h3>
      <p>${data.situation || "未入力"}</p>

      <h3>原因</h3>
      <p>${data.cause || "未入力"}</p>

      <h3>改善策</h3>
      <p>${data.countermeasure || "未入力"}</p>

      <h3>学んだこと</h3>
      <p>${data.lesson || "未入力"}</p>

      <h3>タグ</h3>
      <p>${data.tags || "なし"}</p>
    `;

  } catch (error) {

    console.error(error);
    detail.innerHTML = "<p>読み込みに失敗しました。</p>";

  }

}

loadDetail();

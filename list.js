import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const reportList = document.getElementById("reportList");
const searchBox = document.getElementById("searchBox");

let reports = [];

// 一覧表示
function displayReports(data) {

  reportList.innerHTML = "";

  if (data.length === 0) {
    reportList.innerHTML = "<p>該当する事例はありません。</p>";
    return;
  }

  data.forEach((report) => {

    let badge = "";

    switch (report.level) {

      case "レベル1（軽微）":
        badge = '<span class="level level1">🟢 レベル1</span>';
        break;

      case "レベル2（注意）":
        badge = '<span class="level level2">🟡 レベル2</span>';
        break;

      case "レベル3（重大）":
        badge = '<span class="level level3">🟠 レベル3</span>';
        break;

      case "レベル4（事故寸前）":
        badge = '<span class="level level4">🔴 レベル4</span>';
        break;

      default:
        badge = report.level;
    }

    reportList.innerHTML += `
      <div class="news">

        <h3>
          <a href="detail.html?id=${report.id}">
            ${report.title}
          </a>
        </h3>

        <p><strong>所属：</strong>${report.department}</p>

        <p><strong>業務区分：</strong>${report.category}</p>

        <p>${badge}</p>

        <p><strong>発生日：</strong>${report.date}</p>

      </div>
    `;
  });

}

// Firestoreから取得
async function loadReports() {

  try {

    const q = query(
      collection(db, "reports"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    reports = [];

    snapshot.forEach((doc) => {

      reports.push({
        id: doc.id,
        ...doc.data()
      });

    });

    displayReports(reports);

  } catch (error) {

    console.error(error);
    reportList.innerHTML =
      "<p>一覧の読み込みに失敗しました。</p>";

  }

}

// キーワード検索
searchBox.addEventListener("input", () => {

  const keyword = searchBox.value.trim().toLowerCase();

  if (keyword === "") {
    displayReports(reports);
    return;
  }

  const filtered = reports.filter((report) => {

    return (
      (report.title || "").toLowerCase().includes(keyword) ||
      (report.situation || "").toLowerCase().includes(keyword) ||
      (report.cause || "").toLowerCase().includes(keyword) ||
      (report.countermeasure || "").toLowerCase().includes(keyword) ||
      (report.lesson || "").toLowerCase().includes(keyword)
    );

  });

  displayReports(filtered);

});

// 初期表示
loadReports();

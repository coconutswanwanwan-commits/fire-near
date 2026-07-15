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
    reportList.innerHTML = "<p>一覧の読み込みに失敗しました。</p>";
  }
}

function displayReports(list) {

  reportList.innerHTML = "";

  if (list.length === 0) {
    reportList.innerHTML = "<p>該当する事例はありません。</p>";
    return;
  }

  list.forEach((data) => {

    reportList.innerHTML += `
      <div class="news">
        <h3>
          <a href="detail.html?id=${data.id}">
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

}

searchBox.addEventListener("input", () => {

  const keyword = searchBox.value.toLowerCase();

  const filtered = reports.filter(report => {

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

loadReports();

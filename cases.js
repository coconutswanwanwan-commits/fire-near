import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const caseList =
  document.getElementById("caseList");

const caseCount =
  document.getElementById("caseCount");


// HTMLに安全に文字を表示
function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

}


// レベル表示
function createLevelBadge(level) {

  switch (level) {

    case "レベル1（軽微）":

      return `
        <span class="level level1">
          🟢 レベル1（軽微）
        </span>
      `;


    case "レベル2（注意）":

      return `
        <span class="level level2">
          🟡 レベル2（注意）
        </span>
      `;


    case "レベル3（重大）":

      return `
        <span class="level level3">
          🟠 レベル3（重大）
        </span>
      `;


    case "レベル4（事故寸前）":

      return `
        <span class="level level4">
          🔴 レベル4（事故寸前）
        </span>
      `;


    default:

      return `
        <span class="level">
          ${escapeHtml(level || "未設定")}
        </span>
      `;

  }

}


// NEW表示判定
function createNewBadge(dateValue) {

  if (!dateValue) {
    return "";
  }


  const reportDate =
    new Date(`${dateValue}T00:00:00`);

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );


  const difference =
    today.getTime() -
    reportDate.getTime();


  const threeDays =
    3 * 24 * 60 * 60 * 1000;


  if (
    difference >= 0 &&
    difference <= threeDays
  ) {

    return `
      <span
        style="
          display:inline-block;
          margin-left:8px;
          padding:3px 8px;
          border-radius:12px;
          background:#d32f2f;
          color:white;
          font-size:0.75rem;
          font-weight:bold;
        "
      >
        NEW
      </span>
    `;

  }


  return "";

}


// 事例表示
function displayCases(cases) {

  caseList.innerHTML = "";

  caseCount.textContent =
    `${cases.length}件の事例があります。`;


  if (cases.length === 0) {

    caseList.innerHTML = `
      <p>
        まだ投稿された事例はありません。
      </p>
    `;

    return;

  }


  cases.forEach((report) => {

    const levelBadge =
      createLevelBadge(report.level);

    const newBadge =
      createNewBadge(report.date);

    const helpful =
      Number(report.helpful || 0);


    caseList.insertAdjacentHTML(

      "beforeend",

      `
        <article class="news">

          <h3>

            <a
              href="detail.html?id=${encodeURIComponent(report.id)}"
            >
              ${escapeHtml(
                report.title || "タイトル未設定"
              )}
            </a>

            ${newBadge}

          </h3>


          <p>

            <strong>発生日：</strong>

            ${escapeHtml(
              report.date || "未設定"
            )}

          </p>


          <p>

            <strong>所属：</strong>

            ${escapeHtml(
              report.department || "未設定"
            )}

          </p>


          <p>

            <strong>業務区分：</strong>

            ${escapeHtml(
              report.category || "未設定"
            )}

          </p>


          <p>
            ${levelBadge}
          </p>


          <p>

            <strong>👍 参考になった：</strong>

            ${helpful}件

          </p>

        </article>
      `

    );

  });

}


// Firestoreから取得
async function loadCases() {

  caseList.innerHTML =
    "<p>読み込み中...</p>";

  caseCount.textContent =
    "読み込み中...";


  try {

    const casesQuery =
      query(

        collection(db, "reports"),

        orderBy("createdAt", "desc")

      );


    const snapshot =
      await getDocs(casesQuery);


    const cases =
      snapshot.docs.map((document) => ({

        id: document.id,

        ...document.data()

      }));


    displayCases(cases);


  } catch (error) {

    console.error(
      "事例一覧読み込みエラー:",
      error
    );


    caseCount.textContent = "";


    caseList.innerHTML = `
      <p>
        事例の読み込みに失敗しました。
      </p>

      <p style="font-size:0.9rem;">
        ページを再読み込みしてください。
      </p>
    `;

  }

}


loadCases();

import { db } from "./firebase.js";

import {
  setCategoryOptions
} from "./master-data.js";

import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const reportList =
  document.getElementById("reportList");

const resultCount =
  document.getElementById("resultCount");

const searchBox =
  document.getElementById("searchBox");

const departmentFilter =
  document.getElementById("departmentFilter");

const categoryFilter =
  document.getElementById("categoryFilter");

const levelFilter =
  document.getElementById("levelFilter");

const resetFilters =
  document.getElementById("resetFilters");


let reports = [];


// 業務区分フィルターを初期化
function initializeCategoryFilter() {
  setCategoryOptions(
    categoryFilter,
    {
      firstOptionText:
        "すべての業務区分",

      preserveUnknownValue:
        false
    }
  );
}


// HTMLに安全に文字を表示する
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


// 一覧を表示
function displayReports(data) {
  reportList.innerHTML = "";

  resultCount.textContent =
    `${data.length}件の事例があります。`;

  if (data.length === 0) {
    reportList.innerHTML = `
      <p>
        条件に一致する事例はありません。
      </p>
    `;

    return;
  }

  data.forEach((report) => {
    const badge =
      createLevelBadge(report.level);

    reportList.insertAdjacentHTML(
      "beforeend",
      `
        <div class="news">

          <h3>
            <a href="detail.html?id=${encodeURIComponent(report.id)}">
              ${escapeHtml(
                report.title || "タイトル未設定"
              )}
            </a>
          </h3>

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
            ${badge}
          </p>

          <p>
            <strong>発生日：</strong>
            ${escapeHtml(
              report.date || "未設定"
            )}
          </p>

        </div>
      `
    );
  });
}


// 検索・絞り込み
function applyFilters() {
  const keyword =
    searchBox.value
      .trim()
      .toLowerCase();

  const selectedDepartment =
    departmentFilter.value;

  const selectedCategory =
    categoryFilter.value;

  const selectedLevel =
    levelFilter.value;

  const filteredReports =
    reports.filter((report) => {
      const searchableText = [
        report.title,
        report.situation,
        report.cause,
        report.countermeasure,
        report.lesson,
        report.tags,
        report.department,
        report.category,
        report.place,
        report.level
      ]
        .map((value) =>
          String(value ?? "").toLowerCase()
        )
        .join(" ");

      const keywordMatch =
        keyword === "" ||
        searchableText.includes(keyword);

      const departmentMatch =
        selectedDepartment === "" ||
        report.department === selectedDepartment;

      const categoryMatch =
        selectedCategory === "" ||
        report.category === selectedCategory;

      const levelMatch =
        selectedLevel === "" ||
        report.level === selectedLevel;

      return (
        keywordMatch &&
        departmentMatch &&
        categoryMatch &&
        levelMatch
      );
    });

  displayReports(filteredReports);
}


// Firestoreから取得
async function loadReports() {
  reportList.innerHTML =
    "<p>読み込み中...</p>";

  resultCount.textContent =
    "読み込み中...";

  try {
    const reportsQuery =
      query(
        collection(db, "reports"),
        orderBy("createdAt", "desc")
      );

    const snapshot =
      await getDocs(reportsQuery);

    reports =
      snapshot.docs.map((document) => ({
        id: document.id,
        ...document.data()
      }));

    applyFilters();

  } catch (error) {
    console.error(
      "一覧読み込みエラー:",
      error
    );

    resultCount.textContent = "";

    reportList.innerHTML = `
      <p>
        一覧の読み込みに失敗しました。
      </p>

      <p style="font-size:0.9rem;">
        ページを再読み込みしてください。
      </p>
    `;
  }
}


// 絞り込み条件変更
searchBox.addEventListener(
  "input",
  applyFilters
);

departmentFilter.addEventListener(
  "change",
  applyFilters
);

categoryFilter.addEventListener(
  "change",
  applyFilters
);

levelFilter.addEventListener(
  "change",
  applyFilters
);


// 絞り込み解除
resetFilters.addEventListener(
  "click",
  () => {
    searchBox.value = "";
    departmentFilter.value = "";
    categoryFilter.value = "";
    levelFilter.value = "";

    applyFilters();
  }
);


// 初期表示
initializeCategoryFilter();

loadReports();

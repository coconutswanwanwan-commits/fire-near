import {
  db,
  auth
} from "./firebase.js";

import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


const reportStatus =
  document.getElementById("reportStatus");

const reportControls =
  document.getElementById("reportControls");

const reportMonth =
  document.getElementById("reportMonth");

const createReportButton =
  document.getElementById("createReportButton");

const printReportButton =
  document.getElementById("printReportButton");

const monthlyReport =
  document.getElementById("monthlyReport");

const reportPeriod =
  document.getElementById("reportPeriod");

const monthlyTotalCount =
  document.getElementById("monthlyTotalCount");

const monthlyFeaturedCount =
  document.getElementById("monthlyFeaturedCount");

const levelReport =
  document.getElementById("levelReport");

const departmentReport =
  document.getElementById("departmentReport");

const categoryReport =
  document.getElementById("categoryReport");

const featuredCaseReport =
  document.getElementById("featuredCaseReport");

const popularCaseReport =
  document.getElementById("popularCaseReport");

const allCaseReport =
  document.getElementById("allCaseReport");

const generatedInformation =
  document.getElementById("generatedInformation");


let allReports = [];
let currentAdminUser = null;


// HTMLへ安全に表示
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// 状態表示
function showStatus(
  message,
  type = ""
) {
  reportStatus.textContent =
    message;

  reportStatus.className =
    "report-status";

  if (type) {
    reportStatus.classList.add(type);
  }
}


// 管理者確認
async function checkAdmin(user) {
  if (!user) {
    return false;
  }

  const adminReference =
    doc(
      db,
      "admins",
      user.uid
    );

  const adminSnapshot =
    await getDoc(
      adminReference
    );

  return adminSnapshot.exists();
}


// 現在月をYYYY-MM形式で取得
function getCurrentMonthValue() {
  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(2, "0");

  return `${year}-${month}`;
}


// YYYY-MMを日本語表示
function formatMonthLabel(value) {
  const [
    year,
    month
  ] = value.split("-");

  return `${year}年${Number(month)}月`;
}


// 項目別集計
function countByField(
  reports,
  fieldName
) {
  const counts = {};

  reports.forEach((report) => {
    const value =
      String(
        report[fieldName] ||
        "未設定"
      );

    counts[value] =
      (counts[value] || 0) + 1;
  });

  return counts;
}


// 集計表を作成
function createStatisticsTable(
  counts,
  preferredOrder = []
) {
  let entries =
    Object.entries(counts);


  if (preferredOrder.length > 0) {
    entries.sort(
      ([firstLabel], [secondLabel]) => {
        const firstIndex =
          preferredOrder.indexOf(
            firstLabel
          );

        const secondIndex =
          preferredOrder.indexOf(
            secondLabel
          );

        const normalizedFirst =
          firstIndex === -1
            ? 999
            : firstIndex;

        const normalizedSecond =
          secondIndex === -1
            ? 999
            : secondIndex;

        if (
          normalizedFirst !==
          normalizedSecond
        ) {
          return (
            normalizedFirst -
            normalizedSecond
          );
        }

        return firstLabel.localeCompare(
          secondLabel,
          "ja"
        );
      }
    );

  } else {
    entries.sort(
      (first, second) =>
        second[1] - first[1]
    );
  }


  if (entries.length === 0) {
    return `
      <p class="empty-message">
        該当するデータはありません。
      </p>
    `;
  }


  return `
    <table class="statistics-table">

      <thead>
        <tr>
          <th>区分</th>
          <th>件数</th>
        </tr>
      </thead>

      <tbody>

        ${entries
          .map(([label, count]) => `
            <tr>
              <td>
                ${escapeHtml(label)}
              </td>

              <td>
                ${count}件
              </td>
            </tr>
          `)
          .join("")}

      </tbody>

    </table>
  `;
}


// 事例カードを作成
function createCaseCard(
  report,
  options = {}
) {
  const importantClass =
    options.important
      ? " important-case"
      : "";

  const helpful =
    Number(
      report.helpful || 0
    );

  return `
    <article class="report-case${importantClass}">

      <div class="report-case-title">
        ${options.important ? "📌 " : ""}
        ${escapeHtml(
          report.title ||
          "タイトル未設定"
        )}
      </div>

      <div class="report-case-info">

        発生日：
        ${escapeHtml(
          report.date || "未設定"
        )}

        ／ 所属：
        ${escapeHtml(
          report.department || "未設定"
        )}

        ／ 業務区分：
        ${escapeHtml(
          report.category || "未設定"
        )}

        <br>

        レベル：
        ${escapeHtml(
          report.level || "未設定"
        )}

        ／ 参考になった：
        ${helpful}件

      </div>

      ${
        options.showSituation
          ? `
            <div class="report-case-text">
              <strong>発生状況：</strong><br>
              ${escapeHtml(
                report.situation ||
                "未入力"
              )}
            </div>
          `
          : ""
      }

      ${
        options.showCountermeasure
          ? `
            <div class="report-case-text">
              <strong>改善策：</strong><br>
              ${escapeHtml(
                report.countermeasure ||
                "未入力"
              )}
            </div>
          `
          : ""
      }

    </article>
  `;
}


// レポート作成
function createMonthlyReport() {
  const selectedMonth =
    reportMonth.value;

  if (!selectedMonth) {
    showStatus(
      "集計対象月を選択してください。",
      "error"
    );

    return;
  }


  const monthlyReports =
    allReports

      .filter((report) =>
        String(
          report.date || ""
        ).startsWith(selectedMonth)
      )

      .sort((first, second) =>
        String(second.date || "")
          .localeCompare(
            String(first.date || "")
          )
      );


  const featuredReports =
    monthlyReports.filter(
      (report) =>
        report.featured === true
    );


  const popularReports =
    [...monthlyReports]

      .filter((report) =>
        Number(
          report.helpful || 0
        ) > 0
      )

      .sort(
        (first, second) =>
          Number(
            second.helpful || 0
          ) -
          Number(
            first.helpful || 0
          )
      )

      .slice(0, 5);


  const levelCounts =
    countByField(
      monthlyReports,
      "level"
    );

  const departmentCounts =
    countByField(
      monthlyReports,
      "department"
    );

  const categoryCounts =
    countByField(
      monthlyReports,
      "category"
    );


  reportPeriod.textContent =
    `${formatMonthLabel(selectedMonth)}分`;


  monthlyTotalCount.textContent =
    `${monthlyReports.length}件`;


  monthlyFeaturedCount.textContent =
    `${featuredReports.length}件`;


  levelReport.innerHTML =
    createStatisticsTable(
      levelCounts,
      [
        "レベル1（軽微）",
        "レベル2（注意）",
        "レベル3（重大）",
        "レベル4（事故寸前）",
        "未設定"
      ]
    );


  departmentReport.innerHTML =
    createStatisticsTable(
      departmentCounts,
      [
        "消防本部",
        "消防署",
        "北分署",
        "南分署",
        "未設定"
      ]
    );


  categoryReport.innerHTML =
    createStatisticsTable(
      categoryCounts
    );


  featuredCaseReport.innerHTML =
    featuredReports.length > 0
      ? featuredReports
          .map((report) =>
            createCaseCard(
              report,
              {
                important: true,
                showSituation: true,
                showCountermeasure: true
              }
            )
          )
          .join("")
      : `
        <p class="empty-message">
          この月に設定された重要事例はありません。
        </p>
      `;


  popularCaseReport.innerHTML =
    popularReports.length > 0
      ? popularReports
          .map((report, index) => `
            <div
              style="
                margin-bottom:6px;
                font-weight:bold;
              "
            >
              ${index + 1}位
            </div>

            ${createCaseCard(report)}
          `)
          .join("")
      : `
        <p class="empty-message">
          この月に「参考になった」が送信された事例はありません。
        </p>
      `;


  allCaseReport.innerHTML =
    monthlyReports.length > 0
      ? monthlyReports
          .map((report) =>
            createCaseCard(
              report,
              {
                showSituation: true,
                showCountermeasure: true
              }
            )
          )
          .join("")
      : `
        <p class="empty-message">
          この月の事例はありません。
        </p>
      `;


  const generatedDate =
    new Date()
      .toLocaleString(
        "ja-JP"
      );


  generatedInformation.textContent =
    `作成日時：${generatedDate}　作成者：${
      currentAdminUser?.displayName ||
      currentAdminUser?.email ||
      "管理者"
    }`;


  monthlyReport.hidden =
    false;

  printReportButton.disabled =
    false;


  showStatus(
    `${formatMonthLabel(selectedMonth)}のレポートを作成しました。`
  );


  monthlyReport.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


// PDF・印刷
function printReport() {
  if (monthlyReport.hidden) {
    showStatus(
      "先にレポートを作成してください。",
      "error"
    );

    return;
  }

  window.print();
}


// Firestoreから事例を取得
async function loadReports() {
  showStatus(
    "事例データを読み込んでいます..."
  );


  try {
    const snapshot =
      await getDocs(
        collection(
          db,
          "reports"
        )
      );


    allReports =
      snapshot.docs.map(
        (document) => ({
          id: document.id,
          ...document.data()
        })
      );


    reportControls.hidden =
      false;


    showStatus(
      "対象月を選択してレポートを作成してください。"
    );

  } catch (error) {
    console.error(
      "レポートデータ読み込みエラー:",
      error
    );


    showStatus(
      "事例データの読み込みに失敗しました。",
      "error"
    );
  }
}


// ログイン状態確認
onAuthStateChanged(
  auth,
  async (user) => {
    reportControls.hidden =
      true;

    monthlyReport.hidden =
      true;

    currentAdminUser =
      null;


    if (!user) {
      showStatus(
        "管理者としてログインしていません。管理ダッシュボードからログインしてください。",
        "error"
      );

      return;
    }


    showStatus(
      "管理者権限を確認しています..."
    );


    try {
      const isAdmin =
        await checkAdmin(user);


      if (!isAdmin) {
        showStatus(
          "このGoogleアカウントには管理者権限がありません。",
          "error"
        );

        return;
      }


      currentAdminUser =
        user;


      reportMonth.value =
        getCurrentMonthValue();


      await loadReports();

    } catch (error) {
      console.error(
        "管理者権限確認エラー:",
        error
      );


      showStatus(
        "管理者権限の確認に失敗しました。",
        "error"
      );
    }
  }
);


createReportButton.addEventListener(
  "click",
  createMonthlyReport
);


printReportButton.addEventListener(
  "click",
  printReport
);

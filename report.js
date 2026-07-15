import {
  db,
  auth
} from "./firebase.js";

import {
  collection,
  doc,
  getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


const statusMessage =
  document.getElementById("statusMessage");

const reportArea =
  document.getElementById("reportArea");

const monthInput =
  document.getElementById("monthInput");

const reportTitleInput =
  document.getElementById("reportTitleInput");

const createButton =
  document.getElementById("createButton");

const printButton =
  document.getElementById("printButton");

const currentMonthButton =
  document.getElementById("currentMonthButton");

const reportHeading =
  document.getElementById("reportHeading");

const reportPeriod =
  document.getElementById("reportPeriod");

const reportCreatedDate =
  document.getElementById("reportCreatedDate");

const totalCount =
  document.getElementById("totalCount");

const featuredCount =
  document.getElementById("featuredCount");

const highRiskCount =
  document.getElementById("highRiskCount");

const departmentCount =
  document.getElementById("departmentCount");

const analysisText =
  document.getElementById("analysisText");

const levelChart =
  document.getElementById("levelChart");

const departmentChart =
  document.getElementById("departmentChart");

const featuredCaseList =
  document.getElementById("featuredCaseList");

const highRiskCaseList =
  document.getElementById("highRiskCaseList");

const reportTableBody =
  document.getElementById("reportTableBody");


let allReports = [];
let monthlyReports = [];


function showStatus(
  message,
  isError = false
) {
  statusMessage.hidden =
    false;

  statusMessage.textContent =
    message;

  statusMessage.className =
    "status-message";

  if (isError) {
    statusMessage.classList.add(
      "error-message"
    );
  }
}


function hideStatus() {
  statusMessage.hidden =
    true;
}


function escapeHtml(value) {
  return String(
    value ?? ""
  )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function getCurrentMonthString() {
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


function getReportDate(report) {
  const value =
    report.createdAt ||
    report.date ||
    report.reportDate ||
    null;

  if (!value) {
    return null;
  }

  if (
    typeof value.toDate ===
    "function"
  ) {
    return value.toDate();
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}


function formatDate(value) {
  const date =
    value instanceof Date
      ? value
      : null;

  if (!date) {
    return "未記録";
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
}


function formatCreatedDate() {
  const now =
    new Date();

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  ).format(now);
}


function getTitle(report) {
  return (
    report.title ||
    report.subject ||
    report.category ||
    "無題の投稿"
  );
}


function getDepartment(report) {
  return (
    report.department ||
    report.affiliation ||
    report.station ||
    report.section ||
    "所属未設定"
  );
}


function getLevel(report) {
  const rawLevel =
    report.level ??
    report.riskLevel ??
    report.severity ??
    "";

  const match =
    String(rawLevel).match(/[1-4]/);

  return match
    ? match[0]
    : "";
}


function getSummary(report) {
  return (
    report.summary ||
    report.description ||
    report.content ||
    report.detail ||
    "内容の記載はありません。"
  );
}


async function checkAdmin(user) {
  if (!user) {
    return false;
  }

  const adminSnapshot =
    await getDoc(
      doc(
        db,
        "admins",
        user.uid
      )
    );

  return adminSnapshot.exists();
}


function getSelectedMonthRange() {
  const selectedMonth =
    monthInput.value;

  if (!selectedMonth) {
    return null;
  }

  const [
    yearText,
    monthText
  ] =
    selectedMonth.split("-");

  const year =
    Number(yearText);

  const month =
    Number(monthText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month)
  ) {
    return null;
  }

  const start =
    new Date(
      year,
      month - 1,
      1,
      0,
      0,
      0,
      0
    );

  const end =
    new Date(
      year,
      month,
      0,
      23,
      59,
      59,
      999
    );

  return {
    year,
    month,
    start,
    end
  };
}


function createCountMap(
  reports,
  getKey
) {
  const countMap = {};

  reports.forEach(
    report => {
      const key =
        getKey(report);

      countMap[key] =
        (countMap[key] || 0) + 1;
    }
  );

  return countMap;
}


function renderBarChart(
  element,
  entries,
  emptyMessage
) {
  element.innerHTML =
    "";

  if (entries.length === 0) {
    element.innerHTML = `
      <div class="empty-message">
        ${escapeHtml(emptyMessage)}
      </div>
    `;

    return;
  }

  const maximum =
    Math.max(
      ...entries.map(
        entry => entry[1]
      ),
      1
    );

  entries.forEach(
    ([label, value]) => {
      const percentage =
        Math.max(
          (value / maximum) * 100,
          value > 0 ? 3 : 0
        );

      const row =
        document.createElement(
          "div"
        );

      row.className =
        "chart-row";

      row.innerHTML = `
        <div class="chart-label">
          ${escapeHtml(label)}
        </div>

        <div class="chart-track">

          <div
            class="chart-bar"
            style="width:${percentage}%"
          ></div>

        </div>

        <div class="chart-value">
          ${escapeHtml(value)}件
        </div>
      `;

      element.appendChild(row);
    }
  );
}


function renderSummary() {
  totalCount.textContent =
    monthlyReports.length;

  const featured =
    monthlyReports.filter(
      report =>
        report.featured === true
    ).length;

  featuredCount.textContent =
    featured;

  const highRisk =
    monthlyReports.filter(
      report => {
        const level =
          getLevel(report);

        return (
          level === "3" ||
          level === "4"
        );
      }
    ).length;

  highRiskCount.textContent =
    highRisk;

  const departments =
    new Set(
      monthlyReports
        .map(getDepartment)
        .filter(
          department =>
            department !==
            "所属未設定"
        )
    );

  departmentCount.textContent =
    departments.size;
}


function renderLevelChart() {
  const counts = {
    "レベル1": 0,
    "レベル2": 0,
    "レベル3": 0,
    "レベル4": 0,
    "未設定": 0
  };

  monthlyReports.forEach(
    report => {
      const level =
        getLevel(report);

      if (level) {
        counts[
          `レベル${level}`
        ] += 1;

      } else {
        counts["未設定"] += 1;
      }
    }
  );

  const entries =
    Object.entries(
      counts
    ).filter(
      entry =>
        entry[1] > 0
    );

  renderBarChart(
    levelChart,
    entries,
    "対象月のレベル別データはありません。"
  );
}


function renderDepartmentChart() {
  const counts =
    createCountMap(
      monthlyReports,
      getDepartment
    );

  const entries =
    Object.entries(
      counts
    ).sort(
      (a, b) => {
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }

        return a[0].localeCompare(
          b[0],
          "ja"
        );
      }
    );

  renderBarChart(
    departmentChart,
    entries,
    "対象月の所属別データはありません。"
  );
}


function createCaseElement(report) {
  const article =
    document.createElement(
      "article"
    );

  article.className =
    "case-item";

  if (report.featured === true) {
    article.classList.add(
      "featured"
    );
  }

  const level =
    getLevel(report);

  article.innerHTML = `
    <div class="case-header">

      <h3 class="case-title">
        ${escapeHtml(
          getTitle(report)
        )}
      </h3>

      ${
        report.featured === true
          ? '<span class="featured-mark">📌 重要事例</span>'
          : ""
      }

    </div>


    <div class="case-meta">

      <span class="meta-chip">
        ${escapeHtml(
          formatDate(
            getReportDate(report)
          )
        )}
      </span>

      <span class="meta-chip">
        ${escapeHtml(
          getDepartment(report)
        )}
      </span>

      <span class="meta-chip">
        ${escapeHtml(
          level
            ? `レベル${level}`
            : "レベル未設定"
        )}
      </span>

    </div>


    <div class="case-description">
      ${escapeHtml(
        getSummary(report)
      )}
    </div>
  `;

  return article;
}


function renderCaseList(
  element,
  reports,
  emptyMessage
) {
  element.innerHTML =
    "";

  if (reports.length === 0) {
    element.innerHTML = `
      <div class="empty-message">
        ${escapeHtml(emptyMessage)}
      </div>
    `;

    return;
  }

  reports.forEach(
    report => {
      element.appendChild(
        createCaseElement(report)
      );
    }
  );
}


function renderImportantCases() {
  const featuredReports =
    monthlyReports.filter(
      report =>
        report.featured === true
    );

  renderCaseList(
    featuredCaseList,
    featuredReports,
    "対象月に重要事例はありません。"
  );

  const highRiskReports =
    monthlyReports.filter(
      report => {
        const level =
          getLevel(report);

        return (
          level === "3" ||
          level === "4"
        );
      }
    );

  renderCaseList(
    highRiskCaseList,
    highRiskReports,
    "対象月にレベル3・4の事例はありません。"
  );
}


function renderTable() {
  reportTableBody.innerHTML =
    "";

  if (monthlyReports.length === 0) {
    reportTableBody.innerHTML = `
      <tr>
        <td colspan="5">
          対象月の投稿はありません。
        </td>
      </tr>
    `;

    return;
  }

  monthlyReports.forEach(
    report => {
      const row =
        document.createElement(
          "tr"
        );

      const level =
        getLevel(report);

      row.innerHTML = `
        <td>
          ${escapeHtml(
            formatDate(
              getReportDate(report)
            )
          )}
        </td>

        <td>
          ${escapeHtml(
            getTitle(report)
          )}
        </td>

        <td>
          ${escapeHtml(
            getDepartment(report)
          )}
        </td>

        <td>
          ${escapeHtml(
            level
              ? `レベル${level}`
              : "未設定"
          )}
        </td>

        <td>
          ${
            report.featured === true
              ? "重要"
              : "通常"
          }
        </td>
      `;

      reportTableBody.appendChild(
        row
      );
    }
  );
}


function createAnalysisText() {
  const total =
    monthlyReports.length;

  if (total === 0) {
    return (
      "対象月の投稿はありませんでした。\n" +
      "投稿状況を確認し、職員がヒヤリハット事例を共有しやすい環境づくりを継続します。"
    );
  }

  const featured =
    monthlyReports.filter(
      report =>
        report.featured === true
    ).length;

  const highRisk =
    monthlyReports.filter(
      report => {
        const level =
          getLevel(report);

        return (
          level === "3" ||
          level === "4"
        );
      }
    ).length;

  const departmentCounts =
    createCountMap(
      monthlyReports,
      getDepartment
    );

  const topDepartmentEntry =
    Object.entries(
      departmentCounts
    ).sort(
      (a, b) =>
        b[1] - a[1]
    )[0];

  const levelCounts =
    createCountMap(
      monthlyReports,
      report => {
        const level =
          getLevel(report);

        return level
          ? `レベル${level}`
          : "未設定";
      }
    );

  const topLevelEntry =
    Object.entries(
      levelCounts
    ).sort(
      (a, b) =>
        b[1] - a[1]
    )[0];

  const lines = [];

  lines.push(
    `対象月の投稿件数は合計${total}件でした。`
  );

  if (topLevelEntry) {
    lines.push(
      `最も多かった区分は${topLevelEntry[0]}で、${topLevelEntry[1]}件でした。`
    );
  }

  if (topDepartmentEntry) {
    lines.push(
      `所属別では「${topDepartmentEntry[0]}」からの投稿が最も多く、${topDepartmentEntry[1]}件でした。`
    );
  }

  lines.push(
    `重要事例は${featured}件、レベル3・4の事例は${highRisk}件でした。`
  );

  if (highRisk > 0) {
    lines.push(
      "レベル3・4の事例については、原因や背景を確認し、必要に応じて組織内で再発防止策を共有する必要があります。"
    );

  } else {
    lines.push(
      "レベル3・4に該当する事例はありませんでしたが、軽微な事例を含めた継続的な情報共有が重要です。"
    );
  }

  return lines.join("\n");
}


function createReport() {
  const range =
    getSelectedMonthRange();

  if (!range) {
    alert(
      "集計月を選択してください。"
    );

    monthInput.focus();
    return;
  }

  const reportTitle =
    reportTitleInput.value.trim() ||
    "消防ヒヤリハット月例レポート";

  monthlyReports =
    allReports
      .filter(
        report => {
          const reportDate =
            getReportDate(report);

          if (!reportDate) {
            return false;
          }

          return (
            reportDate >= range.start &&
            reportDate <= range.end
          );
        }
      )
      .sort(
        (a, b) => {
          const dateA =
            getReportDate(a);

          const dateB =
            getReportDate(b);

          return (
            (dateB?.getTime() || 0) -
            (dateA?.getTime() || 0)
          );
        }
      );

  reportHeading.textContent =
    reportTitle;

  reportPeriod.textContent =
    `${range.year}年${range.month}月分`;

  reportCreatedDate.textContent =
    `作成日：${formatCreatedDate()}`;

  renderSummary();

  analysisText.textContent =
    createAnalysisText();

  renderLevelChart();
  renderDepartmentChart();
  renderImportantCases();
  renderTable();

  reportArea.hidden =
    false;

  hideStatus();

  reportArea.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


async function loadReports() {
  showStatus(
    "投稿データを読み込んでいます..."
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
        reportDocument => ({
          id:
            reportDocument.id,

          ...reportDocument.data()
        })
      );

    hideStatus();
    createReport();

  } catch (error) {
    console.error(
      "月例レポートデータ取得エラー:",
      error
    );

    showStatus(
      "投稿データの取得に失敗しました。Firestoreの設定と通信状態を確認してください。",
      true
    );
  }
}


createButton.addEventListener(
  "click",
  createReport
);


printButton.addEventListener(
  "click",
  () => {
    if (reportArea.hidden) {
      createReport();
    }

    if (!reportArea.hidden) {
      window.print();
    }
  }
);


currentMonthButton.addEventListener(
  "click",
  () => {
    monthInput.value =
      getCurrentMonthString();

    createReport();
  }
);


reportTitleInput.addEventListener(
  "keydown",
  event => {
    if (event.key === "Enter") {
      event.preventDefault();
      createReport();
    }
  }
);


onAuthStateChanged(
  auth,
  async user => {
    try {
      const isAdmin =
        await checkAdmin(user);

      if (!isAdmin) {
        location.replace(
          "admin.html"
        );

        return;
      }

      monthInput.value =
        getCurrentMonthString();

      await loadReports();

    } catch (error) {
      console.error(
        "管理者確認エラー:",
        error
      );

      showStatus(
        "管理者権限を確認できませんでした。",
        true
      );
    }
  }
);

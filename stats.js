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

const statisticsArea =
  document.getElementById("statisticsArea");

const startDate =
  document.getElementById("startDate");

const endDate =
  document.getElementById("endDate");

const departmentFilter =
  document.getElementById("departmentFilter");

const filterButton =
  document.getElementById("filterButton");

const resetButton =
  document.getElementById("resetButton");

const csvButton =
  document.getElementById("csvButton");

const printButton =
  document.getElementById("printButton");

const totalCount =
  document.getElementById("totalCount");

const featuredCount =
  document.getElementById("featuredCount");

const highRiskCount =
  document.getElementById("highRiskCount");

const departmentCount =
  document.getElementById("departmentCount");

const monthlyChart =
  document.getElementById("monthlyChart");

const levelChart =
  document.getElementById("levelChart");

const departmentChart =
  document.getElementById("departmentChart");

const reportTableBody =
  document.getElementById("reportTableBody");


let allReports = [];
let filteredReports = [];


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
      : getReportDate({
          createdAt: value
        });

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
    ""
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


function populateDepartmentFilter() {
  const selectedValue =
    departmentFilter.value;

  const departments =
    [
      ...new Set(
        allReports
          .map(getDepartment)
          .filter(
            department =>
              department !==
              "所属未設定"
          )
      )
    ].sort(
      (a, b) =>
        a.localeCompare(
          b,
          "ja"
        )
    );

  departmentFilter.innerHTML =
    '<option value="">すべて</option>';

  departments.forEach(
    department => {
      const option =
        document.createElement(
          "option"
        );

      option.value =
        department;

      option.textContent =
        department;

      departmentFilter.appendChild(
        option
      );
    }
  );

  if (
    departments.includes(
      selectedValue
    )
  ) {
    departmentFilter.value =
      selectedValue;
  }
}


function applyFilters() {
  const start =
    startDate.value
      ? new Date(
          `${startDate.value}T00:00:00`
        )
      : null;

  const end =
    endDate.value
      ? new Date(
          `${endDate.value}T23:59:59.999`
        )
      : null;

  const selectedDepartment =
    departmentFilter.value;

  filteredReports =
    allReports.filter(
      report => {
        const reportDate =
          getReportDate(report);

        if (
          start &&
          (
            !reportDate ||
            reportDate < start
          )
        ) {
          return false;
        }

        if (
          end &&
          (
            !reportDate ||
            reportDate > end
          )
        ) {
          return false;
        }

        if (
          selectedDepartment &&
          getDepartment(report) !==
          selectedDepartment
        ) {
          return false;
        }

        return true;
      }
    );

  renderStatistics();
}


function createCountMap(
  reports,
  getKey
) {
  const map = {};

  reports.forEach(
    report => {
      const key =
        getKey(report);

      map[key] =
        (map[key] || 0) + 1;
    }
  );

  return map;
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
      const row =
        document.createElement(
          "div"
        );

      row.className =
        "chart-row";

      const percentage =
        Math.max(
          (value / maximum) * 100,
          value > 0 ? 3 : 0
        );

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
    filteredReports.length;

  const featured =
    filteredReports.filter(
      report =>
        report.featured === true
    ).length;

  featuredCount.textContent =
    featured;

  const highRisk =
    filteredReports.filter(
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
      filteredReports
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


function renderMonthlyChart() {
  const monthlyCounts =
    createCountMap(
      filteredReports.filter(
        report =>
          getReportDate(report)
      ),
      report => {
        const date =
          getReportDate(report);

        const year =
          date.getFullYear();

        const month =
          String(
            date.getMonth() + 1
          ).padStart(2, "0");

        return `${year}年${month}月`;
      }
    );

  const entries =
    Object.entries(
      monthlyCounts
    ).sort(
      (a, b) =>
        a[0].localeCompare(
          b[0],
          "ja"
        )
    );

  renderBarChart(
    monthlyChart,
    entries,
    "月別集計の対象データがありません。"
  );
}


function renderLevelChart() {
  const levelCounts = {
    "レベル1": 0,
    "レベル2": 0,
    "レベル3": 0,
    "レベル4": 0,
    "未設定": 0
  };

  filteredReports.forEach(
    report => {
      const level =
        getLevel(report);

      if (level) {
        levelCounts[
          `レベル${level}`
        ] += 1;

      } else {
        levelCounts["未設定"] += 1;
      }
    }
  );

  const entries =
    Object.entries(
      levelCounts
    ).filter(
      entry =>
        entry[1] > 0
    );

  renderBarChart(
    levelChart,
    entries,
    "レベル別集計の対象データがありません。"
  );
}


function renderDepartmentChart() {
  const departmentCounts =
    createCountMap(
      filteredReports,
      getDepartment
    );

  const entries =
    Object.entries(
      departmentCounts
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
    "所属別集計の対象データがありません。"
  );
}


function renderTable() {
  reportTableBody.innerHTML =
    "";

  if (
    filteredReports.length === 0
  ) {
    reportTableBody.innerHTML = `
      <tr>
        <td colspan="5">
          集計対象の投稿はありません。
        </td>
      </tr>
    `;

    return;
  }

  filteredReports.forEach(
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

        <td class="${
          report.featured === true
            ? "featured-text"
            : ""
        }">
          ${
            report.featured === true
              ? "📌 重要"
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


function renderStatistics() {
  filteredReports.sort(
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

  renderSummary();
  renderMonthlyChart();
  renderLevelChart();
  renderDepartmentChart();
  renderTable();

  statisticsArea.hidden =
    false;

  hideStatus();
}


function escapeCsv(value) {
  const text =
    String(
      value ?? ""
    );

  return `"${text.replaceAll(
    '"',
    '""'
  )}"`;
}


function createCsvText() {
  const headers = [
    "投稿ID",
    "登録日時",
    "タイトル",
    "所属",
    "レベル",
    "分類",
    "発生場所",
    "概要",
    "詳細内容",
    "原因・背景",
    "再発防止策・改善案",
    "重要事例"
  ];

  const rows =
    filteredReports.map(
      report => [
        report.id || "",
        formatDate(
          getReportDate(report)
        ),
        getTitle(report),
        getDepartment(report),
        getLevel(report)
          ? `レベル${getLevel(report)}`
          : "未設定",
        report.category || "",
        report.location ||
          report.place ||
          "",
        report.summary || "",
        getSummary(report),
        report.cause ||
          report.background ||
          "",
        report.countermeasure ||
          report.improvement ||
          report.preventiveAction ||
          "",
        report.featured === true
          ? "重要事例"
          : "通常"
      ]
    );

  return [
    headers,
    ...rows
  ]
    .map(
      row =>
        row
          .map(escapeCsv)
          .join(",")
    )
    .join("\r\n");
}


function downloadCsv() {
  if (
    filteredReports.length === 0
  ) {
    alert(
      "CSVに出力できる投稿がありません。"
    );

    return;
  }

  const csvText =
    createCsvText();

  const bom =
    "\uFEFF";

  const blob =
    new Blob(
      [
        bom +
        csvText
      ],
      {
        type:
          "text/csv;charset=utf-8"
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  const today =
    new Date();

  const fileDate = [
    today.getFullYear(),
    String(
      today.getMonth() + 1
    ).padStart(2, "0"),
    String(
      today.getDate()
    ).padStart(2, "0")
  ].join("");

  link.href =
    url;

  link.download =
    `fire-near-statistics-${fileDate}.csv`;

  document.body.appendChild(
    link
  );

  link.click();
  link.remove();

  setTimeout(
    () => {
      URL.revokeObjectURL(
        url
      );
    },
    1000
  );
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

    populateDepartmentFilter();

    filteredReports = [
      ...allReports
    ];

    renderStatistics();

  } catch (error) {
    console.error(
      "統計データ取得エラー:",
      error
    );

    showStatus(
      "投稿データの取得に失敗しました。Firestoreの設定と通信状態を確認してください。",
      true
    );
  }
}


filterButton.addEventListener(
  "click",
  applyFilters
);


resetButton.addEventListener(
  "click",
  () => {
    startDate.value =
      "";

    endDate.value =
      "";

    departmentFilter.value =
      "";

    filteredReports = [
      ...allReports
    ];

    renderStatistics();
  }
);


csvButton.addEventListener(
  "click",
  downloadCsv
);


printButton.addEventListener(
  "click",
  () => {
    window.print();
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

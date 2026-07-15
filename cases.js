import {
  db,
  auth
} from "./firebase.js";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


const keywordInput =
  document.getElementById("keywordInput");

const levelFilter =
  document.getElementById("levelFilter");

const departmentFilter =
  document.getElementById("departmentFilter");

const featuredFilter =
  document.getElementById("featuredFilter");

const startDate =
  document.getElementById("startDate");

const endDate =
  document.getElementById("endDate");

const filterButton =
  document.getElementById("filterButton");

const resetButton =
  document.getElementById("resetButton");

const resultCount =
  document.getElementById("resultCount");

const statusMessage =
  document.getElementById("statusMessage");

const caseList =
  document.getElementById("caseList");


let allReports = [];
let unsubscribeReports = null;


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

  caseList.hidden =
    true;
}


function normalizeText(value) {
  return String(
    value ?? ""
  )
    .trim()
    .toLowerCase();
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


function formatDate(value) {
  if (!value) {
    return "日付未設定";
  }

  let date;

  if (
    typeof value.toDate ===
    "function"
  ) {
    date = value.toDate();

  } else {
    date = new Date(value);
  }

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "日付未設定";
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


function getDateValue(report) {
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


function getReportTitle(report) {
  return (
    report.title ||
    report.subject ||
    report.category ||
    "無題の投稿"
  );
}


function getReportSummary(report) {
  return (
    report.summary ||
    report.description ||
    report.content ||
    report.detail ||
    "内容の記載はありません。"
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
            (department) =>
              department &&
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

  departments.forEach((department) => {
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
  });

  if (
    departments.includes(
      selectedValue
    )
  ) {
    departmentFilter.value =
      selectedValue;
  }
}


function filterReports() {
  const keyword =
    normalizeText(
      keywordInput.value
    );

  const selectedLevel =
    levelFilter.value;

  const selectedDepartment =
    departmentFilter.value;

  const selectedFeatured =
    featuredFilter.value;

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

  return allReports.filter(
    (report) => {
      const searchableText =
        normalizeText(
          [
            getReportTitle(report),
            getReportSummary(report),
            getDepartment(report),
            report.category,
            report.cause,
            report.countermeasure,
            report.location,
            report.authorName
          ].join(" ")
        );

      if (
        keyword &&
        !searchableText.includes(
          keyword
        )
      ) {
        return false;
      }

      if (
        selectedLevel &&
        getLevel(report) !==
        selectedLevel
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

      if (
        selectedFeatured ===
          "featured" &&
        report.featured !== true
      ) {
        return false;
      }

      if (
        selectedFeatured ===
          "normal" &&
        report.featured === true
      ) {
        return false;
      }

      const reportDate =
        getDateValue(report);

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

      return true;
    }
  );
}


function createCaseCard(report) {
  const article =
    document.createElement(
      "article"
    );

  article.className =
    "case-card";

  if (report.featured === true) {
    article.classList.add(
      "featured"
    );
  }

  const reportId =
    encodeURIComponent(
      report.id
    );

  const level =
    getLevel(report);

  const levelClass =
    level
      ? `level level${level}`
      : "meta-chip";

  const levelText =
    level
      ? `レベル${level}`
      : "レベル未設定";

  const summary =
    getReportSummary(report);

  const shortenedSummary =
    summary.length > 240
      ? `${summary.slice(0, 240)}…`
      : summary;

  article.innerHTML = `
    <div class="case-header">
      <h3 class="case-title">
        ${escapeHtml(getReportTitle(report))}
      </h3>

      ${
        report.featured === true
          ? '<span class="featured-mark">📌 重要事例</span>'
          : ""
      }
    </div>

    <div class="case-meta">
      <span class="${levelClass}">
        ${escapeHtml(levelText)}
      </span>

      <span class="meta-chip">
        ${escapeHtml(getDepartment(report))}
      </span>

      <span class="meta-chip">
        ${escapeHtml(
          formatDate(
            report.createdAt ||
            report.date ||
            report.reportDate
          )
        )}
      </span>
    </div>

    <p class="case-summary">
      ${escapeHtml(shortenedSummary)}
    </p>

    <div class="case-actions">
      <a
        href="case-detail.html?id=${reportId}"
        class="case-action-button detail-button"
      >
        詳細・編集
      </a>

      <button
        type="button"
        class="case-action-button featured-button"
        data-action="featured"
        data-id="${escapeHtml(report.id)}"
        data-featured="${report.featured === true}"
      >
        ${
          report.featured === true
            ? "重要事例を解除"
            : "重要事例に設定"
        }
      </button>

      <button
        type="button"
        class="case-action-button delete-button"
        data-action="delete"
        data-id="${escapeHtml(report.id)}"
        data-title="${escapeHtml(getReportTitle(report))}"
      >
        削除
      </button>
    </div>
  `;

  return article;
}


function renderReports() {
  const reports =
    filterReports();

  resultCount.textContent =
    `${reports.length}件`;

  caseList.innerHTML =
    "";

  statusMessage.hidden =
    true;

  caseList.hidden =
    false;

  if (reports.length === 0) {
    caseList.innerHTML = `
      <div class="empty-message">
        条件に一致する投稿はありません。
      </div>
    `;

    return;
  }

  reports.forEach((report) => {
    caseList.appendChild(
      createCaseCard(report)
    );
  });
}


async function toggleFeatured(
  reportId,
  currentFeatured,
  button
) {
  button.disabled =
    true;

  try {
    await updateDoc(
      doc(
        db,
        "reports",
        reportId
      ),
      {
        featured:
          !currentFeatured
      }
    );

  } catch (error) {
    console.error(
      "重要事例更新エラー:",
      error
    );

    alert(
      "重要事例の設定変更に失敗しました。"
    );

    button.disabled =
      false;
  }
}


async function deleteReport(
  reportId,
  title,
  button
) {
  const confirmed =
    confirm(
      `「${title}」を削除します。\nこの操作は取り消せません。`
    );

  if (!confirmed) {
    return;
  }

  button.disabled =
    true;

  try {
    await deleteDoc(
      doc(
        db,
        "reports",
        reportId
      )
    );

  } catch (error) {
    console.error(
      "投稿削除エラー:",
      error
    );

    alert(
      "投稿の削除に失敗しました。"
    );

    button.disabled =
      false;
  }
}


function startRealtimeReports() {
  if (unsubscribeReports) {
    unsubscribeReports();
  }

  const reportsQuery =
    query(
      collection(
        db,
        "reports"
      ),
      orderBy(
        "createdAt",
        "desc"
      )
    );

  unsubscribeReports =
    onSnapshot(
      reportsQuery,
      (snapshot) => {
        allReports =
          snapshot.docs.map(
            (reportDocument) => ({
              id:
                reportDocument.id,
              ...reportDocument.data()
            })
          );

        populateDepartmentFilter();
        renderReports();
      },
      (error) => {
        console.error(
          "投稿一覧取得エラー:",
          error
        );

        if (
          error.code ===
          "failed-precondition"
        ) {
          startRealtimeReportsWithoutOrder();
          return;
        }

        showStatus(
          "投稿一覧の取得に失敗しました。Firestoreの設定と通信状態を確認してください。",
          true
        );
      }
    );
}


function startRealtimeReportsWithoutOrder() {
  if (unsubscribeReports) {
    unsubscribeReports();
  }

  unsubscribeReports =
    onSnapshot(
      collection(
        db,
        "reports"
      ),
      (snapshot) => {
        allReports =
          snapshot.docs
            .map(
              (reportDocument) => ({
                id:
                  reportDocument.id,
                ...reportDocument.data()
              })
            )
            .sort(
              (a, b) => {
                const dateA =
                  getDateValue(a);

                const dateB =
                  getDateValue(b);

                return (
                  (dateB?.getTime() || 0) -
                  (dateA?.getTime() || 0)
                );
              }
            );

        populateDepartmentFilter();
        renderReports();
      },
      (error) => {
        console.error(
          "投稿一覧取得エラー:",
          error
        );

        showStatus(
          "投稿一覧の取得に失敗しました。Firestoreの設定と通信状態を確認してください。",
          true
        );
      }
    );
}


caseList.addEventListener(
  "click",
  async (event) => {
    const button =
      event.target.closest(
        "button[data-action]"
      );

    if (!button) {
      return;
    }

    const reportId =
      button.dataset.id;

    if (
      button.dataset.action ===
      "featured"
    ) {
      await toggleFeatured(
        reportId,
        button.dataset.featured ===
          "true",
        button
      );

      return;
    }

    if (
      button.dataset.action ===
      "delete"
    ) {
      await deleteReport(
        reportId,
        button.dataset.title ||
          "無題の投稿",
        button
      );
    }
  }
);


filterButton.addEventListener(
  "click",
  renderReports
);


resetButton.addEventListener(
  "click",
  () => {
    keywordInput.value =
      "";

    levelFilter.value =
      "";

    departmentFilter.value =
      "";

    featuredFilter.value =
      "";

    startDate.value =
      "";

    endDate.value =
      "";

    renderReports();
  }
);


keywordInput.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter") {
      renderReports();
    }
  }
);


onAuthStateChanged(
  auth,
  async (user) => {
    try {
      const isAdmin =
        await checkAdmin(user);

      if (!isAdmin) {
        location.replace(
          "admin.html"
        );

        return;
      }

      startRealtimeReports();

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


window.addEventListener(
  "beforeunload",
  () => {
    if (unsubscribeReports) {
      unsubscribeReports();
    }
  }
);

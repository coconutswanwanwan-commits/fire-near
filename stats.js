import {
  db
} from "./firebase.js";

import {
  CATEGORIES
} from "./master-data.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


const loadingMessage =
  document.getElementById("loadingMessage");

const statisticsContent =
  document.getElementById("statisticsContent");

const totalCount =
  document.getElementById("totalCount");

const monthlyCount =
  document.getElementById("monthlyCount");

const departmentStatistics =
  document.getElementById("departmentStatistics");

const categoryStatistics =
  document.getElementById("categoryStatistics");

const csvDownloadButton =
  document.getElementById("csvDownloadButton");


let reports = [];


const levelElements = {
  "レベル1（軽微）":
    document.getElementById("level1Count"),

  "レベル2（注意）":
    document.getElementById("level2Count"),

  "レベル3（重大）":
    document.getElementById("level3Count"),

  "レベル4（事故寸前）":
    document.getElementById("level4Count")
};


const departments = [
  "消防本部",
  "消防署",
  "北分署",
  "南分署"
];


/*
 * 旧業務区分から新業務区分への変換表
 */
const CATEGORY_ALIASES = {
  "査察": "予防",
  "消火": "火災",
  "指令": "通信指令"
};


/*
 * 業務区分を現在のマスタに合わせる
 */
function normalizeCategory(value) {
  const category =
    String(value ?? "").trim();

  if (!category) {
    return "";
  }

  const convertedCategory =
    CATEGORY_ALIASES[category] ||
    category;

  if (
    CATEGORIES.includes(
      convertedCategory
    )
  ) {
    return convertedCategory;
  }

  return "その他";
}


function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function countByField(
  reportData,
  fieldName,
  options,
  valueConverter = null
) {
  const result = {};

  options.forEach(
    option => {
      result[option] = 0;
    }
  );

  reportData.forEach(
    report => {
      const originalValue =
        report[fieldName];

      const value =
        typeof valueConverter ===
          "function"
          ? valueConverter(
              originalValue
            )
          : originalValue;

      if (
        value &&
        Object.hasOwn(
          result,
          value
        )
      ) {
        result[value] += 1;
      }
    }
  );

  return result;
}


function createStatisticsRows(
  countData
) {
  const values =
    Object.values(
      countData
    );

  const maximum =
    Math.max(
      ...values,
      1
    );

  return Object.entries(
    countData
  )
    .map(
      ([label, count]) => {
        const percentage =
          count === 0
            ? 0
            : Math.max(
                (
                  count /
                  maximum
                ) * 100,
                4
              );

        return `
          <div class="statistics-row">

            <div class="statistics-label">

              <span>
                ${escapeHtml(label)}
              </span>

              <span>
                ${count}件
              </span>

            </div>

            <div class="bar-background">

              <div
                class="bar"
                style="width:${percentage}%"
              ></div>

            </div>

          </div>
        `;
      }
    )
    .join("");
}


function getCurrentMonthCount(
  reportData
) {
  const today =
    new Date();

  const year =
    today.getFullYear();

  const month =
    String(
      today.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const currentMonth =
    `${year}-${month}`;

  return reportData.filter(
    report => {
      return String(
        report.date || ""
      ).startsWith(
        currentMonth
      );
    }
  ).length;
}


function updateLevelStatistics(
  reportData
) {
  const levelCounts = {
    "レベル1（軽微）": 0,
    "レベル2（注意）": 0,
    "レベル3（重大）": 0,
    "レベル4（事故寸前）": 0
  };

  reportData.forEach(
    report => {
      if (
        report.level &&
        Object.hasOwn(
          levelCounts,
          report.level
        )
      ) {
        levelCounts[
          report.level
        ] += 1;
      }
    }
  );

  Object.entries(
    levelCounts
  ).forEach(
    ([level, count]) => {
      const element =
        levelElements[level];

      if (element) {
        element.textContent =
          `${count}件`;
      }
    }
  );
}


// CSV用の文字列を安全にする
function escapeCsv(value) {
  const text =
    String(value ?? "");

  const escaped =
    text.replaceAll(
      '"',
      '""'
    );

  return `"${escaped}"`;
}


// FirestoreのTimestampを文字列へ変換
function formatCreatedAt(value) {
  if (!value) {
    return "";
  }

  if (
    typeof value.toDate ===
    "function"
  ) {
    const date =
      value.toDate();

    return date.toLocaleString(
      "ja-JP"
    );
  }

  return String(value);
}


// CSVファイルを作成
function downloadCsv() {
  if (
    reports.length === 0
  ) {
    alert(
      "出力できる事案がありません。"
    );

    return;
  }

  const headers = [
    "事案ID",
    "発生日",
    "所属",
    "業務区分",
    "発生場所",
    "ヒヤリハットレベル",
    "タイトル",
    "発生状況",
    "原因",
    "改善策",
    "学んだこと",
    "タグ",
    "登録日時"
  ];

  const rows =
    reports.map(
      report => [
        report.id,

        report.date,

        report.department,

        normalizeCategory(
          report.category
        ),

        report.place,

        report.level,

        report.title,

        report.situation,

        report.cause,

        report.countermeasure,

        report.lesson,

        Array.isArray(
          report.tags
        )
          ? report.tags.join("、")
          : report.tags,

        formatCreatedAt(
          report.createdAt
        )
      ]
    );

  const csvLines = [
    headers
      .map(escapeCsv)
      .join(","),

    ...rows.map(
      row =>
        row
          .map(escapeCsv)
          .join(",")
    )
  ];

  const csvContent =
    "\uFEFF" +
    csvLines.join(
      "\r\n"
    );

  const blob =
    new Blob(
      [csvContent],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );

  const today =
    new Date();

  const fileDate = [
    today.getFullYear(),

    String(
      today.getMonth() + 1
    ).padStart(
      2,
      "0"
    ),

    String(
      today.getDate()
    ).padStart(
      2,
      "0"
    )
  ].join("");

  const fileName =
    `FireNear_${fileDate}.csv`;

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href =
    url;

  link.download =
    fileName;

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  URL.revokeObjectURL(
    url
  );
}


// 統計データの読み込み
async function loadStatistics() {
  try {
    const snapshot =
      await getDocs(
        collection(
          db,
          "reports"
        )
      );

    reports =
      snapshot.docs.map(
        document => ({
          id:
            document.id,

          ...document.data()
        })
      );

    totalCount.textContent =
      reports.length;

    monthlyCount.textContent =
      getCurrentMonthCount(
        reports
      );

    updateLevelStatistics(
      reports
    );

    const departmentCounts =
      countByField(
        reports,
        "department",
        departments
      );

    const categoryCounts =
      countByField(
        reports,
        "category",
        CATEGORIES,
        normalizeCategory
      );

    departmentStatistics.innerHTML =
      createStatisticsRows(
        departmentCounts
      );

    categoryStatistics.innerHTML =
      createStatisticsRows(
        categoryCounts
      );

    csvDownloadButton.disabled =
      reports.length === 0;

    loadingMessage.hidden =
      true;

    statisticsContent.hidden =
      false;

  } catch (error) {
    console.error(
      "統計読み込みエラー:",
      error
    );

    loadingMessage.className =
      "error-message";

    loadingMessage.innerHTML = `
      統計情報の読み込みに失敗しました。<br>
      ページを再読み込みしてください。
    `;
  }
}


csvDownloadButton.addEventListener(
  "click",
  downloadCsv
);


loadStatistics();
